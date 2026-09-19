const express = require("express");
const cors = require("cors");
const { validateUploadMetadata, generateS3Key } = require("./s3.js");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/upload-url", (req, res) => {
  const { fileName, contentType } = req.body;
  const validation = validateUploadMetadata({ fileName, contentType });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const s3Key = generateS3Key(validation.safeFileName);
  res.json({
    success: true,
    uploadUrl: `http://localhost:3000/mock-s3-upload/${s3Key}`,
    s3Key
  });
});

app.post("/extract", (req, res) => {
  const { text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Missing or empty text" });
  }

  res.json({
    success: true,
    events: [
      {
        id: "mock-1",
        title: "DBMS Assignment Submission",
        eventType: "Assignment Deadline",
        date: "2026-09-22",
        time: "23:59",
        timezone: "Asia/Kolkata",
        allDay: false,
        location: "Online",
        description: "Submit the final DBMS assignment.",
        sourceEvidence: "DBMS Assignment: Submit the final assignment by Monday, 11:59 PM. Submission is online.",
        confidence: "high",
        ambiguities: []
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Samaypatra backend running on http://localhost:${PORT}`);
});