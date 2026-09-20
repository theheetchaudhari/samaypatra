/**
 * test-auth.mjs — Smoke tests for T7.2 / T7.4 OAuth module (auth.js)
 * Run: node test-auth.mjs
 */
import { createRequire } from "module";
import crypto from "crypto";

const require = createRequire(import.meta.url);

// Set stub env vars before requiring the module
process.env.GOOGLE_CLIENT_ID          = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET      = "test-client-secret";
process.env.GOOGLE_REDIRECT_URI       = "https://example.com/auth/google/callback";
process.env.GOOGLE_OAUTH_STATE_SECRET = crypto.randomBytes(32).toString("hex");
process.env.GOOGLE_SESSION_SECRET     = crypto.randomBytes(32).toString("hex");

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

// ---- Load modules -----------------------------------------------------------
console.log("\n[1] Loading auth.js ...");
const auth = require("./auth.js");
assert("auth.js loaded without error", typeof auth === "object");

// ---- Export surface ---------------------------------------------------------
console.log("\n[2] Export surface ...");
for (const fn of [
  "handleAuthGoogle", "handleAuthGoogleCallback",
  "_generateState", "_validateState", "_buildOAuth2Client",
  "_encryptSession", "_decryptSession"
]) {
  assert(`exports.${fn} is a function`, typeof auth[fn] === "function");
}

// ---- State round-trip -------------------------------------------------------
console.log("\n[3] State token round-trip ...");
const state = auth._generateState();
assert("generateState returns a non-empty string", typeof state === "string" && state.length > 0);
assert("validateState accepts its own token",       auth._validateState(state));

// ---- Tampered state ---------------------------------------------------------
console.log("\n[4] Tampered state rejection ...");
const tampered = state.slice(0, -4) + "XXXX";
assert("validateState rejects tampered HMAC",       !auth._validateState(tampered));
assert("validateState rejects empty string",         !auth._validateState(""));
assert("validateState rejects garbage input",        !auth._validateState("not-a-token!!!"));

// ---- Expired state ----------------------------------------------------------
console.log("\n[5] Expired state rejection ...");
const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET;
const oldTs       = (Date.now() - 15 * 60 * 1000).toString();
const nonce       = crypto.randomBytes(16).toString("hex");
const payload     = `${oldTs}.${nonce}`;
const hmac        = crypto.createHmac("sha256", stateSecret).update(payload).digest("hex");
const expiredState = Buffer.from(`${payload}.${hmac}`).toString("base64url");
assert("validateState rejects expired token (15 min old)", !auth._validateState(expiredState));

// ---- OAuth2 client ----------------------------------------------------------
console.log("\n[6] OAuth2 client construction ...");
const client = auth._buildOAuth2Client();
assert("buildOAuth2Client returns object",          typeof client === "object");
assert("client has generateAuthUrl()",              typeof client.generateAuthUrl === "function");
const authUrl = client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/calendar.events"],
  state: "test-state"
});
assert("generateAuthUrl returns Google URL",        authUrl.startsWith("https://accounts.google.com/"));
assert("URL contains calendar.events scope",        authUrl.includes("calendar.events"));
assert("URL contains access_type=offline",          authUrl.includes("access_type=offline"));
assert("URL contains state param",                  authUrl.includes("state=test-state"));

// ---- Session encryption round-trip ------------------------------------------
console.log("\n[7] Session encryption round-trip ...");
const FAKE_TOKENS = {
  access_token:  "fake-access-token",
  refresh_token: "fake-refresh-token",
  expiry_date:   Date.now() + 3600000
};
const encrypted = auth._encryptSession(FAKE_TOKENS);
assert("encryptSession returns a non-empty string",          typeof encrypted === "string" && encrypted.length > 0);

const decrypted = auth._decryptSession(encrypted);
assert("decryptSession recovers access_token",               decrypted.access_token  === FAKE_TOKENS.access_token);
assert("decryptSession recovers refresh_token",              decrypted.refresh_token === FAKE_TOKENS.refresh_token);
assert("decryptSession recovers expiry_date",                decrypted.expiry_date   === FAKE_TOKENS.expiry_date);

// ---- Session with null refresh_token ----------------------------------------
const encNoRefresh = auth._encryptSession({ access_token: "tok", refresh_token: null, expiry_date: null });
const decNoRefresh = auth._decryptSession(encNoRefresh);
assert("encryptSession handles null refresh_token",          decNoRefresh.refresh_token === null);

// ---- Tampered session rejection ---------------------------------------------
console.log("\n[8] Tampered session rejection ...");
assert("decryptSession throws on tampered ciphertext", (() => {
  try {
    auth._decryptSession(encrypted.slice(0, -4) + "XXXX");
    return false; // should have thrown
  } catch { return true; }
})());
assert("decryptSession throws on empty string", (() => {
  try { auth._decryptSession(""); return false; } catch { return true; }
})());
assert("decryptSession throws on garbage", (() => {
  try { auth._decryptSession("notavalidcookie!!!"); return false; } catch { return true; }
})());
assert("decryptSession throws on truncated cookie", (() => {
  try { auth._decryptSession(encrypted.slice(0, 20)); return false; } catch { return true; }
})());

// ---- Different session secrets produce different ciphertexts ----------------
console.log("\n[9] Session isolation ...");
const enc1 = auth._encryptSession(FAKE_TOKENS);
const enc2 = auth._encryptSession(FAKE_TOKENS);
assert("Two encryptions of same payload produce different ciphertexts (random IV)", enc1 !== enc2);

// ---- Callback response structure (no real token exchange) -------------------
console.log("\n[10] Callback response never exposes tokens ...");
// Simulate what handleAuthGoogleCallback returns after encryption
const callbackCookie = auth._encryptSession(FAKE_TOKENS);
assert("Encrypted session does not contain literal access_token string",
  !callbackCookie.includes("fake-access-token"));
assert("Encrypted session does not contain literal refresh_token string",
  !callbackCookie.includes("fake-refresh-token"));

// ---- handler.js loads with OAuth routes wired --------------------------------
console.log("\n[11] handler.js integration ...");
const handler = require("./handler.js");
assert("handler.js loads without error",            typeof handler === "object");
assert("extractHandler is exported",                typeof handler.extractHandler === "function");

// ---- Summary ----------------------------------------------------------------
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
