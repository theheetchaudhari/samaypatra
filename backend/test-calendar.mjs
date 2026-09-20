/**
 * test-calendar.mjs — Tests for T7.4 / T8.1 Calendar endpoint (calendar.js)
 * Run: node test-calendar.mjs
 *
 * No real Google Calendar API calls are made — the calendar client is mocked.
 */
import { createRequire } from "module";
import crypto from "crypto";

const require = createRequire(import.meta.url);

// Stub all required env vars BEFORE loading any modules
process.env.GOOGLE_CLIENT_ID          = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET      = "test-client-secret";
process.env.GOOGLE_REDIRECT_URI       = "https://example.com/auth/google/callback";
process.env.GOOGLE_OAUTH_STATE_SECRET = crypto.randomBytes(32).toString("hex");
process.env.GOOGLE_SESSION_SECRET     = crypto.randomBytes(32).toString("hex");

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else           { console.error(`  FAIL: ${label}`); failed++; }
}

async function assertAsync(label, fn) {
  try {
    const ok = await fn();
    if (ok) { console.log(`  PASS: ${label}`); passed++; }
    else    { console.error(`  FAIL: ${label}`); failed++; }
  } catch (err) {
    console.error(`  FAIL: ${label} — threw: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// [1] Load modules
// ---------------------------------------------------------------------------
console.log("\n[1] Loading calendar.js ...");
const cal  = require("./calendar.js");
const auth = require("./auth.js");
assert("calendar.js loaded", typeof cal === "object");
for (const fn of [
  "handleCreateCalendarEvent",
  "_readSessionCookie", "_validateCalendarPayload",
  "_buildCalendarResource", "_setCalendarClient"
]) {
  assert(`exports.${fn} is a function`, typeof cal[fn] === "function");
}

// ---------------------------------------------------------------------------
// Build a valid encrypted session cookie for use across tests
// ---------------------------------------------------------------------------
const FAKE_TOKENS = {
  access_token:  "fake-access-token",
  refresh_token: "fake-refresh-token",
  expiry_date:   Date.now() + 3600000
};
const VALID_COOKIE_VAL = auth._encryptSession(FAKE_TOKENS);
const VALID_COOKIE_HDR = `sam_session=${VALID_COOKIE_VAL}`;

// ---------------------------------------------------------------------------
// Helper: build minimal Lambda event
// ---------------------------------------------------------------------------
function makeEvent({ cookie = null, body = null, cookies = null } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  return {
    httpMethod: "POST",
    headers,
    cookies: cookies || undefined,
    body: body ? JSON.stringify(body) : null
  };
}

const VALID_BODY = {
  title:       "DBMS Assignment Deadline",
  date:        "2026-09-22",
  time:        "23:59",
  timezone:    "Asia/Kolkata",
  description: "Submit final DBMS assignment",
  location:    "Online"
};

// ---------------------------------------------------------------------------
// [2] readSessionCookie — cookie header parsing
// ---------------------------------------------------------------------------
console.log("\n[2] readSessionCookie parsing ...");
assert("reads from Cookie header",
  cal._readSessionCookie({ headers: { Cookie: "sam_session=abc123" } }) === "abc123");
assert("reads from lowercase cookie header",
  cal._readSessionCookie({ headers: { cookie: "sam_session=abc123" } }) === "abc123");
assert("reads from cookies array (v2)",
  cal._readSessionCookie({ headers: {}, cookies: ["sam_session=abc123", "other=val"] }) === "abc123");
assert("returns null when no cookie",
  cal._readSessionCookie({ headers: {} }) === null);
assert("returns null when sam_session absent",
  cal._readSessionCookie({ headers: { Cookie: "other=val" } }) === null);

// ---------------------------------------------------------------------------
// [3] validateCalendarPayload
// ---------------------------------------------------------------------------
console.log("\n[3] validateCalendarPayload ...");
assert("valid payload passes",
  cal._validateCalendarPayload({ title: "Test", date: "2026-09-22" }).valid);
assert("missing title fails",
  !cal._validateCalendarPayload({ date: "2026-09-22" }).valid);
assert("empty title fails",
  !cal._validateCalendarPayload({ title: "  ", date: "2026-09-22" }).valid);
assert("missing date fails",
  !cal._validateCalendarPayload({ title: "Test" }).valid);
assert("bad date format fails",
  !cal._validateCalendarPayload({ title: "T", date: "22-09-2026" }).valid);
assert("bad time format fails",
  !cal._validateCalendarPayload({ title: "T", date: "2026-09-22", time: "25:00" }).valid);
assert("valid time passes",
  cal._validateCalendarPayload({ title: "T", date: "2026-09-22", time: "23:59" }).valid);
assert("null time is accepted",
  cal._validateCalendarPayload({ title: "T", date: "2026-09-22", time: null }).valid);
assert("non-object body fails",
  !cal._validateCalendarPayload("a string").valid);

// ---------------------------------------------------------------------------
// [4] buildCalendarResource — time logic
// ---------------------------------------------------------------------------
console.log("\n[4] buildCalendarResource ...");
const b1 = cal._buildCalendarResource({ title: "T", date: "2026-09-22", time: "23:00", timezone: "Asia/Kolkata" });
assert("no endTime -> end = start + 1h (midnight rollover)",
  b1.end.dateTime === "2026-09-23T00:00:00" && b1.end.timeZone === "Asia/Kolkata");

const b2 = cal._buildCalendarResource({ title: "T", date: "2026-09-22", time: "10:30", endTime: "11:45", timezone: "Asia/Kolkata" });
assert("explicit endTime is used",
  b2.end.dateTime === "2026-09-22T11:45:00");

const b3 = cal._buildCalendarResource({ title: "T", date: "2026-09-22", allDay: true });
assert("allDay event uses date format (no dateTime)",
  b3.start.date === "2026-09-22" && !b3.start.dateTime);

const b4 = cal._buildCalendarResource({ title: "T", date: "2026-09-22", time: "22:30", timezone: "Asia/Kolkata" });
assert("no midnight rollover when end < 24:00",
  b4.end.dateTime === "2026-09-22T23:30:00" && b4.end.timeZone === "Asia/Kolkata");

const b5 = cal._buildCalendarResource({ title: "T", date: "2026-09-22", time: "08:00" });
assert("default timezone is Asia/Kolkata",
  b5.start.timeZone === "Asia/Kolkata");

const b6 = cal._buildCalendarResource({ title: "T", date: "2026-09-22", time: "10:00", description: "Desc", location: "Loc" });
assert("description and location propagated",
  b6.description === "Desc" && b6.location === "Loc");

// ---------------------------------------------------------------------------
// [5] Missing session cookie -> 401
// ---------------------------------------------------------------------------
console.log("\n[5] Missing session cookie -> 401 ...");
await assertAsync("no cookie -> 401", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent());
  return res.statusCode === 401;
});
await assertAsync("no cookie -> error not_authenticated", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent());
  return JSON.parse(res.body).error === "not_authenticated";
});
await assertAsync("no cookie -> message includes 'connect Google Calendar'", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent());
  return JSON.parse(res.body).message.includes("connect Google Calendar");
});

// ---------------------------------------------------------------------------
// [6] Tampered session cookie -> 401
// ---------------------------------------------------------------------------
console.log("\n[6] Tampered session cookie -> 401 ...");
await assertAsync("tampered cookie -> 401", async () => {
  const res = await cal.handleCreateCalendarEvent(
    makeEvent({ cookie: "sam_session=" + VALID_COOKIE_VAL.slice(0, -4) + "XXXX" })
  );
  return res.statusCode === 401;
});
await assertAsync("garbage cookie -> 401", async () => {
  const res = await cal.handleCreateCalendarEvent(
    makeEvent({ cookie: "sam_session=notavalidcookieatall" })
  );
  return res.statusCode === 401;
});

// ---------------------------------------------------------------------------
// [7] Invalid payload -> 400
// ---------------------------------------------------------------------------
console.log("\n[7] Invalid payload -> 400 ...");
await assertAsync("missing title -> 400", async () => {
  const res = await cal.handleCreateCalendarEvent(
    makeEvent({ cookie: VALID_COOKIE_HDR, body: { date: "2026-09-22" } })
  );
  return res.statusCode === 400;
});
await assertAsync("missing date -> 400", async () => {
  const res = await cal.handleCreateCalendarEvent(
    makeEvent({ cookie: VALID_COOKIE_HDR, body: { title: "Test" } })
  );
  return res.statusCode === 400;
});
await assertAsync("invalid JSON body -> 400", async () => {
  const res = await cal.handleCreateCalendarEvent({
    httpMethod: "POST",
    headers: { Cookie: VALID_COOKIE_HDR },
    body: "{ not valid json %%% }"
  });
  return res.statusCode === 400;
});

// ---------------------------------------------------------------------------
// [8] Valid payload with mocked Calendar client -> 200, safe response only
// ---------------------------------------------------------------------------
console.log("\n[8] Mocked Calendar API -> 200 with safe response ...");

const FAKE_CREATED = {
  id:      "fakeeventid123",
  htmlLink: "https://calendar.google.com/event?eid=fakeeventid123",
  summary: "DBMS Assignment Deadline",
  start:   { dateTime: "2026-09-22T23:59:00", timeZone: "Asia/Kolkata" },
  end:     { dateTime: "2026-09-23T00:59:00", timeZone: "Asia/Kolkata" }
};

cal._setCalendarClient({ events: { insert: async () => ({ data: FAKE_CREATED }) } });

await assertAsync("valid session + body -> 200", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent({ cookie: VALID_COOKIE_HDR, body: VALID_BODY }));
  return res.statusCode === 200;
});
await assertAsync("response.success === true", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent({ cookie: VALID_COOKIE_HDR, body: VALID_BODY }));
  return JSON.parse(res.body).success === true;
});
await assertAsync("response.eventId correct", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent({ cookie: VALID_COOKIE_HDR, body: VALID_BODY }));
  return JSON.parse(res.body).eventId === FAKE_CREATED.id;
});
await assertAsync("response.htmlLink correct", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent({ cookie: VALID_COOKIE_HDR, body: VALID_BODY }));
  return JSON.parse(res.body).htmlLink === FAKE_CREATED.htmlLink;
});
await assertAsync("response body does NOT contain access_token", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent({ cookie: VALID_COOKIE_HDR, body: VALID_BODY }));
  return !res.body.includes("access_token") && !res.body.includes("refresh_token");
});
await assertAsync("response body does NOT contain fake token values", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent({ cookie: VALID_COOKIE_HDR, body: VALID_BODY }));
  return !res.body.includes("fake-access-token") && !res.body.includes("fake-refresh-token");
});

cal._setCalendarClient(null); // reset mock

// ---------------------------------------------------------------------------
// [9] CORS headers
// ---------------------------------------------------------------------------
console.log("\n[9] CORS headers on all responses ...");
await assertAsync("401 has correct Allow-Origin header", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent());
  return res.headers["Access-Control-Allow-Origin"] === "https://samaypatra.vercel.app";
});
await assertAsync("401 has Allow-Credentials: true", async () => {
  const res = await cal.handleCreateCalendarEvent(makeEvent());
  return res.headers["Access-Control-Allow-Credentials"] === "true";
});

// ---------------------------------------------------------------------------
// [10] handler.js loads with calendar route wired
// ---------------------------------------------------------------------------
console.log("\n[10] handler.js integration ...");
const handler = require("./handler.js");
assert("handler.js loads",           typeof handler === "object");
assert("extractHandler exported",    typeof handler.extractHandler === "function");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
