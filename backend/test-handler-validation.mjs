/**
 * T5.2 Integration tests — handler.js + validation.js
 *
 * Tests:
 *  1. Valid parsed events → validation.valid true, results[].valid true
 *  2. Invalid event (bad date) → validation.valid false, results[].errors non-empty
 *  3. Multiple events → each validated independently
 *  4. Original event fields are unchanged in validation.results[].event
 *  5. Success response still carries success:true and events[]
 *  6. Zero events → validation.valid true (vacuously), results is empty array
 *
 * No real AWS credentials or network calls are made.
 * Bedrock client is overridden with a fake that returns controlled JSON.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {
  extractHandler,
  _setBedrockClient
} = require("./handler.js");

// ---------------------------------------------------------------------------
// Assertion helpers (same style as test.mjs / test-validation.mjs)
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
// Fake Bedrock client factory
// ---------------------------------------------------------------------------
function makeFakeClient(responseText) {
  return {
    send: async () => ({
      output: {
        message: {
          content: [{ text: responseText }]
        }
      }
    })
  };
}

// ---------------------------------------------------------------------------
// Minimal valid event fixture
// ---------------------------------------------------------------------------
function makeValidEvent(overrides = {}) {
  return Object.assign({
    id:             "evt-001",
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
  }, overrides);
}

// Helper: call extractHandler with a fake Bedrock response
async function callHandler(events) {
  _setBedrockClient(makeFakeClient(JSON.stringify({ events })));
  const res = await extractHandler({
    httpMethod: "POST",
    body: JSON.stringify({ text: "Submit DBMS assignment by Friday 11:59 PM." })
  });
  return { raw: res, body: JSON.parse(res.body) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
console.log("\n=== T5.2 Handler + Validation Integration Tests ===\n");

// 1. Valid parsed events → validation.valid true
console.log("Test 1: valid event → validation.valid true");
{
  const { raw, body } = await callHandler([makeValidEvent()]);

  assert(raw.statusCode === 200,                 "statusCode is 200");
  assert(body.success === true,                  "body.success is true");
  assert(Array.isArray(body.events),             "body.events is an array");
  assert(body.validation !== undefined,          "body.validation is present");
  assert(body.validation.valid === true,         "validation.valid is true");
  assert(Array.isArray(body.validation.results), "validation.results is an array");
  assert(body.validation.results.length === 1,   "one result for one event");
  assert(body.validation.results[0].valid === true,
                                                 "result[0].valid is true");
  assert(body.validation.results[0].errors.length === 0,
                                                 "result[0].errors is empty");
}

// 2. Invalid event (bad date) → validation.valid false, errors non-empty
console.log("\nTest 2: invalid event → validation.valid false");
{
  const badEvent = makeValidEvent({ date: "2026-99-99" });
  const { raw, body } = await callHandler([badEvent]);

  assert(raw.statusCode === 200,                 "statusCode is still 200 (not 500)");
  assert(body.success === true,                  "body.success still true (events delivered)");
  assert(body.validation.valid === false,        "validation.valid is false");
  assert(body.validation.results[0].valid === false,
                                                 "result[0].valid is false");
  assert(body.validation.results[0].errors.length > 0,
                                                 "result[0].errors is non-empty");
  assert(body.validation.results[0].errors.some(e => e.includes("date")),
                                                 "error message mentions date");
}

// 3. Multiple events → each validated independently
console.log("\nTest 3: multiple events validated independently");
{
  const goodEvent = makeValidEvent({ id: "evt-001" });
  const badEvent  = makeValidEvent({ id: "evt-002", confidence: "maybe" });
  const { body }  = await callHandler([goodEvent, badEvent]);

  assert(body.validation.results.length === 2,   "two results for two events");
  assert(body.validation.valid === false,        "overall valid is false (one bad)");
  assert(body.validation.results[0].valid === true,
                                                 "result[0] (good event) is valid");
  assert(body.validation.results[1].valid === false,
                                                 "result[1] (bad event) is invalid");
  assert(body.validation.results[1].errors.some(e => e.includes("confidence")),
                                                 "result[1] error mentions confidence");
}

// 4. Original event fields are unchanged in validation.results[].event
console.log("\nTest 4: original event data is not mutated");
{
  const original = makeValidEvent({ id: "evt-immutable", title: "Lecture" });
  const { body } = await callHandler([original]);

  const returned = body.validation.results[0].event;
  assert(returned.id === "evt-immutable",        "id is unchanged");
  assert(returned.title === "Lecture",           "title is unchanged");
  assert(returned.date === "2026-09-25",         "date is unchanged");
  assert(returned.confidence === "high",         "confidence is unchanged");
  assert(returned.ambiguities.length === 0,      "ambiguities unchanged");
}

// 5. Success response still carries success and events (frontend contract)
console.log("\nTest 5: frontend contract (success + events) preserved");
{
  const { body } = await callHandler([makeValidEvent()]);

  assert(body.success === true,                  "body.success present and true");
  assert(Array.isArray(body.events),             "body.events present and array");
  assert(body.events.length === 1,               "body.events has correct length");
  // Spot-check that the events array still carries the full original shape
  assert(body.events[0].id === "evt-001",        "events[0].id correct");
  assert(body.events[0].title === "DBMS Assignment",
                                                 "events[0].title correct");
}

// 6. Zero events → validation.valid true, results empty
console.log("\nTest 6: zero events → vacuously valid");
{
  const { body } = await callHandler([]);

  assert(body.success === true,                  "success true for empty events");
  assert(body.events.length === 0,               "events array is empty");
  assert(body.validation.valid === true,         "validation.valid true (no bad events)");
  assert(body.validation.results.length === 0,   "results array is empty");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
