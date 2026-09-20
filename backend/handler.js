"use strict";

const {
  BedrockRuntimeClient,
  ConverseCommand
} = require("@aws-sdk/client-bedrock-runtime");

const { validateEvent } = require("./validation.js");
const { createPresignedUploadUrl } = require("./s3.js");
const { extractTextFromS3 } = require("./textract.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MODEL_ID = "apac.amazon.nova-lite-v1:0";

const SYSTEM_PROMPT = `You are SAMAYPATRA's event-extraction engine.
Your ONLY task is to extract structured calendar events from the user-supplied text.

Output rules (mandatory):
- Output ONLY valid JSON — no markdown fences, no prose, no commentary.
- The top-level object must have a single key "events" whose value is an array.
- Each element of "events" must match EXACTLY this schema:
  {
    "id": "<unique temporary string>",
    "title": "<string>",
    "eventType": "<string>",
    "date": "<YYYY-MM-DD> | null",
    "time": "<HH:MM> | null",
    "timezone": "<IANA timezone string> | null",
    "allDay": <true|false>,
    "location": "<string> | null",
    "description": "<string> | null",
    "sourceEvidence": "<exact relevant excerpt from the input>",
    "confidence": "high" | "medium" | "low",
    "ambiguities": []
  }
- Do NOT invent dates or times that are not present in the source.
- If a date or time is ambiguous, return null for that field and describe the ambiguity in "ambiguities".
- Use Asia/Kolkata timezone ONLY when the source explicitly mentions India, IST, or a local-time convention is established.
- If the text contains multiple distinct events, return each as a separate element.
- If no actionable events are found, return { "events": [] }.
- Never create Google Calendar events or call any external service.`;

// ---------------------------------------------------------------------------
// Safe JSON parser
// Handles: leading/trailing whitespace, optional ```json ... ``` fence.
// Throws a descriptive Error if the result lacks a top-level events array.
// ---------------------------------------------------------------------------
function safeParseBedrockResponse(raw) {
  let text = (raw || "").trim();

  // Strip optional ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Bedrock response is not valid JSON: ${err.message}`);
  }

  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error(
      'Bedrock response JSON does not contain a top-level "events" array'
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Per-event validation (T5.2)
// Maps each event through validateEvent() without mutating the originals.
// Returns an object that is attached to the success response.
// ---------------------------------------------------------------------------
function validateEvents(events) {
  const results = events.map((event) => {
    const { valid, errors } = validateEvent(event);
    return { event, valid, errors };
  });

  const allValid = results.every((r) => r.valid);
  return { valid: allValid, results };
}

// ---------------------------------------------------------------------------
// Bedrock client (lazily initialised so unit tests can override before import)
// ---------------------------------------------------------------------------
let _bedrockClient = null;

function getBedrockClient() {
  if (!_bedrockClient) {
    _bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "ap-south-1"
    });
  }
  return _bedrockClient;
}

// Exported for test overrides only
function _setBedrockClient(client) {
  _bedrockClient = client;
}

// ---------------------------------------------------------------------------
// Lambda handler
// ---------------------------------------------------------------------------
exports.extractHandler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json"
  };

  try {
    // Handle OPTIONS request for CORS preflight
    if (
      event.httpMethod === "OPTIONS" ||
      event.requestContext?.http?.method === "OPTIONS"
    ) {
      return { statusCode: 200, headers, body: "" };
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON" })
      };
    }

    // Route: Request S3 presigned upload URL
    const path =
      event.rawPath ||
      event.path ||
      event.requestContext?.http?.path ||
      "";

    const isUploadUrlRequest =
      path.endsWith("/upload-url") ||
      body.action === "upload-url" ||
      (body.fileName && body.contentType && !body.text);

    if (isUploadUrlRequest) {
      try {
        const uploadResult = await createPresignedUploadUrl({
          fileName: body.fileName,
          contentType: body.contentType
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(uploadResult)
        };
      } catch (uploadErr) {
        const status = uploadErr.statusCode || 500;
        return {
          statusCode: status,
          headers,
          body: JSON.stringify({
            error: uploadErr.message || "Failed to generate upload URL"
          })
        };
      }
    }

    // Route: S3 object extraction via Textract
    if (body.s3Key) {
      try {
        const text = await extractTextFromS3(body.s3Key);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            text
          })
        };
      } catch (err) {
        console.error("Textract error:", err);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to extract text from document" })
        };
      }
    }

    const { text } = body;
    if (!text || text.trim() === "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing or empty text" })
      };
    }

    // Build ConverseCommand payload
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: [{ text: text.trim() }]
        }
      ],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.1
      }
    });

    // Invoke Nova Lite
    let bedrockResponse;
    try {
      bedrockResponse = await getBedrockClient().send(command);
    } catch (err) {
      console.error("Bedrock invocation error:", err);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Upstream model invocation failed" })
      };
    }

    // Extract text from the response
    const rawText =
      bedrockResponse?.output?.message?.content?.[0]?.text ?? "";

    // Parse and validate the model output
    let parsed;
    try {
      parsed = safeParseBedrockResponse(rawText);
    } catch (parseErr) {
      console.error("Bedrock JSON parse error:", parseErr.message);
      console.error("Raw model output:", rawText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Model returned unexpected output" })
      };
    }

    // Validate every extracted event (field-level, non-mutating)
    const validation = validateEvents(parsed.events);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        events: parsed.events,
        validation
      })
    };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};

// Exported for unit testing only — never call from production path
exports._setBedrockClient = _setBedrockClient;
exports._safeParseBedrockResponse = safeParseBedrockResponse;
