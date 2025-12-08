// src/utils/moodDetector.js

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL_ID =
  process.env.HF_MODEL_ID || "j-hartmann/emotion-english-distilroberta-base";

if (!HF_API_KEY) {
  console.warn("⚠️ HF_API_KEY not set – mood detection will be skipped.");
}

/**
 * Detects mood using HuggingFace j-hartmann model.
 * Returns { label, score } or null if something fails.
 */
async function detectMood(text) {
  if (!HF_API_KEY || !text || !text.trim()) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("HF mood API error:", err);
      return null;
    }

    const data = await response.json();

    // HF normally returns [[{label,score}...]] or [{label,score}...]
    const candidates = Array.isArray(data)
      ? Array.isArray(data[0])
        ? data[0]
        : data
      : [];

    if (!candidates.length) return null;

    const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
    return { label: best.label, score: best.score };
  } catch (err) {
    console.error("Mood detection failed:", err);
    return null;
  }
}

export { detectMood };
