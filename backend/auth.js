"use strict";

/**
 * auth.js — Google OAuth authorization-code flow for SAMAYPATRA (T7.2 / T7.4)
 *
 * Routes handled:
 *   GET /auth/google           -> redirect browser to Google consent screen
 *   GET /auth/google/callback  -> validate state, exchange code for tokens,
 *                                 encrypt tokens into session cookie, redirect to frontend
 *
 * Security design:
 *   CSRF state:  stateless HMAC-SHA256 signed token  (GOOGLE_OAUTH_STATE_SECRET)
 *   Session:     AES-256-GCM encrypted HTTP-only cookie (GOOGLE_SESSION_SECRET)
 *   Tokens:      NEVER logged, NEVER returned to client, NEVER stored in plain text
 *
 * Serverless note:
 *   Lambda is stateless. CSRF state is self-contained (signed + expiry) so no
 *   persistence is required. The session cookie is encrypted at the Lambda layer.
 */

const crypto = require("crypto");
const { google } = require("googleapis");

// ---------------------------------------------------------------------------
// Environment variable keys (read at call-time so Lambda changes take effect)
// ---------------------------------------------------------------------------
const ENV_CLIENT_ID      = "GOOGLE_CLIENT_ID";
const ENV_CLIENT_SECRET  = "GOOGLE_CLIENT_SECRET";
const ENV_REDIRECT_URI   = "GOOGLE_REDIRECT_URI";
const ENV_STATE_SECRET   = "GOOGLE_OAUTH_STATE_SECRET";
const ENV_SESSION_SECRET = "GOOGLE_SESSION_SECRET";

// Scope: calendar events only, as specified in T7.2
const OAUTH_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

// CSRF state token validity window — 10 minutes
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

// Session cookie Max-Age — 7 days (seconds)
const SESSION_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

// Frontend redirect target after successful OAuth (T7.4 decision: connected=true param)
const FRONTEND_CALLBACK_URL = "https://samaypatra.vercel.app/app?connected=true";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a configured OAuth2 client from environment variables.
 * Throws a descriptive error if any required variable is missing.
 */
