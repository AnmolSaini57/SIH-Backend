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
 * Get assigned students
 */
export const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('counsellor_students')
      .select(`
        id,
        assigned_at,
        status,
        notes,
        student:student_id (
          id,
          name,
          email,
          avatar_url,
          created_at,
          assessment_submissions (
            id,
            score,
            severity,
            created_at,
            assessment_forms (
              name,
              title
            )
          )
        )
      `, { count: 'exact' })
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant);

    if (search) {
      query = query.ilike('student.name', `%${search}%`);
    }

    const { data, error, count } = await query
      .order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('Get counsellor students error:', error);
    return errorResponse(res, 'Failed to get students', 500);
  }
};

/**
 * Get student details for counsellor
 */
export const getStudentDetails = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Verify this student is assigned to this counsellor
    const { data: assignment, error: assignmentError } = await supabase
      .from('counsellor_students')
      .select('id')
      .eq('counsellor_id', req.user.user_id)
      .eq('student_id', student_id)
      .eq('college_id', req.tenant)
      .single();

    if (assignmentError || !assignment) {
      return notFoundResponse(res, 'Student assignment');
    }

    // Get comprehensive student information
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        avatar_url,
        phone,
        bio,
        created_at,
        assessment_submissions (
          id,
          form_id,
          score,
          severity,
          created_at,
          assessment_forms (
            name,
            title,
            description
          )
        ),
        appointments (
          id,
          date,
          time,
          status,
          type,
          notes,
          feedback,
          created_at
        ),
        session_notes (
          id,
          content,
          created_at,
          counsellor:created_by (
            name
          )
        )
      `)
      .eq('id', student_id)
      .eq('college_id', req.tenant)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 404);
    }

    return successResponse(res, data, 'Student details retrieved successfully');
  } catch (error) {
    console.error('❌ Get student details error:', error);
    return errorResponse(res, 'Failed to get student details', 500);
  }
};

/**
 * Get counsellor's appointments
 */
export const getAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        type,
        notes,
        feedback,
        created_at,
        updated_at,
        student:student_id (
          id,
          name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant);

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error, count } = await query
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('❌ Get counsellor appointments error:', error);
    return errorResponse(res, 'Failed to get appointments', 500);
  }
};

/**
 * Update appointment status
 */
export const updateAppointment = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    // Verify appointment belongs to this counsellor
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointment_id)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .select(`
        id,
        date,
        time,
        status,
        type,
        notes,
        feedback,
        updated_at,
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

    return successResponse(res, data, 'Appointment updated successfully');
  } catch (error) {
    console.error('❌ Update appointment error:', error);
    return errorResponse(res, 'Failed to update appointment', 500);
  }
};

/**
 * Add session notes
 */
