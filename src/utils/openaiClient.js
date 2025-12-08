// src/utils/openaiClient.js
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ Missing OPENAI_API_KEY in env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export { openai, OPENAI_MODEL };
