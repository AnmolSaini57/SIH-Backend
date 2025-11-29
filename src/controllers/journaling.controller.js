import { JournalingService } from '../services/journaling.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// ==================== INTERNAL HELPERS ====================
// Lightweight classification retained ONLY for analytics / storing a label.
// Model itself will mirror input language & style (including Hinglish) via prompt instruction.
const classifyLanguage = (text = '') => {
  if (!text) return 'english';
  if (/[\u0900-\u097F]/.test(text)) return 'hindi'; // Devanagari
  if (/[\u0600-\u06FF]/.test(text)) return 'urdu'; // Arabic script
  const lower = text.toLowerCase();
  const hinglishTokens = ['hai','nahi','kya','mera','meri','bahut','acha','accha','kal','dost','padhai','kar','hoga','khush','udhas','dukhi','tension','soch','zindagi','shayad','thoda','lekin'];
  for (const token of hinglishTokens) {
    if (lower.includes(token)) return 'hinglish';
  }
  return 'english';
};

/**
 * Journaling Controller
 * Handles all journaling-related requests for students
 */

// ==================== DAILY CHECK-IN CONTROLLERS ====================

/**
 * Create or update daily check-in
 * POST /api/student/journal/daily
 */
export const upsertDailyCheckin = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date, positive_moments, challenges_faced, todays_reflection, intentions_tomorrow, feelings_space } = req.body;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    const result = await JournalingService.upsertDailyCheckin(studentId, date, {
      positive_moments,
      challenges_faced,
      todays_reflection,
      intentions_tomorrow,
      feelings_space
    });

    return successResponse(res, result, 'Daily check-in saved successfully', 200);
  } catch (error) {
    console.error('Error upserting daily check-in:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get daily check-in for a specific date
 * GET /api/student/journal/daily/:date
 */
export const getDailyCheckin = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    const result = await JournalingService.getDailyCheckin(studentId, date);

    if (!result) {
      return successResponse(res, null, 'No daily check-in found for this date', 200);
    }

    return successResponse(res, result, 'Daily check-in retrieved successfully', 200);
  } catch (error) {
    console.error('Error getting daily check-in:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete daily check-in
 * DELETE /api/student/journal/daily/:id
 */
export const deleteDailyCheckin = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { id } = req.params;

    await JournalingService.deleteDailyCheckin(studentId, id);

    return successResponse(res, null, 'Daily check-in deleted successfully', 200);
  } catch (error) {
    console.error('Error deleting daily check-in:', error);
    return errorResponse(res, error.message, 500);
  }
};

// ==================== WEEKLY CHECK-IN CONTROLLERS ====================

/**
 * Create or update weekly check-in
 * POST /api/student/journal/weekly
 */
export const upsertWeeklyCheckin = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date, week_reflection, next_week_intentions, self_care_score, self_care_reflection } = req.body;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    const result = await JournalingService.upsertWeeklyCheckin(studentId, date, {
      week_reflection,
      next_week_intentions,
      self_care_score,
      self_care_reflection
    });

    return successResponse(res, result, 'Weekly check-in saved successfully', 200);
  } catch (error) {
    console.error('Error upserting weekly check-in:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get weekly check-in for a specific week
 * GET /api/student/journal/weekly/:date
 */
export const getWeeklyCheckin = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    const result = await JournalingService.getWeeklyCheckin(studentId, date);

    if (!result) {
      return successResponse(res, null, 'No weekly check-in found for this week', 200);
    }

    return successResponse(res, result, 'Weekly check-in retrieved successfully', 200);
  } catch (error) {
    console.error('Error getting weekly check-in:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete weekly check-in
 * DELETE /api/student/journal/weekly/:id
 */
export const deleteWeeklyCheckin = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { id } = req.params;

    await JournalingService.deleteWeeklyCheckin(studentId, id);

    return successResponse(res, null, 'Weekly check-in deleted successfully', 200);
  } catch (error) {
    console.error('Error deleting weekly check-in:', error);
    return errorResponse(res, error.message, 500);
  }
};

// ==================== WORRIES JOURNAL CONTROLLERS ====================

/**
 * Create a new worry journal entry
 * POST /api/student/journal/worries
 */
export const createWorryEntry = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date, whats_on_mind, positive_reframe } = req.body;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    if (!whats_on_mind || whats_on_mind.trim() === '') {
      return errorResponse(res, 'Worry content is required', 400);
    }

    const result = await JournalingService.createWorryEntry(studentId, date, {
      whats_on_mind,
      positive_reframe,
      is_ai_generated: false
    });

    return successResponse(res, result, 'Worry entry created successfully', 201);
  } catch (error) {
    console.error('Error creating worry entry:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update a worry journal entry
 * PUT /api/student/journal/worries/:id
 */
export const updateWorryEntry = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { id } = req.params;
    const { whats_on_mind, positive_reframe } = req.body;

    const result = await JournalingService.updateWorryEntry(studentId, id, {
      whats_on_mind,
      positive_reframe
    });

    return successResponse(res, result, 'Worry entry updated successfully', 200);
  } catch (error) {
    console.error('Error updating worry entry:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get worry entries for a specific date
 * GET /api/student/journal/worries/:date
 */
export const getWorryEntriesByDate = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    const result = await JournalingService.getWorryEntriesByDate(studentId, date);

    return successResponse(res, result, 'Worry entries retrieved successfully', 200);
  } catch (error) {
    console.error('Error getting worry entries:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete worry entry
 * DELETE /api/student/journal/worries/:id
 */
export const deleteWorryEntry = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { id } = req.params;

    await JournalingService.deleteWorryEntry(studentId, id);

    return successResponse(res, null, 'Worry entry deleted successfully', 200);
  } catch (error) {
    console.error('Error deleting worry entry:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Generate AI-powered positive reframe for unsaved worry text
 * POST /api/student/journal/worries/reframe
 * Body: { whats_on_mind: string, date?: 'YYYY-MM-DD', save?: boolean }
 * If save=true and date provided => create worry entry with AI reframe.
 * Otherwise returns ephemeral reframe (not stored).
 */
export const generatePositiveReframePreview = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { whats_on_mind, date, save = false, id } = req.body;

    if (!whats_on_mind || whats_on_mind.trim() === '') {
      return errorResponse(res, 'whats_on_mind text is required', 400);
    }

    if (!genAI) {
      return errorResponse(res, 'AI reframing service is not available', 503);
    }

    const lang = classifyLanguage(whats_on_mind);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a compassionate mental health assistant for college students.
  The student has shared a worry. Reframe it with balance, validation, and gentle encouragement.

  STUDENT WORRY:
  "${whats_on_mind}"

  LANGUAGE STYLE:
  Mirror the student's language and script. If Hindi script, respond in Hindi. If Urdu script, respond in Urdu. If Latin script with mixed Hindi + English words (Hinglish), respond in Hinglish (Hindi + English words in Latin script). Otherwise respond in natural English.

  GUIDELINES:
  1. Validate feelings.
  2. Offer realistic, hopeful perspective.
  3. 3-5 sentences, <= 80 words.
  4. No lists, labels, markdown, or emojis.
  5. Second person (you).
  6. One gentle actionable suggestion.

  OUTPUT: Only the supportive reframe.`;

    const generationConfig = { maxOutputTokens: 150, temperature: 0.7 };
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    });
    const response = await result.response;
    const positiveReframe = response.text().trim();

    // If save requested, either update existing by id or create new by date
    if (save) {
      if (id) {
        const updated = await JournalingService.updateWorryEntry(studentId, id, {
          whats_on_mind,
          positive_reframe: positiveReframe,
          is_ai_generated: true
        });
        return successResponse(res, updated, 'Positive reframe generated and saved (updated existing worry)', 200);
      } else {
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return errorResponse(res, 'Valid date required to save new worry (YYYY-MM-DD)', 400);
        }
        const saved = await JournalingService.createWorryEntry(studentId, date, {
          whats_on_mind,
          positive_reframe: positiveReframe,
          is_ai_generated: true
        });
        return successResponse(res, saved, 'Positive reframe generated and saved (new worry)', 201);
      }
    }

    // Ephemeral response
    return successResponse(res, {
      student_id: studentId,
      whats_on_mind,
      positive_reframe: positiveReframe,
      is_ai_generated: true,
      language: lang,
      saved: false
    }, 'Positive reframe generated (not saved)', 200);
  } catch (error) {
    console.error('Error generating preview positive reframe:', error);
    return errorResponse(res, 'Failed to generate positive reframe preview.', 500);
  }
};

// ==================== COMBINED CONTROLLERS ====================

/**
 * Get all journal entries for a specific date
 * GET /api/student/journal/date/:date
 */
export const getJournalByDate = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 'Valid date in YYYY-MM-DD format is required', 400);
    }

    const result = await JournalingService.getJournalEntriesByDate(studentId, date);

    return successResponse(res, result, 'Journal entries retrieved successfully', 200);
  } catch (error) {
    console.error('Error getting journal by date:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get journal entries for a date range
 * GET /api/student/journal/range?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export const getJournalRange = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const { start_date, end_date } = req.query;

    // Validate date formats
    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return errorResponse(res, 'Valid start_date in YYYY-MM-DD format is required', 400);
    }

    if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return errorResponse(res, 'Valid end_date in YYYY-MM-DD format is required', 400);
    }

    // Ensure start_date is before end_date
    if (new Date(start_date) > new Date(end_date)) {
      return errorResponse(res, 'start_date must be before or equal to end_date', 400);
    }

    const result = await JournalingService.getJournalEntriesRange(studentId, start_date, end_date);

    return successResponse(res, result, 'Journal entries retrieved successfully', 200);
  } catch (error) {
    console.error('Error getting journal range:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get journal statistics
 * GET /api/student/journal/stats
 */
export const getJournalStats = async (req, res) => {
  try {
    const studentId = req.user.user_id;

    const result = await JournalingService.getJournalStats(studentId);

    return successResponse(res, result, 'Journal statistics retrieved successfully', 200);
  } catch (error) {
    console.error('Error getting journal stats:', error);
    return errorResponse(res, error.message, 500);
  }
};
