import { supabase } from "../config/supabase.js";
import { formatSupabaseError } from "../utils/response.js";

/**
 * Journaling Service
 * Business logic for student journaling operations
 * Handles daily check-ins, weekly check-ins, and worries journal
 */

export class JournalingService {
  
  // ==================== DAILY CHECK-IN METHODS ====================
  
  /**
   * Create or update daily check-in for a specific date
   * @param {string} studentId - Student's UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Object} data - Check-in data
   * @returns {Promise<Object>} - Created/updated daily check-in
   */
  static async upsertDailyCheckin(studentId, date, data) {
    const {
      positive_moments = [],
      challenges_faced = [],
      todays_reflection = null,
      intentions_tomorrow = [],
      feelings_space = null
    } = data;

    const { data: result, error } = await supabase
      .from('daily_checkins')
      .upsert({
        student_id: studentId,
        date,
        positive_moments,
        challenges_faced,
        todays_reflection,
        intentions_tomorrow,
        feelings_space,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,date',
        returning: 'representation'
      })
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return result;
  }

  /**
   * Get daily check-in for a specific date
   * @param {string} studentId - Student's UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object|null>} - Daily check-in or null
   */
  static async getDailyCheckin(studentId, date) {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get daily check-ins for a date range
   * @param {string} studentId - Student's UUID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of daily check-ins
   */
  static async getDailyCheckinsRange(studentId, startDate, endDate) {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data || [];
  }

  /**
   * Delete daily check-in
   * @param {string} studentId - Student's UUID
   * @param {string} id - Daily check-in UUID
   * @returns {Promise<void>}
   */
  static async deleteDailyCheckin(studentId, id) {
    const { error } = await supabase
      .from('daily_checkins')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }
  }

  // ==================== WEEKLY CHECK-IN METHODS ====================

