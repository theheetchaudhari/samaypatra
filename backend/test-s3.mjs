/**
 * T6.3 Offline Unit Tests for S3 Presigned Upload Backend
 *
 * Tests:
 *  1. validateUploadMetadata – valid PNG, JPEG, PDF
 *  2. validateUploadMetadata – unsupported content types rejected
 *  3. validateUploadMetadata – missing fileName or contentType rejected
 *  4. validateUploadMetadata – path traversal and unsafe characters rejected
 *  5. validateUploadMetadata – filename extension mismatches rejected
 *  6. validateUploadMetadata – filename sanitization
 *  7. generateS3Key – structured format uploads/YYYY-MM-DD/<uuid>-<safeName>
 *  8. generateS3Key – UUID uniqueness across invocations
 *  9. createPresignedUploadUrl – fake presigner receives correct bucket, key, contentType, and 300s expiration
 * 10. createPresignedUploadUrl – throws 400 error on invalid metadata
 * 11. extractHandler – routes /upload-url and returns 200 with presigned URL and key
 * 12. extractHandler – routes /upload-url with invalid metadata and returns 400
 * 13. extractHandler – routes action: "upload-url"
 *
 * No real AWS credentials or network calls are made.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {
  validateUploadMetadata,
  generateS3Key,
  createPresignedUploadUrl,
  _setS3Client,
  _setSignedUrlFn,
  DEFAULT_BUCKET_NAME
} = require("./s3.js");

const { extractHandler } = require("./handler.js");

// ---------------------------------------------------------------------------
// Assertion Helpers
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

console.log("\n=== T6.3 S3 Presigned Upload Backend Unit Tests ===\n");

// ---------------------------------------------------------------------------
// 1. Metadata Validation - Valid Types
// ---------------------------------------------------------------------------
console.log("Group 1: validateUploadMetadata - valid file types");
{
  const png = validateUploadMetadata({ fileName: "timetable.png", contentType: "image/png" });
  assert(png.valid === true, "PNG is valid");
  assert(png.safeFileName === "timetable.png", "PNG safeFileName matches");
  assert(png.contentType === "image/png", "PNG contentType matches");

  const jpeg = validateUploadMetadata({ fileName: "assignment.jpeg", contentType: "image/jpeg" });
  assert(jpeg.valid === true, "JPEG is valid");
  assert(jpeg.safeFileName === "assignment.jpeg", "JPEG safeFileName matches");

  const jpg = validateUploadMetadata({ fileName: "notice.jpg", contentType: "image/jpeg" });
  assert(jpg.valid === true, "JPG is valid for image/jpeg");
  assert(jpg.safeFileName === "notice.jpg", "JPG safeFileName matches");

  const pdf = validateUploadMetadata({ fileName: "circular.pdf", contentType: "application/pdf" });
  assert(pdf.valid === true, "PDF is valid");
  assert(pdf.safeFileName === "circular.pdf", "PDF safeFileName matches");
}

// ---------------------------------------------------------------------------
// 2. Metadata Validation - Unsupported Content Types
// ---------------------------------------------------------------------------
console.log("\nGroup 2: validateUploadMetadata - unsupported content types");
{
  const txt = validateUploadMetadata({ fileName: "doc.txt", contentType: "text/plain" });
  assert(txt.valid === false, "text/plain is rejected");
  assert(txt.error.includes("Unsupported content type"), "Error mentions unsupported content type");

  const zip = validateUploadMetadata({ fileName: "archive.zip", contentType: "application/zip" });
  assert(zip.valid === false, "application/zip is rejected");

  const exe = validateUploadMetadata({ fileName: "virus.exe", contentType: "application/x-msdownload" });
  assert(exe.valid === false, "application/x-msdownload is rejected");
}

// ---------------------------------------------------------------------------
// 3. Metadata Validation - Missing or Invalid Fields
// ---------------------------------------------------------------------------
console.log("\nGroup 3: validateUploadMetadata - missing or empty fields");
{
  const noName = validateUploadMetadata({ fileName: "", contentType: "image/png" });
  assert(noName.valid === false, "Empty fileName rejected");

  const nullName = validateUploadMetadata({ fileName: null, contentType: "image/png" });
  assert(nullName.valid === false, "Null fileName rejected");

  const noType = validateUploadMetadata({ fileName: "test.png", contentType: "" });
  assert(noType.valid === false, "Empty contentType rejected");

  const nullType = validateUploadMetadata({ fileName: "test.png", contentType: null });
  assert(nullType.valid === false, "Null contentType rejected");
}

// ---------------------------------------------------------------------------
// 4. Metadata Validation - Path Traversal & Unsafe Characters
// ---------------------------------------------------------------------------
console.log("\nGroup 4: validateUploadMetadata - path traversal / unsafe characters");
{
  const traversal1 = validateUploadMetadata({ fileName: "../../secret.png", contentType: "image/png" });
  assert(traversal1.valid === false, "Path traversal with .. rejected");

  const traversal2 = validateUploadMetadata({ fileName: "uploads/secret.png", contentType: "image/png" });
  assert(traversal2.valid === false, "Slash in fileName rejected");

  const traversal3 = validateUploadMetadata({ fileName: "uploads\\secret.png", contentType: "image/png" });
  assert(traversal3.valid === false, "Backslash in fileName rejected");

  const nullByte = validateUploadMetadata({ fileName: "secret\0.png", contentType: "image/png" });
  assert(nullByte.valid === false, "Null byte in fileName rejected");
}

// ---------------------------------------------------------------------------
// 5. Metadata Validation - Extension & Content Type Mismatches
// ---------------------------------------------------------------------------
console.log("\nGroup 5: validateUploadMetadata - extension mismatch");
{
  const mismatch1 = validateUploadMetadata({ fileName: "notice.pdf", contentType: "image/png" });
  assert(mismatch1.valid === false, ".pdf with image/png is rejected");
  assert(mismatch1.error.includes("does not match content type"), "Error describes mismatch");

  const mismatch2 = validateUploadMetadata({ fileName: "script.exe", contentType: "application/pdf" });
  assert(mismatch2.valid === false, ".exe with application/pdf is rejected");

  const noExt = validateUploadMetadata({ fileName: "notice", contentType: "image/jpeg" });
  assert(noExt.valid === false, "Filename with no extension is rejected");
}

// ---------------------------------------------------------------------------
// 6. Metadata Validation - Filename Sanitization
// ---------------------------------------------------------------------------
console.log("\nGroup 6: validateUploadMetadata - filename sanitization");
{
  const messy = validateUploadMetadata({
    fileName: "Exam Schedule & Syllabus (2026) #final!.pdf",
    contentType: "application/pdf"
  });
  assert(messy.valid === true, "Messy filename accepted");
  assert(!messy.safeFileName.includes(" "), "Spaces sanitized");
  assert(!messy.safeFileName.includes("&"), "Special chars sanitized");
  assert(messy.safeFileName.endsWith(".pdf"), "Preserves .pdf extension");
}

// ---------------------------------------------------------------------------
// 7. S3 Key Generation
// ---------------------------------------------------------------------------
console.log("\nGroup 7: generateS3Key format and uniqueness");
{
  const fixedDate = new Date("2026-09-20T12:00:00.000Z");
  const key1 = generateS3Key("syllabus.pdf", fixedDate);
  const keyPattern = /^uploads\/2026-09-20\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-syllabus\.pdf$/;
  assert(keyPattern.test(key1), `Key matches uploads/YYYY-MM-DD/<uuid>-safeName pattern (${key1})`);

  const key2 = generateS3Key("syllabus.pdf", fixedDate);
  assert(key1 !== key2, "Two generated keys have distinct UUIDs");
}

// ---------------------------------------------------------------------------
// 8. createPresignedUploadUrl with Mocked S3 Pre-signer
// ---------------------------------------------------------------------------
console.log("\nGroup 8: createPresignedUploadUrl with mock presigner");
{
  let capturedClient = null;
  let capturedCommand = null;
  let capturedOptions = null;

  _setS3Client({ fakeClient: true });
  _setSignedUrlFn(async (client, command, options) => {
    capturedClient = client;
    capturedCommand = command;
    capturedOptions = options;
    return `https://${command.input.Bucket}.s3.ap-south-1.amazonaws.com/${command.input.Key}?signed=true`;
  });

  const res = await createPresignedUploadUrl({
    fileName: "circular.pdf",
    contentType: "application/pdf"
  });

  assert(res.success === true, "Result indicates success");
  assert(typeof res.uploadUrl === "string", "uploadUrl is returned");
  assert(res.uploadUrl.includes("samaypatra-uploads-2026-0920"), "URL targets default bucket");
  assert(res.s3Key.startsWith("uploads/"), "s3Key starts with uploads/");
  assert(capturedOptions.expiresIn === 300, "Expiration is 300 seconds (5 minutes)");
  assert(capturedCommand.input.Bucket === DEFAULT_BUCKET_NAME, "Command target bucket matches");
  assert(capturedCommand.input.ContentType === "application/pdf", "Command ContentType matches");

  // Error case: invalid metadata throws 400
  let errorCaught = null;
  try {
    await createPresignedUploadUrl({ fileName: "evil.exe", contentType: "image/png" });
  } catch (err) {
    errorCaught = err;
  }
  assert(errorCaught !== null, "Invalid metadata throws an error");
  assert(errorCaught.statusCode === 400, "Thrown error has statusCode 400");
}

// ---------------------------------------------------------------------------
// 9. extractHandler Routing for /upload-url
// ---------------------------------------------------------------------------
console.log("\nGroup 9: extractHandler routing for upload-url");
{
  // Test route via event.rawPath
  const res1 = await extractHandler({
    rawPath: "/upload-url",
    httpMethod: "POST",
    body: JSON.stringify({
      fileName: "notice.jpg",
      contentType: "image/jpeg"
    })
  });
  const body1 = JSON.parse(res1.body);

  assert(res1.statusCode === 200, "HTTP status is 200 for valid upload-url request");
  assert(body1.success === true, "body1.success is true");
  assert(typeof body1.uploadUrl === "string", "body1.uploadUrl is a string");
  assert(body1.s3Key.endsWith(".jpg"), "body1.s3Key ends with .jpg");

  // Test route via body.action
  const res2 = await extractHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      action: "upload-url",
      fileName: "diagram.png",
      contentType: "image/png"
    })
  });
  const body2 = JSON.parse(res2.body);
  assert(res2.statusCode === 200, "HTTP status is 200 for action: 'upload-url'");
  assert(body2.success === true, "body2.success is true");

  // Test invalid upload metadata returns 400
  const res3 = await extractHandler({
    rawPath: "/upload-url",
    httpMethod: "POST",
    body: JSON.stringify({
      fileName: "hack.sh",
      contentType: "application/x-sh"
    })
  });
  const body3 = JSON.parse(res3.body);
  assert(res3.statusCode === 400, "HTTP status is 400 for unsupported upload metadata");
  assert(typeof body3.error === "string", "body3.error message returned");
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
