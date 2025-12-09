import { supabase } from "../config/supabase.js";
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  paginatedResponse,
  formatSupabaseError 
} from "../utils/response.js";
import { applyTenantFilter } from "../middleware/tenant.js";

/**
 * Counsellor Controller
 * Handles counsellor-specific operations and student management
 */

/**
 * Get counsellor profile
 */
export const getProfile = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        college_id,
        avatar_url,
        phone,
        bio,
        specialization,
        years_experience,
        qualifications,
        availability_schedule,
        created_at,
        updated_at,
        colleges (
          id,
          name
        )
      `)
      .eq('id', req.user.user_id)
      .eq('college_id', req.tenant)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 404);
    }

    return successResponse(res, data, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get counsellor profile error:', error);
    return errorResponse(res, 'Failed to get profile', 500);
  }
};

/**
 * Update counsellor profile
 */
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    // Remove sensitive fields
    delete updates.id;
    delete updates.email;
    delete updates.role;
    delete updates.college_id;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.user_id)
      .eq('college_id', req.tenant)
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Profile updated successfully');
  } catch (error) {
    console.error('Update counsellor profile error:', error);
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

/**
 * Get counsellor dashboard stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get various statistics for the counsellor's dashboard
    const [
      { count: totalStudents },
      { count: pendingAppointments },
      { count: todayAppointments },
      { count: totalSessions }
    ] = await Promise.all([
      supabase
        .from('counsellor_students')
        .select('*', { count: 'exact', head: true })
        .eq('counsellor_id', req.user.user_id)
        .eq('college_id', req.tenant)
        .eq('status', 'active'),
      
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('counsellor_id', req.user.user_id)
        .eq('college_id', req.tenant)
        .eq('status', 'pending'),
      
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('counsellor_id', req.user.user_id)
        .eq('college_id', req.tenant)
        .eq('date', new Date().toISOString().split('T')[0]),
      
      supabase
        .from('session_notes')
        .select('*', { count: 'exact', head: true })
        .eq('counsellor_id', req.user.user_id)
        .eq('college_id', req.tenant)
    ]);

    // Get recent appointments
    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        type,
        student:student_id (
          name,
          avatar_url
        )
      `)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(5);

    const stats = {
      totalStudents,
      pendingAppointments,
      todayAppointments,
      totalSessions,
      recentAppointments: recentAppointments || []
    };

    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    console.error('Get counsellor dashboard stats error:', error);
    return errorResponse(res, 'Failed to get dashboard stats', 500);
  }
};

/**
 * Get appointment requests (pending appointments) for the counsellor
 * Route: GET /api/counsellor/appointment-requests
 * Returns: pending appointments with date, time, student name, student_intent
 */
export const getAppointmentRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, date, start_time, notes, student_intent, created_at, student_id, status')
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const appointments = data || [];
    const studentIds = [...new Set(appointments.map(a => a.student_id).filter(Boolean))];

    const studentMap = {};
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('college_id', req.tenant)
        .in('id', studentIds);

      if (studentsError) {
        const formattedError = formatSupabaseError(studentsError);
        return errorResponse(res, formattedError.message, 400);
      }

      (students || []).forEach(s => {
        studentMap[s.id] = s;
      });
    }

    const requests = appointments.map(appt => ({
      id: appt.id,
      date: appt.date,
      time: appt.start_time,
      status: appt.status,
      student: studentMap[appt.student_id] || null,
      student_intent: appt.notes || appt.student_intent || null,
      notes: appt.notes || appt.student_intent || null,
      created_at: appt.created_at
    }));

    return successResponse(res, requests, 'Appointment requests retrieved successfully');
  } catch (error) {
    console.error('Get appointment requests error:', error);
    return errorResponse(res, 'Failed to get appointment requests', 500);
  }
};

/**
 * Accept an appointment request
 * Route: PUT /api/counsellor/appointment-requests/:appointment_id/accept
 * Updates status from 'pending' to 'confirmed'
 */
