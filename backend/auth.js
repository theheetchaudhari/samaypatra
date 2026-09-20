"use strict";

/**
 * auth.js — Google OAuth authorization-code flow for SAMAYPATRA (T7.2)
 *
 * Routes handled:
 *   GET /auth/google           → redirect browser to Google consent screen
 *   GET /auth/google/callback  → receive code, validate state, exchange for tokens
 *
 * Security design:
 *   State is a stateless signed token: base64url("<timestamp>.<nonce_hex>.<hmac_hex>")
 *   Verified on callback using GOOGLE_OAUTH_STATE_SECRET.
 *   Tokens (access_token / refresh_token) are NEVER logged or returned to the client.
 *
 * Limitation (documented):
 *   Lambda is stateless — in-memory state maps do not survive across cold/warm invocations.
 *   This implementation uses a self-contained signed state token that requires no persistence,
 *   making it suitable for serverless environments without DynamoDB.
 *   The state token carries a short expiry (10 minutes) enforced on callback.
 */

const crypto = require("crypto");
const { google } = require("googleapis");

// ---------------------------------------------------------------------------
// Environment variable keys (values are read at call-time, not module load,
// so Lambda env changes take effect without redeployment)
// ---------------------------------------------------------------------------
const ENV_CLIENT_ID     = "GOOGLE_CLIENT_ID";
const ENV_CLIENT_SECRET = "GOOGLE_CLIENT_SECRET";
const ENV_REDIRECT_URI  = "GOOGLE_REDIRECT_URI";
const ENV_STATE_SECRET  = "GOOGLE_OAUTH_STATE_SECRET";

// Scope: calendar events only, as specified in T7.2
const OAUTH_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

// State token validity window (ms) — 10 minutes
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

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
 * Generate a stateless HMAC-signed state token for CSRF protection.
 *
 * Format (before base64url encoding):
 *   "<timestampMs>.<nonce_hex>.<hmac_hex>"
 *
 * The HMAC signs "<timestampMs>.<nonce_hex>" using GOOGLE_OAUTH_STATE_SECRET.
 * This ensures:
 *   - The token cannot be forged without the secret.
 *   - The token expires after STATE_MAX_AGE_MS (checked on callback).
 *   - The nonce adds entropy per request.
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

  const raw = `${payload}.${hmac}`;
  return Buffer.from(raw).toString("base64url");
}

/**
 * Validate a state token received from Google's callback.
 *
 * Returns true if the token is well-formed, HMAC-valid, and not expired.
 * Returns false (never throws) so callers can return 400 safely.
 */
function validateState(stateToken) {
  try {
    const secret = process.env[ENV_STATE_SECRET];
    if (!secret) return false;

    const raw = Buffer.from(stateToken, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return false;

    const [timestamp, nonce, receivedHmac] = parts;
    const payload       = `${timestamp}.${nonce}`;
    const expectedHmac  = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const hmacValid = crypto.timingSafeEqual(
      Buffer.from(receivedHmac, "hex"),
      Buffer.from(expectedHmac,  "hex")
    );
    if (!hmacValid) return false;

    // Check expiry
    const age = Date.now() - parseInt(timestamp, 10);
    if (age < 0 || age > STATE_MAX_AGE_MS) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Parse query string parameters from a Lambda event.
 * Handles both API Gateway v1 (queryStringParameters) and v2 (queryStringParameters).
 */
function getQueryParams(event) {
  return event.queryStringParameters || {};
}

// ---------------------------------------------------------------------------
// Common HTML response helper
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
 * Generates the Google OAuth consent URL and redirects the browser.
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
      Location: authUrl,
      "Cache-Control": "no-store"
    },
    body: ""
  };
}

/**
 * GET /auth/google/callback
 * Validates the CSRF state, exchanges the authorization code for tokens,
 * and returns a plain HTML confirmation page.
 *
 * Tokens are NEVER logged or included in any response body.
 */
async function handleAuthGoogleCallback(event) {
  const params = getQueryParams(event);
  const { code, state, error } = params;

  // Handle Google-side errors (user denied, etc.)
  if (error) {
    console.warn("[auth/callback] Google returned an error:", error);
    return htmlResponse(
      400,
      "<h1>Authorization declined</h1><p>Google returned: <strong>" + escapeHtml(error) + "</strong></p><p><a href=\"/\">Return to SAMAYPATRA</a></p>"
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return htmlResponse(
      400,
      "<h1>Bad request</h1><p>Missing authorization code or state parameter.</p><p><a href=\"/\">Return to SAMAYPATRA</a></p>"
    );
  }

  // Validate CSRF state
  if (!validateState(state)) {
    console.warn("[auth/callback] State validation failed -- possible CSRF or expired link");
    return htmlResponse(
      400,
      "<h1>Security check failed</h1><p>The authorization link has expired or is invalid. Please try again.</p><p><a href=\"/\">Return to SAMAYPATRA</a></p>"
    );
  }

  // Build OAuth2 client
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

  // Exchange authorization code for tokens
  // Tokens are intentionally not logged.
  let tokenResponse;
  try {
    tokenResponse = await oauth2Client.getToken(code);
  } catch (err) {
    // Log only the error message, never token data
    console.error("[auth/callback] Token exchange failed:", err.message);
    return htmlResponse(
      502,
      "<h1>Token exchange failed</h1><p>Could not complete Google authorization. Please try again.</p><p><a href=\"/\">Return to SAMAYPATRA</a></p>"
    );
  }

  // Token exchange succeeded.
  // Placeholder: tokens would be stored securely in a future task (T7.3+).
  // Log only the boolean presence of refresh_token, never its value.
  const hasRefreshToken = !!(tokenResponse.tokens && tokenResponse.tokens.refresh_token);
  console.log("[auth/callback] Token exchange succeeded. Has refresh_token:", hasRefreshToken);

  return htmlResponse(
    200,
    "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>SAMAYPATRA \u2014 Google Calendar Connected</title>\n  <style>\n    body { font-family: system-ui, sans-serif; background: #0f1117; color: #e5e7eb;\n           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }\n    .card { background: #1c1f2e; border: 1px solid #2d3148; border-radius: 12px;\n            padding: 2.5rem 3rem; text-align: center; max-width: 480px; }\n    h1 { color: #7c6af7; margin-bottom: 0.5rem; font-size: 1.5rem; }\n    p  { color: #9ca3af; margin-bottom: 1.5rem; }\n    a  { display: inline-block; background: #7c6af7; color: #fff; text-decoration: none;\n         padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 600; }\n    a:hover { background: #6a59e0; }\n    .checkmark { font-size: 3rem; margin-bottom: 1rem; }\n  </style>\n</head>\n<body>\n  <div class=\"card\">\n    <div class=\"checkmark\">\u2705</div>\n    <h1>Google Calendar Connected</h1>\n    <p>SAMAYPATRA has been authorized to create calendar events on your behalf.</p>\n    <a href=\"/\">Return to SAMAYPATRA</a>\n  </div>\n</body>\n</html>"
  );
}

// ---------------------------------------------------------------------------
// Minimal HTML escaping for user-supplied error strings in responses
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
  // Exported for unit testing only
  _generateState:  generateState,
  _validateState:  validateState,
  _buildOAuth2Client: buildOAuth2Client
};
