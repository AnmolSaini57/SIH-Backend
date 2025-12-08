// src/routes/aiTranscriptionRoutes.js
import { Router } from "express";
import multer from "multer";
import { openai } from "../utils/openaiClient.js";

const router = Router();

// simple in-memory storage for small chunks
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ai/transcribe
router.post(
  "/transcribe",
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Whisper expects a file-like object; we create a temp Blob-like wrapper
      const audioFile = new File([file.buffer], "chunk.webm", {
        type: file.mimetype || "audio/webm",
      });

      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
      });

      return res.json({ text: response.text || "" });
    } catch (err) {
      console.error("Transcription error:", err);
      return res.status(500).json({ error: "Transcription failed" });
    }
  }
);

export default router;
