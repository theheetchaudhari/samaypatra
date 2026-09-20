"use strict";

const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");

const DEFAULT_REGION = process.env.AWS_REGION || "ap-south-1";
const DEFAULT_BUCKET_NAME = process.env.S3_BUCKET_NAME || "samaypatra-uploads-2026-0920";

let _textractClient = null;

function getTextractClient() {
  if (!_textractClient) {
    _textractClient = new TextractClient({
      region: DEFAULT_REGION
    });
  }
  return _textractClient;
}

function _setTextractClient(client) {
  _textractClient = client;
}

async function extractTextFromS3(s3Key, bucketName = DEFAULT_BUCKET_NAME) {
  if (!s3Key || typeof s3Key !== "string") {
    throw new Error("Invalid s3Key provided to Textract");
  }

  const command = new DetectDocumentTextCommand({
    Document: {
      S3Object: {
        Bucket: bucketName,
        Name: s3Key
      }
    }
  });

  const response = await getTextractClient().send(command);

  if (!response || !response.Blocks) {
    return "";
  }

  const textLines = response.Blocks
    .filter((block) => block.BlockType === "LINE")
    .map((block) => block.Text);

  return textLines.join("\n");
}

module.exports = {
  extractTextFromS3,
  _setTextractClient
};
