/**
 * T4.3 offline unit test for backend/handler.js
 *
 * Tests:
 *  1. safeParseBedrockResponse – valid JSON
 *  2. safeParseBedrockResponse – strips markdown fence
 *  3. safeParseBedrockResponse – throws on missing events array
 *  4. extractHandler – OPTIONS preflight returns 200
 *  5. extractHandler – missing text returns 400
 *  6. extractHandler – valid text triggers Bedrock; response is parsed correctly
 *  7. extractHandler – Bedrock returns invalid JSON → controlled 500
 *
 * No real AWS credentials or network calls are made.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Load handler and grab test-only exports
// ---------------------------------------------------------------------------
const {
  extractHandler,
  _setBedrockClient,
  _safeParseBedrockResponse: safeParseBedrockResponse
} = require("./handler.js");

// ---------------------------------------------------------------------------
// Minimal assertion helpers
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

function assertThrows(fn, label) {
  try {
    fn();
    console.error(`  ✗  FAIL (no throw): ${label}`);
    failed++;
  } catch {
    console.log(`  ✓  ${label}`);
    passed++;
  }
}

// ---------------------------------------------------------------------------
// Helper – build a fake Bedrock client that returns a controlled response
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

function makeErrorClient() {
  return {
    send: async () => {
      throw new Error("Simulated Bedrock network error");
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
console.log("\n=== T4.3 Offline Unit Tests ===\n");

// 1. safeParseBedrockResponse – plain valid JSON
console.log("Group 1: safeParseBedrockResponse");
{
  const valid = JSON.stringify({
    events: [
      {
        id: "e1",
        title: "Exam",
        eventType: "Exam",
        date: "2026-09-30",
        time: "10:00",
        timezone: "Asia/Kolkata",
        allDay: false,
        location: null,
        description: null,
        sourceEvidence: "Exam on 30 Sep at 10 AM",
        confidence: "high",
        ambiguities: []
      }
    ]
  });
  const result = safeParseBedrockResponse(valid);
  assert(Array.isArray(result.events) && result.events.length === 1, "parses valid JSON with events array");
}

// 2. safeParseBedrockResponse – strips ```json fence
{
  const fenced = "```json\n{\"events\":[]}\n```";
  const result = safeParseBedrockResponse(fenced);
  assert(Array.isArray(result.events) && result.events.length === 0, "strips ```json fence correctly");
}

// 3. safeParseBedrockResponse – missing events array throws
{
  assertThrows(
    () => safeParseBedrockResponse(JSON.stringify({ foo: "bar" })),
    "throws when events array is absent"
  );
}

// 4. extractHandler – OPTIONS preflight
console.log("\nGroup 2: extractHandler");
{
  const res = await extractHandler({
    httpMethod: "OPTIONS",
    body: null
  });
  assert(res.statusCode === 200, "OPTIONS preflight returns 200");
  assert(res.headers["Access-Control-Allow-Origin"] === "*", "CORS header present");
}

// 5. extractHandler – missing text → 400
{
  const res = await extractHandler({
    httpMethod: "POST",
    body: JSON.stringify({ text: "" })
  });
  assert(res.statusCode === 400, "empty text returns 400");
}

// 6. extractHandler – valid text, fake Bedrock client, happy path
{
  const fakeEvent = {
    id: "e1",
    title: "Assignment Due",
    eventType: "Deadline",
    date: "2026-09-25",
    time: "23:59",
    timezone: "Asia/Kolkata",
    allDay: false,
    location: null,
    description: null,
    sourceEvidence: "Submit assignment by Friday 11:59 PM.",
    confidence: "high",
    ambiguities: []
  };
  _setBedrockClient(makeFakeClient(JSON.stringify({ events: [fakeEvent] })));

  const res = await extractHandler({
    httpMethod: "POST",
    body: JSON.stringify({ text: "Submit assignment by Friday 11:59 PM." })
  });
  assert(res.statusCode === 200, "valid request returns 200");
  const parsed = JSON.parse(res.body);
  assert(parsed.success === true, "body.success is true");
  assert(Array.isArray(parsed.events) && parsed.events.length === 1, "body.events has one item");
  assert(parsed.events[0].title === "Assignment Due", "event title matches");
}

// 7. extractHandler – Bedrock returns invalid JSON → controlled 500
{
  _setBedrockClient(makeFakeClient("NOT JSON AT ALL"));
  const res = await extractHandler({
    httpMethod: "POST",
    body: JSON.stringify({ text: "Some text." })
  });
  assert(res.statusCode === 500, "invalid Bedrock JSON returns 500");
  const parsed = JSON.parse(res.body);
  assert(typeof parsed.error === "string", "error message present in body");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