  /**
   * Get week start and end dates (Monday-Sunday) for a given date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} - { weekStart, weekEnd }
   */
  static getWeekDates(date) {
    const inputDate = new Date(date + 'T00:00:00');
    const dayOfWeek = inputDate.getDay();
    
    // Calculate Monday (start of week)
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(inputDate);
    weekStart.setDate(inputDate.getDate() - daysFromMonday);
    
    // Calculate Sunday (end of week)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0]
    };
  }

  /**
   * Create or update weekly check-in
   * @param {string} studentId - Student's UUID
   * @param {string} date - Any date within the week (YYYY-MM-DD)
   * @param {Object} data - Check-in data
   * @returns {Promise<Object>} - Created/updated weekly check-in
   */
  static async upsertWeeklyCheckin(studentId, date, data) {
    const { weekStart, weekEnd } = this.getWeekDates(date);
    
    const {
      week_reflection = null,
      next_week_intentions = [],
      self_care_score = null,
      self_care_reflection = null
    } = data;

    // Validate self_care_score if provided
    if (self_care_score !== null && (self_care_score < 0 || self_care_score > 10)) {
      throw new Error('Self-care score must be between 0 and 10');
    }

    const { data: result, error } = await supabase
      .from('weekly_checkins')
      .upsert({
        student_id: studentId,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        week_reflection,
        next_week_intentions,
        self_care_score,
        self_care_reflection,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,week_start_date',
        returning: 'representation'
      })
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return result;
  }

  /**
   * Get weekly check-in for a specific week
   * @param {string} studentId - Student's UUID
   * @param {string} date - Any date within the week (YYYY-MM-DD)
   * @returns {Promise<Object|null>} - Weekly check-in or null
   */
  static async getWeeklyCheckin(studentId, date) {
    const { weekStart } = this.getWeekDates(date);
    
    const { data, error } = await supabase
      .from('weekly_checkins')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_start_date', weekStart)
      .maybeSingle();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get weekly check-ins for a date range
   * @param {string} studentId - Student's UUID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of weekly check-ins
   */
  static async getWeeklyCheckinsRange(studentId, startDate, endDate) {
    const { data, error } = await supabase
      .from('weekly_checkins')
      .select('*')
      .eq('student_id', studentId)
      .gte('week_start_date', startDate)
      .lte('week_end_date', endDate)
      .order('week_start_date', { ascending: false });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data || [];
  }

  /**
   * Delete weekly check-in
   * @param {string} studentId - Student's UUID
   * @param {string} id - Weekly check-in UUID
   * @returns {Promise<void>}
   */
  static async deleteWeeklyCheckin(studentId, id) {
    const { error } = await supabase
      .from('weekly_checkins')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }
  }

  // ==================== WORRIES JOURNAL METHODS ====================

  /**
   * Create a new worry journal entry
   * @param {string} studentId - Student's UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Object} data - Worry journal data
   * @returns {Promise<Object>} - Created worry journal entry
   */
  static async createWorryEntry(studentId, date, data) {
    const {
      whats_on_mind,
      positive_reframe = null,
      is_ai_generated = false
    } = data;

    if (!whats_on_mind || whats_on_mind.trim() === '') {
      throw new Error('Worry content is required');
    }

    const { data: result, error } = await supabase
      .from('worries_journal')
      .insert({
        student_id: studentId,
        date,
        whats_on_mind,
        positive_reframe,
        is_ai_generated
      })
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return result;
  }

  /**
   * Update a worry journal entry
   * @param {string} studentId - Student's UUID
   * @param {string} id - Worry entry UUID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} - Updated worry journal entry
   */
  static async updateWorryEntry(studentId, id, data) {
    const updateData = {};
    
    if (data.whats_on_mind !== undefined) {
      updateData.whats_on_mind = data.whats_on_mind;
    }
    if (data.positive_reframe !== undefined) {
      updateData.positive_reframe = data.positive_reframe;
    }
    if (data.is_ai_generated !== undefined) {
      updateData.is_ai_generated = data.is_ai_generated;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data: result, error } = await supabase
      .from('worries_journal')
      .update(updateData)
      .eq('id', id)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return result;
  }

  /**
   * Get worry entries for a specific date
   * @param {string} studentId - Student's UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of worry entries
   */
  static async getWorryEntriesByDate(studentId, date) {
    const { data, error } = await supabase
      .from('worries_journal')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data || [];
  }

  /**
   * Get worry entries for a date range
   * @param {string} studentId - Student's UUID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of worry entries
   */
  static async getWorryEntriesRange(studentId, startDate, endDate) {
    const { data, error } = await supabase
      .from('worries_journal')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data || [];
  }

  /**
   * Get a specific worry entry
   * @param {string} studentId - Student's UUID
   * @param {string} id - Worry entry UUID
   * @returns {Promise<Object|null>} - Worry entry or null
   */
  static async getWorryEntry(studentId, id) {
    const { data, error } = await supabase
      .from('worries_journal')
      .select('*')
      .eq('id', id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Delete worry entry
   * @param {string} studentId - Student's UUID
   * @param {string} id - Worry entry UUID
   * @returns {Promise<void>}
   */
  static async deleteWorryEntry(studentId, id) {
    const { error } = await supabase
      .from('worries_journal')
      .delete()
      .eq('id', id)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }
  }

  // ==================== COMBINED METHODS ====================

  /**
   * Get all journal entries for a specific date
   * Includes daily check-in, weekly check-in (if applicable), and worry entries
   * @param {string} studentId - Student's UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} - Combined journal data for the date
   */
  static async getJournalEntriesByDate(studentId, date) {
    const [dailyCheckin, weeklyCheckin, worryEntries] = await Promise.all([
      this.getDailyCheckin(studentId, date),
      this.getWeeklyCheckin(studentId, date),
      this.getWorryEntriesByDate(studentId, date)
    ]);

    return {
      date,
      daily_checkin: dailyCheckin,
      weekly_checkin: weeklyCheckin,
      worries: worryEntries
    };
  }

  /**
   * Get all journal entries for a date range
   * @param {string} studentId - Student's UUID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} - Combined journal data for the range
   */
  static async getJournalEntriesRange(studentId, startDate, endDate) {
    const [dailyCheckins, weeklyCheckins, worryEntries] = await Promise.all([
      this.getDailyCheckinsRange(studentId, startDate, endDate),
      this.getWeeklyCheckinsRange(studentId, startDate, endDate),
      this.getWorryEntriesRange(studentId, startDate, endDate)
    ]);

    return {
      start_date: startDate,
      end_date: endDate,
      daily_checkins: dailyCheckins,
      weekly_checkins: weeklyCheckins,
      worries: worryEntries
    };
  }

  /**
   * Get journal statistics for a student
   * @param {string} studentId - Student's UUID
   * @returns {Promise<Object>} - Journal statistics
   */
  static async getJournalStats(studentId) {
    const [dailyCount, weeklyCount, worriesCount] = await Promise.all([
      supabase
        .from('daily_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      supabase
        .from('weekly_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      supabase
        .from('worries_journal')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
    ]);

    return {
      total_daily_checkins: dailyCount.count || 0,
      total_weekly_checkins: weeklyCount.count || 0,
      total_worry_entries: worriesCount.count || 0
    };
  }
}
