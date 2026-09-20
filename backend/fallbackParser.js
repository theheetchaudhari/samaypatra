"use strict";

const crypto = require("crypto");

/**
 * Deterministic fallback parser for SAMAYPATRA (Hackathon 2026 fallback).
 * Used ONLY when Amazon Bedrock throws a ThrottlingException or equivalent quota error.
 *
 * It parses simple natural language statements into the exact SAMAYPATRA event schema.
 * It is completely deterministic and does not guess ambiguous dates/times.
 */

// Month mappings
const MONTHS = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, september: 9, sept: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12
};

function parseDate(text) {
  // Regex to match "27 sept" or "25 september"
  const dateRegex = /\b(\d{1,2})\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/i;
  const match = text.match(dateRegex);
  
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const monthStr = match[2].toLowerCase();
  const month = MONTHS[monthStr];
  
  if (!month || day < 1 || day > 31) return null;
  
  // Resolve nearest sensible future occurrence
  const now = new Date();
  let year = now.getFullYear();
  
  // If the month has already passed this year, assume next year
  if (month < now.getMonth() + 1 || (month === now.getMonth() + 1 && day < now.getDate())) {
    year++;
  }
  
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTime(text) {
  // Regex to match "10 am", "10:30 am", "5 pm", "14:00"
  // 12-hour format with optional minutes
  const time12Regex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  // 24-hour format
  const time24Regex = /\b(\d{1,2}):(\d{2})\b/;
  
  let match = text.match(time12Regex);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3].toLowerCase();
    
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  
  match = text.match(time24Regex);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  
  return null;
}

function extractTitle(text) {
  // Very simplistic: just use the whole text up to the first 'on' or 'at', or up to 50 chars
  const stopWords = /\b(on|at)\b/i;
  const match = text.split(stopWords)[0];
  let title = (match || text).trim();
  // Strip trailing punctuation
  title = title.replace(/[.,:;]+$/, "").trim();
  
  // If the title gets empty, use a default or original text
  if (!title) {
    title = text.substring(0, 50).trim();
  }
  
  return title;
}

function parseFallback(text) {
  const date = parseDate(text);
  const time = parseTime(text);
  const title = extractTitle(text);
  
  const ambiguities = [];
  if (!date) ambiguities.push("Could not determine a specific date.");
  if (!time) ambiguities.push("Could not determine a specific time.");
  
  const event = {
    id: crypto.randomBytes(8).toString("hex"),
    title: title || "Untitled Event",
    eventType: "event",
    date: date,
    time: time,
    timezone: "Asia/Kolkata",
    allDay: !time,
    location: null,
    description: null,
    sourceEvidence: text.trim(),
    confidence: date && time ? "medium" : "low",
    ambiguities: ambiguities,
    source: "deterministic-fallback",
    isFallback: true
  };
  
  return { events: [event] };
}

module.exports = { parseFallback, _parseDate: parseDate, _parseTime: parseTime, _extractTitle: extractTitle };