export const addSessionNote = async (req, res) => {
  try {
    const { student_id, content, session_date, appointment_id } = req.body;

    // Verify student is assigned to this counsellor
    const { data: assignment, error: assignmentError } = await supabase
      .from('counsellor_students')
      .select('id')
      .eq('counsellor_id', req.user.user_id)
      .eq('student_id', student_id)
      .eq('college_id', req.tenant)
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(res, 'Student not assigned to you', 403);
    }

    // Create session note
    const { data, error } = await supabase
      .from('session_notes')
      .insert({
        student_id,
        counsellor_id: req.user.user_id,
        college_id: req.tenant,
        content,
        session_date: session_date || new Date().toISOString(),
        appointment_id,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        content,
        session_date,
        created_at,
        student:student_id (
          name
        )
      `)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Session note added successfully', 201);
  } catch (error) {
    console.error('❌ Add session note error:', error);
    return errorResponse(res, 'Failed to add session note', 500);
  }
};

/**
 * Get session notes for a student
 */
export const getSessionNotes = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verify student is assigned to this counsellor
    const { data: assignment, error: assignmentError } = await supabase
      .from('counsellor_students')
      .select('id')
      .eq('counsellor_id', req.user.user_id)
      .eq('student_id', student_id)
      .eq('college_id', req.tenant)
      .single();

    if (assignmentError || !assignment) {
      return errorResponse(res, 'Student not assigned to you', 403);
    }

    const { data, error, count } = await supabase
      .from('session_notes')
      .select(`
        id,
        content,
        session_date,
        created_at,
        appointment_id,
        counsellor:counsellor_id (
          name
        )
      `, { count: 'exact' })
      .eq('student_id', student_id)
      .eq('college_id', req.tenant)
      .order('session_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('❌ Get session notes error:', error);
    return errorResponse(res, 'Failed to get session notes', 500);
  }
};

/**
 * Get counsellor resources
 */
export const getResources = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('counsellor_resources')
      .select(`
        id,
        title,
        description,
        category,
        file_url,
        file_type,
        tags,
        created_at,
        uploaded_by:created_by (
          name
        )
      `, { count: 'exact' })
      .eq('college_id', req.tenant)
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('❌ Get counsellor resources error:', error);
    return errorResponse(res, 'Failed to get resources', 500);
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
    console.error('❌ Get counsellor dashboard stats error:', error);
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
      .select(`
        id,
        date,
        start_time,
        time,
        student_intent,
        notes,
        created_at,
        student:student_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const requests = (data || []).map(appt => ({
      id: appt.id,
      date: appt.date,
      time: appt.start_time || appt.time,
      student: {
        id: appt.student?.id,
        name: appt.student?.name,
        email: appt.student?.email,
        avatar_url: appt.student?.avatar_url
      },
      student_intent: appt.student_intent || appt.notes || null,
      created_at: appt.created_at
    }));

    return successResponse(res, requests, 'Appointment requests retrieved successfully');
  } catch (error) {
    console.error('❌ Get appointment requests error:', error);
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

    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'pending') // Only accept if currently pending
      .select(`
        id,
        date,
        start_time,
        time,
        status,
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
      return notFoundResponse(res, 'Appointment request');
    }

    return successResponse(res, data, 'Appointment request accepted successfully');
  } catch (error) {
    console.error('❌ Accept appointment request error:', error);
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

    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment_id)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'pending') // Only decline if currently pending
      .select(`
        id,
        date,
        start_time,
        time,
        status,
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
      return notFoundResponse(res, 'Appointment request');
    }

    return successResponse(res, data, 'Appointment request declined successfully');
  } catch (error) {
    console.error('❌ Decline appointment request error:', error);
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
    console.error('❌ Add availability error:', error);
    return errorResponse(res, 'Failed to add availability', 500);
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
      .select(`
        id,
        date,
        start_time,
        time,
        status,
        notes,
        student_intent,
        student:student_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const sessions = (data || []).map(session => ({
      id: session.id,
      date: session.date,
      time: session.start_time || session.time,
      status: session.status,
      student: {
        id: session.student?.id,
        name: session.student?.name,
        email: session.student?.email,
        avatar_url: session.student?.avatar_url
      },
      purpose: session.student_intent || session.notes || null
    }));

    return successResponse(res, sessions, 'Sessions retrieved successfully');
  } catch (error) {
    console.error('❌ Get sessions error:', error);
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
      .select(`
        id,
        date,
        start_time,
        time,
        notes,
        session_goals,
        student:student_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('counsellor_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const summary = (data || []).map(session => ({
      id: session.id,
      date: session.date,
      time: session.start_time || session.time,
      student: {
        id: session.student?.id,
        name: session.student?.name,
        email: session.student?.email,
        avatar_url: session.student?.avatar_url
      },
      session_notes: session.notes || null,
      session_goals: session.session_goals || []
    }));

    return successResponse(res, summary, 'Sessions summary retrieved successfully');
  } catch (error) {
    console.error('❌ Get sessions summary error:', error);
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
        time,
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
    console.error('❌ Update session notes and goals error:', error);
    return errorResponse(res, 'Failed to update session notes and goals', 500);
  }
};