function buildOAuth2Client() {
  const clientId     = process.env[ENV_CLIENT_ID];
  const clientSecret = process.env[ENV_CLIENT_SECRET];
  const redirectUri  = process.env[ENV_REDIRECT_URI];

  if (!clientId || !clientSecret || !redirectUri) {
    const missing = [ENV_CLIENT_ID, ENV_CLIENT_SECRET, ENV_REDIRECT_URI]
      .filter((k) => !process.env[k])
      .join(", ");
    throw new Error(`Missing required environment variable(s): ${missing}`);
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate a stateless HMAC-signed CSRF state token.
 * Format (base64url encoded): "<timestampMs>.<nonce_hex>.<hmac_hex>"
 */
function generateState() {
  const secret = process.env[ENV_STATE_SECRET];
  if (!secret) {
    throw new Error(`Missing required environment variable: ${ENV_STATE_SECRET}`);
  }

  const timestamp = Date.now().toString();
  const nonce     = crypto.randomBytes(16).toString("hex");
  const payload   = `${timestamp}.${nonce}`;
  const hmac      = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}.${hmac}`).toString("base64url");
}

/**
 * Validate a CSRF state token. Returns false on any failure — never throws.
 */
function validateState(stateToken) {
  try {
    const secret = process.env[ENV_STATE_SECRET];
    if (!secret) return false;

    const raw   = Buffer.from(stateToken, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return false;

    const [timestamp, nonce, receivedHmac] = parts;
    const payload      = `${timestamp}.${nonce}`;
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const hmacValid = crypto.timingSafeEqual(
      Buffer.from(receivedHmac, "hex"),
      Buffer.from(expectedHmac,  "hex")
    );
    if (!hmacValid) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age < 0 || age > STATE_MAX_AGE_MS) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt OAuth tokens into a compact string for use as an HTTP cookie value.
 * Uses AES-256-GCM authenticated encryption keyed from GOOGLE_SESSION_SECRET.
 *
 * Only the minimum fields required to call Google APIs are stored:
 *   a -> access_token    r -> refresh_token    e -> expiry_date
 *
 * Binary layout (then base64url encoded):
 *   [12 bytes IV][16 bytes GCM auth tag][ciphertext]
 *
 * Token values are NEVER logged anywhere in this function.
 */
function encryptSession(tokens) {
  const keyHex = process.env[ENV_SESSION_SECRET];
  if (!keyHex || keyHex.length < 64) {
    throw new Error(
      `${ENV_SESSION_SECRET} must be at least 64 hex characters (32 bytes). ` +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  const key    = Buffer.from(keyHex.slice(0, 64), "hex");
  const iv     = crypto.randomBytes(12); // 96-bit IV, standard for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  // Compact field names to reduce cookie size
  const plaintext = JSON.stringify({
    a: tokens.access_token  || null,
    r: tokens.refresh_token || null,
    e: tokens.expiry_date   || null
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag(); // 16-byte authentication tag

  // Layout: IV + tag + ciphertext -> base64url
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

/**
 * Decrypt an encrypted session cookie value back to token fields.
 *
 * Throws if:
 *   - GOOGLE_SESSION_SECRET is missing or too short
 *   - The cookie is truncated, not base64url, or failed GCM auth tag verification
 *   - The decrypted content is not valid JSON
 *
 * Callers MUST catch all throws and treat them as "session invalid / unauthenticated".
 */
function decryptSession(cookieValue) {
  const keyHex = process.env[ENV_SESSION_SECRET];
  if (!keyHex || keyHex.length < 64) {
    throw new Error(`${ENV_SESSION_SECRET} is not configured`);
  }

  const key = Buffer.from(keyHex.slice(0, 64), "hex");
  const buf = Buffer.from(cookieValue, "base64url");

  // Minimum size: 12 (IV) + 16 (GCM tag) + 1 (ciphertext byte)
  if (buf.length < 29) throw new Error("Session cookie is too short to be valid");

  const iv        = buf.slice(0, 12);
  const tag       = buf.slice(12, 28);
  const encrypted = buf.slice(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  // decipher.final() throws if the GCM auth tag fails — means tampered/invalid
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  const parsed = JSON.parse(decrypted.toString("utf8"));
  return {
    access_token:  parsed.a || null,
    refresh_token: parsed.r || null,
    expiry_date:   parsed.e || null
  };
}

/**
 * Parse query string parameters from a Lambda event (v1 and v2 compatible).
 */
function getQueryParams(event) {
  return event.queryStringParameters || {};
}

// ---------------------------------------------------------------------------
// HTML helper — used only for error pages; success path redirects to frontend
// ---------------------------------------------------------------------------
function htmlResponse(statusCode, bodyHtml) {
  return {
    statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: bodyHtml
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /auth/google
 * Generates the Google OAuth consent URL and issues a 302 redirect.
 */
async function handleAuthGoogle() {
  let oauth2Client;
  try {
    oauth2Client = buildOAuth2Client();
  } catch (err) {
    console.error("[auth/google] OAuth2 client build failed:", err.message);
    return htmlResponse(
      500,
      "<h1>Configuration error</h1><p>OAuth is not configured. Contact the administrator.</p>"
    );
  }

  let state;
  try {
    state = generateState();
  } catch (err) {
    console.error("[auth/google] State generation failed:", err.message);
    return htmlResponse(
      500,
      "<h1>Configuration error</h1><p>OAuth state secret is not configured.</p>"
    );
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope:       OAUTH_SCOPES,
    state:       state
  });

  return {
    statusCode: 302,
    headers: {
      Location:        authUrl,
      "Cache-Control": "no-store"
    },
    body: ""
  };
}

/**
 * GET /auth/google/callback
 *
 * Steps:
 *   1. Validate CSRF state token
 *   2. Exchange authorization code for Google tokens
 *   3. Encrypt tokens into an AES-256-GCM session cookie (tokens never logged)
 *   4. Redirect to https://samaypatra.vercel.app/app?connected=true
 */
async function handleAuthGoogleCallback(event) {
  const params = getQueryParams(event);
  const { code, state, error } = params;

  // Handle Google-side errors (user denied, etc.)
  if (error) {
    console.warn("[auth/callback] Google returned an error:", error);
    return htmlResponse(
      400,
      "<h1>Authorization declined</h1><p>Google returned: <strong>" +
        escapeHtml(error) +
        "</strong></p><p><a href=\"https://samaypatra.vercel.app\">Return to SAMAYPATRA</a></p>"
    );
  }

  if (!code || !state) {
    return htmlResponse(
      400,
      "<h1>Bad request</h1><p>Missing authorization code or state.</p>" +
        "<p><a href=\"https://samaypatra.vercel.app\">Return to SAMAYPATRA</a></p>"
    );
  }

  if (!validateState(state)) {
    console.warn("[auth/callback] State validation failed — possible CSRF or expired link");
    return htmlResponse(
      400,
      "<h1>Security check failed</h1><p>The authorization link has expired or is invalid. Please try again.</p>" +
        "<p><a href=\"https://samaypatra.vercel.app\">Return to SAMAYPATRA</a></p>"
    );
  }

  let oauth2Client;
  try {
    oauth2Client = buildOAuth2Client();
  } catch (err) {
    console.error("[auth/callback] OAuth2 client build failed:", err.message);
    return htmlResponse(
      500,
      "<h1>Configuration error</h1><p>OAuth is not configured correctly.</p>"
    );
  }

  // Exchange authorization code for tokens — NEVER log token values
  let tokenResponse;
  try {
    tokenResponse = await oauth2Client.getToken(code);
  } catch (err) {
    console.error("[auth/callback] Token exchange failed:", err.message);
    return htmlResponse(
      502,
      "<h1>Token exchange failed</h1><p>Could not complete Google authorization. Please try again.</p>" +
        "<p><a href=\"https://samaypatra.vercel.app\">Return to SAMAYPATRA</a></p>"
    );
  }

  const tokens = tokenResponse.tokens;

  // Encrypt the session — NEVER log token values
  let encryptedSession;
  try {
    encryptedSession = encryptSession({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry_date:   tokens.expiry_date   || null
    });
  } catch (err) {
    console.error("[auth/callback] Session encryption failed:", err.message);
    return htmlResponse(
      500,
      "<h1>Session error</h1><p>Could not create session. Contact the administrator.</p>"
    );
  }

  // Log only the boolean presence of refresh_token — NEVER the value
  console.log(
    "[auth/callback] Token exchange succeeded. Has refresh_token:",
    !!tokens.refresh_token
  );

  const cookieStr =
    `sam_session=${encryptedSession}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE_S}; Partitioned`;

  return {
    statusCode: 302,
    headers: {
      "Set-Cookie":    cookieStr,
      Location:        FRONTEND_CALLBACK_URL,
      "Cache-Control": "no-store"
    },
    body: ""
  };
}

// ---------------------------------------------------------------------------
// Minimal HTML escaping for user-supplied strings in error pages
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  handleAuthGoogle,
  handleAuthGoogleCallback,
  // Exported for unit testing only — never call from production code
  _generateState:     generateState,
  _validateState:     validateState,
  _buildOAuth2Client: buildOAuth2Client,
  _encryptSession:    encryptSession,
  _decryptSession:    decryptSession
};
