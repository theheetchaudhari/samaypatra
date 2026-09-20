import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { parseFallback, _parseDate, _parseTime, _extractTitle } = require("./fallbackParser.js");

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

console.log("=== Fallback Parser Tests ===");

// 1. "catalyst event on 27 sept at 10 am"
let result = parseFallback("catalyst event on 27 sept at 10 am");
let event = result.events[0];
assert("Extracts title 1", event.title === "catalyst event");
assert("Extracts date 1", event.date.endsWith("-09-27"));
assert("Extracts time 1", event.time === "10:00");
assert("Has correct timezone 1", event.timezone === "Asia/Kolkata");
assert("Has source 1", event.source === "deterministic-fallback");
assert("IsFallback 1", event.isFallback === true);

// 2. "submit DBMS assignment on 25 september at 5 pm"
result = parseFallback("submit DBMS assignment on 25 september at 5 pm");
event = result.events[0];
assert("Extracts title 2", event.title === "submit DBMS assignment");
assert("Extracts date 2", event.date.endsWith("-09-25"));
assert("Extracts time 2", event.time === "17:00");

// 3. "exam on 30 september at 2 pm"
result = parseFallback("exam on 30 september at 2 pm");
event = result.events[0];
assert("Extracts title 3", event.title === "exam");
assert("Extracts date 3", event.date.endsWith("-09-30"));
assert("Extracts time 3", event.time === "14:00");

// 4. Ambiguous input without date/time
result = parseFallback("just an ambiguous meeting without a proper date");
event = result.events[0];
assert("Missing date gives null", event.date === null);
assert("Missing time gives null", event.time === null);
assert("Ambiguities listed", event.ambiguities.length === 2);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
