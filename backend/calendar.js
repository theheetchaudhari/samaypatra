"use strict";

/**
 * calendar.js — Google Calendar event creation for SAMAYPATRA (T7.4 / T8.1)
 *
 * Route handled:
 *   POST /calendar/events
 *
 * Security:
 *   - Requires an encrypted HTTP-only session cookie (sam_session) set by auth.js
 *   - Tokens are decrypted server-side and NEVER reach the client
 *   - Response contains only safe event metadata (eventId, htmlLink, title, start, end)
 *   - CORS headers allow credentialed requests from https://samaypatra.vercel.app ONLY
 *
 * Architecture rule enforced:
 *   This handler ONLY creates an event when the frontend explicitly calls it.
 *   No AI/LLM output directly triggers this route — the user must click Confirm & Sync.
 */

const crypto = require("crypto");
const { google } = require("googleapis");
const {
  _encryptSession: encryptSession,
  _decryptSession: decryptSession
} = require("./auth.js");

// ---------------------------------------------------------------------------
// CORS — credentialed requests from the Vercel frontend ONLY
// Wildcard (*) cannot be used together with credentials:true
// ---------------------------------------------------------------------------
const FRONTEND_ORIGIN = "https://samaypatra.vercel.app";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":      FRONTEND_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers":     "Content-Type",
  "Access-Control-Allow-Methods":     "OPTIONS,POST",
  "Content-Type":                     "application/json"
};

// Session cookie Max-Age — 7 days (seconds)
const SESSION_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Injectable Google Calendar client (override in unit tests via _setCalendarClient)
// ---------------------------------------------------------------------------
let _calendarClient = null;

function getCalendarClient(auth) {
  if (_calendarClient) return _calendarClient;
  return google.calendar({ version: "v3", auth });
}

function _setCalendarClient(client) {
  _calendarClient = client;
}

// ---------------------------------------------------------------------------
// Cookie parsing
// ---------------------------------------------------------------------------

/**
 * Extract the sam_session cookie value from a Lambda event.
 * Handles API Gateway HTTP API v2 (event.cookies array) and
 * REST API v1 / HTTP API with Cookie header (both cases).
 */
