/**
 * T5.1 Offline unit tests for backend/validation.js
 *
 * Tests:
 *  1.  Completely valid event             → valid true, empty errors
 *  2.  Missing title                      → invalid
 *  3.  Invalid date "2026-99-99"          → invalid
 *  4.  Invalid date "2026-02-30"          → invalid (real calendar check)
 *  5.  Invalid time "25:90"              → invalid
 *  6.  Invalid time "9:5"                → invalid (must be HH:MM)
 *  7.  Invalid confidence "unknown"       → invalid
 *  8.  ambiguities not an array           → invalid
 *  9.  null date/time/timezone/location/description → valid (all other fields OK)
 * 10.  Non-object input (null)            → invalid
 * 11.  Non-object input (array)           → invalid
 * 12.  Empty id string                    → invalid
 * 13.  allDay not a boolean               → invalid
 * 14.  Multiple fields invalid            → all errors reported
 *
 * No real AWS credentials or network calls are made.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { validateEvent } = require("./validation.js");

// ---------------------------------------------------------------------------
// Assertion helpers (same style as test.mjs)
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  FAIL: ${label}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Minimal valid event fixture — reused across tests
// ---------------------------------------------------------------------------
function makeValid() {
  return {
    id:             "evt-1",
    title:          "DBMS Assignment",
    eventType:      "Assignment Deadline",
    date:           "2026-09-25",
    time:           "23:59",
    timezone:       "Asia/Kolkata",
    allDay:         false,
    location:       "Online",
    description:    "Submit the DBMS assignment.",
    sourceEvidence: "Submit DBMS assignment by Friday 11:59 PM.",
    confidence:     "high",
    ambiguities:    []
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
console.log("\n=== T5.1 Validation Unit Tests ===\n");

// 1. Completely valid event
console.log("Group 1: valid event");
{
  const result = validateEvent(makeValid());
  assert(result.valid === true,         "valid event → valid true");
  assert(result.errors.length === 0,    "valid event → zero errors");
}

// 2. Missing title
console.log("\nGroup 2: missing title");
{
  const e = makeValid();
  delete e.title;
  const result = validateEvent(e);
  assert(result.valid === false,        "missing title → invalid");
  assert(result.errors.some(msg => msg.includes("title")), "error mentions title");
}

// 3. Invalid date "2026-99-99"
console.log("\nGroup 3: invalid date format");
{
  const e = makeValid();
  e.date = "2026-99-99";
  const result = validateEvent(e);
  assert(result.valid === false,        '"2026-99-99" date → invalid');
  assert(result.errors.some(msg => msg.includes("date")), "error mentions date");
}

// 4. Invalid date "2026-02-30" (real calendar check)
console.log("\nGroup 4: impossible calendar date");
{
  const e = makeValid();
  e.date = "2026-02-30";
  const result = validateEvent(e);
  assert(result.valid === false,        '"2026-02-30" date → invalid');
}

// 5. Invalid time "25:90"
console.log("\nGroup 5: invalid time value");
{
  const e = makeValid();
  e.time = "25:90";
  const result = validateEvent(e);
  assert(result.valid === false,        '"25:90" time → invalid');
  assert(result.errors.some(msg => msg.includes("time")), "error mentions time");
}

// 6. Invalid time "9:5" (not HH:MM)
console.log("\nGroup 6: non-zero-padded time");
{
  const e = makeValid();
  e.time = "9:5";
  const result = validateEvent(e);
  assert(result.valid === false,        '"9:5" time → invalid (must be HH:MM)');
}

// 7. Invalid confidence
console.log("\nGroup 7: invalid confidence");
{
  const e = makeValid();
  e.confidence = "unknown";
  const result = validateEvent(e);
  assert(result.valid === false,        '"unknown" confidence → invalid');
  assert(result.errors.some(msg => msg.includes("confidence")), "error mentions confidence");
}

// 8. ambiguities not an array
console.log("\nGroup 8: ambiguities not an array");
{
  const e = makeValid();
  e.ambiguities = "none";
  const result = validateEvent(e);
  assert(result.valid === false,        "string ambiguities → invalid");
  assert(result.errors.some(msg => msg.includes("ambiguities")), "error mentions ambiguities");
}

// 9. Null date/time/timezone/location/description
console.log("\nGroup 9: all nullable fields set to null");
{
  const e = makeValid();
  e.date        = null;
  e.time        = null;
  e.timezone    = null;
  e.location    = null;
  e.description = null;
  const result = validateEvent(e);
  assert(result.valid === true,         "null nullable fields → valid");
  assert(result.errors.length === 0,    "null nullable fields → zero errors");
}

// 10. Non-object input: null
console.log("\nGroup 10: non-object inputs");
{
  const result = validateEvent(null);
  assert(result.valid === false,        "null input → invalid");
}

// 11. Non-object input: array
{
  const result = validateEvent([]);
  assert(result.valid === false,        "array input → invalid");
}

// 12. Empty id string
console.log("\nGroup 11: empty id");
{
  const e = makeValid();
  e.id = "   ";
  const result = validateEvent(e);
  assert(result.valid === false,        "whitespace-only id → invalid");
  assert(result.errors.some(msg => msg.includes("id")), "error mentions id");
}

// 13. allDay not a boolean
console.log("\nGroup 12: allDay type check");
{
  const e = makeValid();
  e.allDay = "true";  // string, not boolean
  const result = validateEvent(e);
  assert(result.valid === false,        '"true" string allDay → invalid');
  assert(result.errors.some(msg => msg.includes("allDay")), "error mentions allDay");
}

// 14. Multiple invalid fields
console.log("\nGroup 13: multiple invalid fields");
{
  const e = makeValid();
  e.title      = "";
  e.date       = "not-a-date";
  e.confidence = "maybe";
  const result = validateEvent(e);
  assert(result.valid === false,        "multiple invalid fields → invalid");
  assert(result.errors.length >= 3,    `at least 3 errors reported (got ${result.errors.length})`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