export const acceptAppointmentRequest = async (req, res) => {
  try {
    const { appointment_id } = req.params;

    // First check if appointment exists and is pending
    const { data: existing, error: checkError } = await supabase
      .from('appointments')
      .select('id, status, counsellor_id, college_id, date, start_time')
      .eq('id', appointment_id)
      .single();

    if (checkError || !existing) {
      return notFoundResponse(res, 'Appointment');
    }

    if (existing.status !== 'pending') {
      return errorResponse(res, `Appointment is not pending (status: ${existing.status}). Cannot accept.`, 400);
    }

    if (existing.counsellor_id !== req.user.user_id) {
      return errorResponse(res, 'You are not the counsellor for this appointment', 403);
    }

    if (existing.college_id !== req.tenant) {
      return errorResponse(res, 'Appointment does not belong to your college', 403);
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)
      .select('id, date, start_time, status, student_id')
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    // Delete the matching availability slot from counsellor_availability
    // Match by date and start_time
    if (existing.date && existing.start_time) {
      const { error: deleteError } = await supabase
        .from('counsellor_availability')
        .delete()
        .eq('counsellor_id', req.user.user_id)
        .eq('college_id', req.tenant)
        .eq('date', existing.date)
        .eq('start_time', existing.start_time);

      if (deleteError) {
        console.warn('Warning: Failed to delete availability slot:', deleteError);
        // Don't fail the appointment acceptance if slot deletion fails
        // The appointment is already confirmed, which is the critical action
      }
    }

    // Fetch student info separately
    if (data.student_id) {
      const { data: student } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', data.student_id)
        .single();
      
      if (student) {
        data.student = student;
      }
    }

    return successResponse(res, data, 'Appointment request accepted successfully');
  } catch (error) {
    console.error('Accept appointment request error:', error);
    return errorResponse(res, 'Failed to accept appointment request', 500);
  }
};

/**
 * Decline an appointment request
 * Route: PUT /api/counsellor/appointment-requests/:appointment_id/decline
 * Updates status from 'pending' to 'cancelled'
 */
export const declineAppointmentRequest = async (req, res) => {
  try {
    const { appointment_id } = req.params;

    // First check if appointment exists and is pending
    const { data: existing, error: checkError } = await supabase
      .from('appointments')
      .select('id, status, counsellor_id, college_id')
      .eq('id', appointment_id)
      .single();

    if (checkError || !existing) {
      return notFoundResponse(res, 'Appointment');
    }

    if (existing.status !== 'pending') {
      return errorResponse(res, `Appointment is not pending (status: ${existing.status}). Cannot decline.`, 400);
    }

    if (existing.counsellor_id !== req.user.user_id) {
      return errorResponse(res, 'You are not the counsellor for this appointment', 403);
    }

    if (existing.college_id !== req.tenant) {
      return errorResponse(res, 'Appointment does not belong to your college', 403);
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)
      .select('id, date, start_time, status, student_id')
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Appointment request declined successfully');
  } catch (error) {
    console.error('Decline appointment request error:', error);
    return errorResponse(res, 'Failed to decline appointment request', 500);
  }
};

/**
 * Add availability slot for counsellor
 * Route: POST /api/counsellor/manage-availability
 * Body: { date, start_time }
 */
export const addAvailability = async (req, res) => {
  try {
    const { date, start_time } = req.body;

    // Check if this slot already exists
    const { data: existing } = await supabase
      .from('counsellor_availability')
      .select('id')
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('date', date)
      .eq('start_time', start_time)
      .single();

    if (existing) {
      return errorResponse(res, 'Availability slot already exists for this date and time', 409);
    }

    const { data, error } = await supabase
      .from('counsellor_availability')
      .insert({
        counsellor_id: req.user.user_id,
        college_id: req.tenant,
        date,
        start_time,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Availability added successfully', 201);
  } catch (error) {
    console.error('Add availability error:', error);
    return errorResponse(res, 'Failed to add availability', 500);
  }
};

/**
 * Get availability slots for counsellor
 * Route: GET /api/counsellor/manage-availability
 * Optional query: date (YYYY-MM-DD)
 */
export const getAvailability = async (req, res) => {
  try {
    const { date } = req.query;

    let query = supabase
      .from('counsellor_availability')
      .select('id, date, start_time, is_active, created_at')
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Availability retrieved successfully');
  } catch (error) {
    console.error('Get availability error:', error);
    return errorResponse(res, 'Failed to get availability', 500);
  }
};

/**
 * Delete an availability slot
 * Route: DELETE /api/counsellor/manage-availability/:availability_id
 */
export const deleteAvailability = async (req, res) => {
  try {
    const { availability_id } = req.params;

    // Ensure the slot belongs to the counsellor and college
    const { error } = await supabase
      .from('counsellor_availability')
      .delete()
      .eq('id', availability_id)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, null, 'Availability deleted successfully');
  } catch (error) {
    console.error('Delete availability error:', error);
    return errorResponse(res, 'Failed to delete availability', 500);
  }
};

/**
 * Get all sessions (appointments) for the counsellor
 * Route: GET /api/counsellor/sessions
 * Optional query: status filter
 * Returns: id, date, time, status, student name, purpose
 */
export const getSessions = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('appointments')
      .select('id, date, start_time, status, notes, student_id, created_at, updated_at')
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant);

    // Filter by status if provided, otherwise show confirmed and completed
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['confirmed', 'completed']);
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('start_time', { ascending: true });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const appointments = data || [];
    const studentIds = [...new Set(appointments.map(a => a.student_id).filter(Boolean))];

    const studentMap = {};
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('college_id', req.tenant)
        .in('id', studentIds);

      if (studentsError) {
        const formattedError = formatSupabaseError(studentsError);
        return errorResponse(res, formattedError.message, 400);
      }

      (students || []).forEach(s => {
        studentMap[s.id] = s;
      });
    }

    const sessions = appointments.map(session => ({
      id: session.id,
      date: session.date,
      start_time: session.start_time,
      time: session.start_time,
      status: session.status,
      student: studentMap[session.student_id] || null,
      student_id: session.student_id,
      notes: session.notes || null,
      student_intent: session.notes || null,
      created_at: session.created_at,
      updated_at: session.updated_at
    }));

    return successResponse(res, sessions, 'Sessions retrieved successfully');
  } catch (error) {
    console.error('Get sessions error:', error);
    return errorResponse(res, 'Failed to get sessions', 500);
  }
};

