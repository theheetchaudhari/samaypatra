"use strict";

const crypto = require("crypto");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------
const DEFAULT_REGION = process.env.AWS_REGION || "ap-south-1";
const DEFAULT_BUCKET_NAME =
  process.env.S3_BUCKET_NAME || "samaypatra-uploads-2026-0920";
const DEFAULT_EXPIRES_IN = 300; // 5 minutes

const ALLOWED_MIME_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/pdf": [".pdf"]
};

// ---------------------------------------------------------------------------
// Validation: File Metadata & Name Sanitization
// ---------------------------------------------------------------------------
function validateUploadMetadata({ fileName, contentType }) {
  if (!fileName || typeof fileName !== "string" || fileName.trim() === "") {
    return { valid: false, error: "Missing or invalid fileName" };
  }

  if (
    !contentType ||
    typeof contentType !== "string" ||
    contentType.trim() === ""
  ) {
    return { valid: false, error: "Missing or invalid contentType" };
  }

  const rawName = fileName.trim();
  const normalizedContentType = contentType.trim().toLowerCase();

  // Validate MIME type
  const allowedExtensions = ALLOWED_MIME_TYPES[normalizedContentType];
  if (!allowedExtensions) {
    return {
      valid: false,
      error: `Unsupported content type "${contentType}". Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}`
    };
  }

  // Reject obvious traversal attempts or control characters
  if (
    rawName.includes("\0") ||
    rawName.includes("/") ||
    rawName.includes("\\") ||
    rawName.includes("..")
  ) {
    return { valid: false, error: "Unsafe fileName: path traversal or invalid characters detected" };
  }

  const baseName = path.basename(rawName);
  if (!baseName || baseName.length > 255) {
    return { valid: false, error: "fileName must be between 1 and 255 characters" };
  }

  // Validate extension matches content type
  const ext = path.extname(baseName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension "${ext}" does not match content type "${normalizedContentType}". Expected one of: ${allowedExtensions.join(", ")}`
    };
  }

  // Sanitize filename: keep only alphanumeric, dots, hyphens, and underscores
  const nameWithoutExt = path.basename(baseName, ext);
  const sanitizedStem = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "");
  const finalStem = sanitizedStem.length > 0 ? sanitizedStem : "upload";
  const safeFileName = `${finalStem}${ext}`;

  return {
    valid: true,
    safeFileName,
    contentType: normalizedContentType
  };
}

// ---------------------------------------------------------------------------
// S3 Key Generation: uploads/{YYYY-MM-DD}/{uuid}-{safeFileName}
// ---------------------------------------------------------------------------
function generateS3Key(safeFileName, date = new Date()) {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const uuid = crypto.randomUUID();
  return `uploads/${dateStr}/${uuid}-${safeFileName}`;
}

// ---------------------------------------------------------------------------
// S3 Client Management (Lazy Initialization & Test Injections)
// ---------------------------------------------------------------------------
let _s3Client = null;
let _signedUrlFn = getSignedUrl;

function getS3Client() {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: DEFAULT_REGION
    });
  }
  return _s3Client;
}

function _setS3Client(client) {
  _s3Client = client;
}

function _setSignedUrlFn(fn) {
  _signedUrlFn = fn;
}

// ---------------------------------------------------------------------------
// Generate Presigned Upload URL
// ---------------------------------------------------------------------------
async function createPresignedUploadUrl({
  fileName,
  contentType,
  bucketName = DEFAULT_BUCKET_NAME,
  expiresIn = DEFAULT_EXPIRES_IN
} = {}) {
  const validation = validateUploadMetadata({ fileName, contentType });
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  const s3Key = generateS3Key(validation.safeFileName);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    ContentType: validation.contentType
  });

  const uploadUrl = await _signedUrlFn(getS3Client(), command, {
    expiresIn
  });

  return {
    success: true,
    uploadUrl,
    s3Key
  };
}

module.exports = {
  DEFAULT_REGION,
  DEFAULT_BUCKET_NAME,
  DEFAULT_EXPIRES_IN,
  ALLOWED_MIME_TYPES,
  validateUploadMetadata,
  generateS3Key,
  createPresignedUploadUrl,
  _setS3Client,
  _setSignedUrlFn
};
