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
          name,
          code,
          address
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
    console.error('❌ Get counsellor profile error:', error);
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
    console.error('❌ Update counsellor profile error:', error);
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
    console.error('❌ Get counsellor students error:', error);
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