function readSessionCookie(event) {
  // HTTP API v2: cookies delivered as a string array
  if (Array.isArray(event.cookies)) {
    for (const c of event.cookies) {
      const m = c.match(/^sam_session=(.+)$/);
      if (m) return m[1].trim();
    }
  }
  // REST API v1 / v2 fallback: Cookie header (may be capitalized or lowercase)
  const header =
    (event.headers && (event.headers.Cookie || event.headers.cookie)) || "";
  if (!header) return null;
  const m = header.match(/(?:^|;\s*)sam_session=([^;]+)/);
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

/**
 * Validate the calendar event payload sent by the frontend.
 *
 * Required: title, date
 * Optional: time, endTime, timezone, description, location, allDay
 *
 * This validator is separate from validateEvent() in validation.js because
 * the Calendar endpoint accepts a subset/superset of the SAMAYPATRA schema.
 */
function validateCalendarPayload(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  // title — required
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    errors.push("title is required and must be a non-empty string");
  }

  // date — required, YYYY-MM-DD
  if (!body.date || typeof body.date !== "string") {
    errors.push("date is required (YYYY-MM-DD)");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    errors.push("date must be in YYYY-MM-DD format");
  }

  // time — optional, must be HH:MM if present
  if (body.time !== undefined && body.time !== null) {
    if (typeof body.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) {
      errors.push("time must be in HH:MM (24-hour) format, or null/omitted");
    }
  }

  // endTime — optional, must be HH:MM if present
  if (body.endTime !== undefined && body.endTime !== null) {
    if (typeof body.endTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.endTime)) {
      errors.push("endTime must be in HH:MM (24-hour) format, or null/omitted");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Google Calendar event resource builder
// ---------------------------------------------------------------------------

/**
 * Build a Google Calendar events.insert resource from a SAMAYPATRA event payload.
 *
 * Start/end time logic (fully deterministic, no invented data):
 *   - time absent / null / allDay:true  -> all-day event  (date format)
 *   - time present, endTime present     -> use both as-is
 *   - time present, endTime absent      -> end = start + 1 hour (explicit default)
 *     The +1 hour default handles midnight roll-over correctly.
 */
function buildCalendarResource(payload) {
  const title       = (payload.title || "").trim();
  const date        = payload.date;
  const time        = payload.time        || null;
  const endTime     = payload.endTime     || null;
  const timezone    = payload.timezone    || "Asia/Kolkata";
  const description = payload.description || null;
  const location    = payload.location    || null;
  const isAllDay    = payload.allDay === true || !time;

  let start, end;

  if (isAllDay) {
    // Google Calendar all-day events use the 'date' field
    start = { date };
    end   = { date }; // same date = single all-day event
  } else {
    start = { dateTime: `${date}T${time}:00`, timeZone: timezone };

    if (endTime) {
      // Explicit end time supplied by the frontend
      end = { dateTime: `${date}T${endTime}:00`, timeZone: timezone };
    } else {
      // Deterministic default: start + 1 hour
      // Arithmetic on HH:MM — handles midnight roll-over without guessing
      const [h, m] = time.split(":").map(Number);
      let endH    = h + 1;
      let endDate = date;

      if (endH >= 24) {
        endH -= 24;
        // Safely increment calendar date by one day (UTC arithmetic)
        const d = new Date(date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + 1);
        endDate = d.toISOString().slice(0, 10);
      }

      const endTimeStr = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      end = { dateTime: `${endDate}T${endTimeStr}:00`, timeZone: timezone };
    }
  }

  const resource = { summary: title, start, end };
  if (description) resource.description = description;
  if (location)    resource.location    = location;

  return resource;
}

// ---------------------------------------------------------------------------
// JSON response helper (always includes CORS headers)
// ---------------------------------------------------------------------------
function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(body)
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /calendar/events
 *
 * Requires:  encrypted sam_session cookie (set by GET /auth/google/callback)
 * Body:      SAMAYPATRA event object (title, date, time, timezone, ...)
 * Returns:   { success, eventId, htmlLink, title, start, end }
 *
 * NEVER returns OAuth tokens in any code path.
 */
async function handleCreateCalendarEvent(event) {
  // ------------------------------------------------------------------
  // 1. Read and decrypt the session cookie
  // ------------------------------------------------------------------
  const rawCookie = readSessionCookie(event);
  if (!rawCookie) {
    return jsonResponse(401, {
      error:   "not_authenticated",
      message: "Please connect Google Calendar first."
    });
  }

  let session;
  try {
    session = decryptSession(rawCookie);
  } catch (err) {
    // Any decryption failure = tampered, truncated, or wrong secret
    console.warn("[calendar/events] Session decryption failed:", err.message);
    return jsonResponse(401, {
      error:   "invalid_session",
      message: "Session is invalid or expired. Please reconnect Google Calendar."
    });
  }

  if (!session.access_token && !session.refresh_token) {
    return jsonResponse(401, {
      error:   "not_authenticated",
      message: "Please connect Google Calendar first."
    });
  }

  // ------------------------------------------------------------------
  // 2. Parse and validate the request body
  // ------------------------------------------------------------------
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, {
      error:   "invalid_json",
      message: "Request body is not valid JSON"
    });
  }

  const payloadValidation = validateCalendarPayload(body);
  if (!payloadValidation.valid) {
    return jsonResponse(400, {
      error:   "invalid_payload",
      message: "Event payload is invalid",
      details: payloadValidation.errors
    });
  }

  // ------------------------------------------------------------------
  // 3. Build the OAuth2 client with stored credentials
  // ------------------------------------------------------------------
  let oauth2Client;
  try {
    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri  = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI");
    }

    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
      expiry_date:   session.expiry_date
    });
  } catch (err) {
    console.error("[calendar/events] OAuth client setup failed:", err.message);
    return jsonResponse(500, {
      error:   "configuration_error",
      message: "Server configuration error. Contact the administrator."
    });
  }

  // Track if googleapis auto-refreshes the access token during the API call
  let refreshedTokens = null;
  oauth2Client.on("tokens", (newTokens) => {
    // NEVER log newTokens values
    refreshedTokens = newTokens;
    console.log("[calendar/events] Access token was refreshed automatically.");
  });

  // ------------------------------------------------------------------
  // 4. Build the Google Calendar event resource
  // ------------------------------------------------------------------
  const resource = buildCalendarResource(body);

  // ------------------------------------------------------------------
  // 5. Call Google Calendar API — NEVER log credentials or token values
  // ------------------------------------------------------------------
  let createdEvent;
  try {
    const calendarApi = getCalendarClient(oauth2Client);
    const response = await calendarApi.events.insert({
      calendarId: "primary",
      resource
    });
    createdEvent = response.data;
  } catch (err) {
    const statusCode = err.code || err.status;
    console.error("[calendar/events] Google Calendar API error:", err.message);

    // Expired/revoked token or insufficient scope
    if (statusCode === 401 || statusCode === 403) {
      return jsonResponse(401, {
        error:   "not_authenticated",
        message: "Google Calendar authorization has expired. Please reconnect Google Calendar."
      });
    }

    return jsonResponse(502, {
      error:   "calendar_api_error",
      message: "Failed to create the calendar event. Please try again."
    });
  }

  // ------------------------------------------------------------------
  // 6. If the access token was auto-refreshed, update the session cookie
  // ------------------------------------------------------------------
  const extraHeaders = {};
  if (refreshedTokens && refreshedTokens.access_token) {
    try {
      const newEncrypted = encryptSession({
        access_token:  refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token || session.refresh_token,
        expiry_date:   refreshedTokens.expiry_date   || null
      });
      extraHeaders["Set-Cookie"] =
        `sam_session=${newEncrypted}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE_S}`;
    } catch (encErr) {
      // Non-fatal: user will need to re-auth sooner; token values never exposed
      console.warn("[calendar/events] Could not update session cookie:", encErr.message);
    }
  }

  // ------------------------------------------------------------------
  // 7. Return ONLY safe event metadata — NEVER return OAuth tokens
  // ------------------------------------------------------------------
  return jsonResponse(
    200,
    {
      success:  true,
      eventId:  createdEvent.id,
      htmlLink: createdEvent.htmlLink,
      title:    createdEvent.summary,
      start:    createdEvent.start,
      end:      createdEvent.end
    },
    extraHeaders
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  handleCreateCalendarEvent,
  // Exported for unit testing only
  _readSessionCookie:       readSessionCookie,
  _validateCalendarPayload: validateCalendarPayload,
  _buildCalendarResource:   buildCalendarResource,
  _setCalendarClient:       _setCalendarClient,
  _corsHeaders:             CORS_HEADERS
};