/**
 * Get sessions summary for the counsellor (completed appointments only)
 * Route: GET /api/counsellor/sessions-summary
 * Returns: date, time, student name, session_notes, session_goals
 */
export const getSessionsSummary = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, date, start_time, notes, session_goals, student_id')
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .order('start_time', { ascending: true });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const completed = data || [];
    const studentIds = [...new Set(completed.map(s => s.student_id).filter(Boolean))];

    const studentMap = {};
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('college_id', req.tenant)
        .in('id', studentIds);

      if (studentsError) {
        const formattedError = formatSupabaseError(studentsError);
        return errorResponse(res, formattedError.message, 400);
      }

      (students || []).forEach(s => {
        studentMap[s.id] = s;
      });
    }

    const summary = completed.map(session => ({
      id: session.id,
      date: session.date,
      time: session.start_time,
      student: studentMap[session.student_id] || null,
      session_notes: session.notes || null,
      session_goals: session.session_goals || []
    }));

    return successResponse(res, summary, 'Sessions summary retrieved successfully');
  } catch (error) {
    console.error('Get sessions summary error:', error);
    return errorResponse(res, 'Failed to get sessions summary', 500);
  }
};

/**
 * Update session notes and goals for a specific appointment
 * Route: PUT /api/counsellor/sessions-summary/:appointment_id
 * Body: { notes, session_goals }
 */
export const updateSessionNotesAndGoals = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const { notes, session_goals } = req.body;

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (session_goals !== undefined) {
      updates.session_goals = session_goals;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointment_id)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .select(`
        id,
        date,
        start_time,
        status,
        notes,
        session_goals,
        student:student_id (
          name,
          email
        )
      `)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    if (!data) {
      return notFoundResponse(res, 'Appointment');
    }

    return successResponse(res, data, 'Session notes and goals updated successfully');
  } catch (error) {
    console.error('Update session notes and goals error:', error);
    return errorResponse(res, 'Failed to update session notes and goals', 500);
  }
};

/**
 * Create realtime session for voice chat
 */
export const createRealtimeSession = async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // Validate API key is configured
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured in environment variables');
      return errorResponse(
        res, 
        'Voice assistant feature is not configured. Please contact administrator.', 
        503
      );
    }

    // Request ephemeral token from OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy'
      }),
    });

    // Handle OpenAI API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI Realtime API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      return errorResponse(
        res, 
        'Failed to create voice session. Please try again later.', 
        502
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data.client_secret || !data.client_secret.value) {
      console.error('Invalid response from OpenAI Realtime API:', data);
      return errorResponse(
        res, 
        'Invalid session response. Please try again.', 
        500
      );
    }

    // Log session creation (without exposing token)
    console.log(`Realtime voice session created for counsellor: ${req.user.user_id}`);

    return successResponse(
      res, 
      { 
        client_secret: data.client_secret.value,
        expires_at: data.client_secret.expires_at || null
      }, 
      'Voice session created successfully'
    );

  } catch (error) {
    console.error('Create realtime session error:', error);
    
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return errorResponse(
        res, 
        'Unable to reach voice service. Please check your connection.', 
        503
      );
    }

    return errorResponse(
      res, 
      'Failed to create voice session. Please try again.', 
      500
    );
  }
};