"use strict";

// ---------------------------------------------------------------------------
// SAMAYPATRA — Event Validation Module (T5.1)
//
// Purpose: Deterministically validate a single extracted event object against
// the SAMAYPATRA event schema.  This module does NOT modify, repair, or guess
// missing values.  It returns a structured result object.
//
// Schema:
//   id            – non-empty string
//   title         – non-empty string
//   eventType     – non-empty string
//   date          – null | "YYYY-MM-DD" (must be a real calendar date)
//   time          – null | "HH:MM" (24-hour, 00–23 : 00–59)
//   timezone      – null | non-empty string
//   allDay        – boolean
//   location      – null | string
//   description   – null | string
//   sourceEvidence– non-empty string
//   confidence    – exactly "high" | "medium" | "low"
//   ambiguities   – array
//
// Returns:
//   { valid: true,  errors: [] }
//   { valid: false, errors: ["...", ...] }
// ---------------------------------------------------------------------------

const CONFIDENCE_VALUES = ["high", "medium", "low"];

// Matches YYYY-MM-DD and performs a real calendar sanity check.
const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// Matches HH:MM in 24-hour format.
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Returns true if the string is a real calendar date in YYYY-MM-DD format.
 * Uses the Date constructor round-trip to catch invalid days like 2026-02-30.
 *
 * @param {string} str
 * @returns {boolean}
 */
function isValidDate(str) {
  const match = DATE_REGEX.exec(str);
  if (!match) return false;

  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10); // 1-based
  const day   = parseInt(match[3], 10);

  // Month must be 1–12
  if (month < 1 || month > 12) return false;

  // Use Date.UTC to avoid local timezone offsets.
  // Date treats month as 0-based, so subtract 1.
  const d = new Date(Date.UTC(year, month - 1, day));

  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth()    === month - 1 &&
    d.getUTCDate()     === day
  );
}

/**
 * Returns true if the string is a valid 24-hour HH:MM time.
 *
 * @param {string} str
 * @returns {boolean}
 */
function isValidTime(str) {
  return TIME_REGEX.test(str);
}

/**
 * Validate a single SAMAYPATRA event object.
 *
 * @param {unknown} event  The raw event to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEvent(event) {
  const errors = [];

  // 1. Must be a plain object
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    return { valid: false, errors: ["event must be a non-null object"] };
  }

  // 2. id
  if (typeof event.id !== "string" || event.id.trim() === "") {
    errors.push("id must be a non-empty string");
  }

  // 3. title
  if (typeof event.title !== "string" || event.title.trim() === "") {
    errors.push("title must be a non-empty string");
  }

  // 4. eventType
  if (typeof event.eventType !== "string" || event.eventType.trim() === "") {
    errors.push("eventType must be a non-empty string");
  }

  // 5. date
  if (event.date !== null) {
    if (typeof event.date !== "string" || !isValidDate(event.date)) {
      errors.push("date must be a valid YYYY-MM-DD calendar date or null");
    }
  }

  // 6. time
  if (event.time !== null) {
    if (typeof event.time !== "string" || !isValidTime(event.time)) {
      errors.push("time must be a valid HH:MM (24-hour) value or null");
    }
  }

  // 7. timezone
  if (event.timezone !== null) {
    if (typeof event.timezone !== "string" || event.timezone.trim() === "") {
      errors.push("timezone must be a non-empty string or null");
    }
  }

  // 8. allDay
  if (typeof event.allDay !== "boolean") {
    errors.push("allDay must be a boolean");
  }

  // 9. location
  if (event.location !== null && typeof event.location !== "string") {
    errors.push("location must be a string or null");
  }

  // 10. description
  if (event.description !== null && typeof event.description !== "string") {
    errors.push("description must be a string or null");
  }

  // 11. sourceEvidence
  if (
    typeof event.sourceEvidence !== "string" ||
    event.sourceEvidence.trim() === ""
  ) {
    errors.push("sourceEvidence must be a non-empty string");
  }

  // 12. confidence
  if (!CONFIDENCE_VALUES.includes(event.confidence)) {
    errors.push(
      "confidence must be one of: high, medium, low"
    );
  }

  // 13. ambiguities
  if (!Array.isArray(event.ambiguities)) {
    errors.push("ambiguities must be an array");
  }

  return {
    valid:  errors.length === 0,
    errors
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = { validateEvent };
