import express from 'express';
import {
  upsertDailyCheckin,
  getDailyCheckin,
  deleteDailyCheckin,
  upsertWeeklyCheckin,
  getWeeklyCheckin,
  deleteWeeklyCheckin,
  createWorryEntry,
  updateWorryEntry,
  getWorryEntriesByDate,
  deleteWorryEntry,
  generatePositiveReframePreview,
  getJournalByDate,
  getJournalRange,
  getJournalStats
} from '../controllers/journaling.controller.js';

const router = express.Router();

/**
 * Student Journaling Routes
 * Base path: /api/student/journal
 * All routes require authentication and student role (enforced by parent router)
 */

// ==================== DAILY CHECK-IN ROUTES ====================

/**
 * @route   POST /api/student/journal/daily
 * @desc    Create or update daily check-in for a specific date
 * @access  Private (Student only)
 * @body    {
 *            date: "YYYY-MM-DD",
 *            positive_moments: ["text1", "text2"],
 *            challenges_faced: ["text1", "text2"],
 *            todays_reflection: "text",
 *            intentions_tomorrow: ["text1", "text2"],
 *            feelings_space: "text"
 *          }
 */
router.post('/daily', upsertDailyCheckin);

/**
 * @route   GET /api/student/journal/daily/:date
 * @desc    Get daily check-in for a specific date
 * @access  Private (Student only)
 * @params  date - Date in YYYY-MM-DD format
 */
router.get('/daily/:date', getDailyCheckin);

/**
 * @route   DELETE /api/student/journal/daily/:id
 * @desc    Delete daily check-in by ID
 * @access  Private (Student only)
 * @params  id - Daily check-in UUID
 */
router.delete('/daily/:id', deleteDailyCheckin);

// ==================== WEEKLY CHECK-IN ROUTES ====================

/**
 * @route   POST /api/student/journal/weekly
 * @desc    Create or update weekly check-in for a specific week
 * @access  Private (Student only)
 * @body    {
 *            date: "YYYY-MM-DD" (any date in the week),
 *            week_reflection: "text",
 *            next_week_intentions: ["text1", "text2"],
 *            self_care_score: 7,
 *            self_care_reflection: "text"
 *          }
 */
router.post('/weekly', upsertWeeklyCheckin);

/**
 * @route   GET /api/student/journal/weekly/:date
 * @desc    Get weekly check-in for the week containing the specified date
 * @access  Private (Student only)
 * @params  date - Date in YYYY-MM-DD format (any date in the week)
 */
router.get('/weekly/:date', getWeeklyCheckin);

/**
 * @route   DELETE /api/student/journal/weekly/:id
 * @desc    Delete weekly check-in by ID
 * @access  Private (Student only)
 * @params  id - Weekly check-in UUID
 */
router.delete('/weekly/:id', deleteWeeklyCheckin);

// ==================== WORRIES JOURNAL ROUTES ====================

/**
 * @route   POST /api/student/journal/worries
 * @desc    Create a new worry journal entry
 * @access  Private (Student only)
 * @body    {
 *            date: "YYYY-MM-DD",
 *            whats_on_mind: "text",
 *            positive_reframe: "text" (optional)
 *          }
 */
router.post('/worries', createWorryEntry);

/**
 * @route   PUT /api/student/journal/worries/:id
 * @desc    Update a worry journal entry
 * @access  Private (Student only)
 * @params  id - Worry entry UUID
 * @body    {
 *            whats_on_mind: "text" (optional),
 *            positive_reframe: "text" (optional)
 *          }
 */
router.put('/worries/:id', updateWorryEntry);

/**
 * @route   POST /api/student/journal/worries/reframe
 * @desc    Generate AI positive reframe for UNSAVED worry text. Optional save.
 * @access  Private (Student only)
 * @body    {
 *            whats_on_mind: "text",            // required
 *            date: "YYYY-MM-DD",               // required if save=true
 *            save: true | false                // default false (ephemeral)
 *          }
 * @response If save=false: { positive_reframe, saved:false }
 *           If save=true: newly created worry entry with AI reframe
 */
router.post('/worries/reframe', generatePositiveReframePreview);

/**
 * @route   GET /api/student/journal/worries/:date
 * @desc    Get all worry entries for a specific date
 * @access  Private (Student only)
 * @params  date - Date in YYYY-MM-DD format
 */
router.get('/worries/:date', getWorryEntriesByDate);

/**
 * @route   DELETE /api/student/journal/worries/:id
 * @desc    Delete worry entry by ID
 * @access  Private (Student only)
 * @params  id - Worry entry UUID
 */
router.delete('/worries/:id', deleteWorryEntry);

// ==================== COMBINED/CALENDAR ROUTES ====================

/**
 * @route   GET /api/student/journal/date/:date
 * @desc    Get all journal entries for a specific date (daily, weekly, worries)
 * @access  Private (Student only)
 * @params  date - Date in YYYY-MM-DD format
 * @note    This is the main endpoint for calendar date clicks in the UI
 * @response {
 *            date: "YYYY-MM-DD",
 *            daily_checkin: {...} or null,
 *            weekly_checkin: {...} or null,
 *            worries: [...]
 *          }
 */
router.get('/date/:date', getJournalByDate);

/**
 * @route   GET /api/student/journal/range
 * @desc    Get journal entries for a date range
 * @access  Private (Student only)
 * @query   start_date - Start date in YYYY-MM-DD format
 * @query   end_date - End date in YYYY-MM-DD format
 * @response {
 *            start_date: "YYYY-MM-DD",
 *            end_date: "YYYY-MM-DD",
 *            daily_checkins: [...],
 *            weekly_checkins: [...],
 *            worries: [...]
 *          }
 */
router.get('/range', getJournalRange);

/**
 * @route   GET /api/student/journal/stats
 * @desc    Get journal statistics (total counts)
 * @access  Private (Student only)
 * @response {
 *            total_daily_checkins: number,
 *            total_weekly_checkins: number,
 *            total_worry_entries: number
 *          }
 */
router.get('/stats', getJournalStats);

export default router;
