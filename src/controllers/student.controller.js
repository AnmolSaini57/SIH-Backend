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
 * Student Controller
 * Handles student-specific operations and data
 */

/**
 * Get student profile
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
    console.error('❌ Get student profile error:', error);
    return errorResponse(res, 'Failed to get profile', 500);
  }
};

/**
 * Update student profile
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
    console.error('❌ Update student profile error:', error);
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

/**
 * Get student's assessment history
 */
export const getAssessments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('assessment_submissions')
      .select(`
        id,
        form_id,
        score,
        severity,
        created_at,
        assessment_forms (
          id,
          name,
          title,
          description
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.user_id);

    // Apply tenant filter
    query = applyTenantFilter(query, req, 'college_id');
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('❌ Get student assessments error:', error);
    return errorResponse(res, 'Failed to get assessments', 500);
  }
};

/**
 * Submit assessment
 */
export const submitAssessment = async (req, res) => {
  try {
    const { form_id, responses, session_id } = req.body;

    // Verify assessment form exists and is available for this college
    const { data: form, error: formError } = await supabase
      .from('assessment_forms')
      .select('id, name, questions')
      .eq('id', form_id)
      .eq('is_active', true)
      .single();

    if (formError || !form) {
      return notFoundResponse(res, 'Assessment form');
    }

    // Calculate score based on responses
    const score = calculateAssessmentScore(form.questions, responses);
    const severity = calculateSeverity(score, form.name);

    // Insert assessment submission
    const { data, error } = await supabase
      .from('assessment_submissions')
      .insert({
        user_id: req.user.user_id,
        college_id: req.tenant,
        form_id,
        session_id,
        responses,
        score,
        severity,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        form_id,
        score,
        severity,
        created_at,
        assessment_forms (
          name,
          title
        )
      `)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    // Get guidance based on score and form type
    const guidance = getAssessmentGuidance(form.name, score, severity);

    return successResponse(res, {
      submission: data,
      guidance
    }, 'Assessment submitted successfully', 201);

  } catch (error) {
    console.error('❌ Submit assessment error:', error);
    return errorResponse(res, 'Failed to submit assessment', 500);
  }
};

/**
 * Get student's communities
 */
export const getCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('community_members')
      .select(`
        id,
        joined_at,
        communities (
          id,
          name,
          description,
          is_private,
          member_count,
          created_at
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.user_id);

    // Apply tenant filter through communities
    query = query.eq('communities.college_id', req.tenant);

    const { data, error, count } = await query
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('❌ Get student communities error:', error);
    return errorResponse(res, 'Failed to get communities', 500);
  }
};

/**
 * Join a community
 */
export const joinCommunity = async (req, res) => {
  try {
    const { community_id } = req.params;

    // Verify community exists and belongs to same college
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, is_private, member_count')
      .eq('id', community_id)
      .eq('college_id', req.tenant)
      .single();

    if (communityError || !community) {
      return notFoundResponse(res, 'Community');
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community_id)
      .eq('user_id', req.user.user_id)
      .single();

    if (existingMember) {
      return errorResponse(res, 'Already a member of this community', 409);
    }

    // Join community
    const { data, error } = await supabase
      .from('community_members')
      .insert({
        community_id,
        user_id: req.user.user_id,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    // Update community member count
    await supabase
      .from('communities')
      .update({ 
        member_count: community.member_count + 1 
      })
      .eq('id', community_id);

    return successResponse(res, data, `Joined ${community.name} successfully`, 201);
  } catch (error) {
    console.error('❌ Join community error:', error);
    return errorResponse(res, 'Failed to join community', 500);
  }
};

/**
 * Get student's appointments
 */
export const getAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
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
        counsellor:counsellor_id (
          id,
          name,
          email,
          phone
        )
      `, { count: 'exact' })
      .eq('student_id', req.user.user_id)
      .eq('college_id', req.tenant);

    if (status) {
      query = query.eq('status', status);
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
    console.error('❌ Get student appointments error:', error);
    return errorResponse(res, 'Failed to get appointments', 500);
  }
};

/**
 * Book an appointment
 */
export const bookAppointment = async (req, res) => {
  try {
    const { counsellor_id, date, time, type, notes } = req.body;

    // Verify counsellor exists and belongs to same college
    const { data: counsellor, error: counsellorError } = await supabase
      .from('profiles')
      .select('id, name, college_id')
      .eq('id', counsellor_id)
      .eq('role', 'counsellor')
      .eq('college_id', req.tenant)
      .single();

    if (counsellorError || !counsellor) {
      return notFoundResponse(res, 'Counsellor');
    }

    // Check for scheduling conflicts
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('counsellor_id', counsellor_id)
      .eq('date', date)
      .eq('time', time)
      .in('status', ['pending', 'confirmed'])
      .single();

    if (conflict) {
      return errorResponse(res, 'Time slot not available', 409);
    }

    // Create appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        student_id: req.user.user_id,
        counsellor_id,
        college_id: req.tenant,
        date,
        time,
        type,
        notes,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        date,
        time,
        status,
        type,
        notes,
        created_at,
        counsellor:counsellor_id (
          name,
          email
        )
      `)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Appointment booked successfully', 201);
  } catch (error) {
    console.error('❌ Book appointment error:', error);
    return errorResponse(res, 'Failed to book appointment', 500);
  }
};

/**
 * Get all counsellors of the student's college with availability for a given date
 * Query param: date=YYYY-MM-DD (required)
 * Optional: specialization filter later (not implemented now)
 */
export const getCollegeCounsellorsWithAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return errorResponse(res, 'date query parameter is required (YYYY-MM-DD)', 400);
    }

    // Get all counsellors in this college
    const { data: counsellors, error: counsellorsError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        avatar_url,
        bio,
        phone,
        counsellors (
          specialization
        )
      `)
      .eq('role', 'counsellor')
      .eq('college_id', req.tenant);

    if (counsellorsError) {
      const formattedError = formatSupabaseError(counsellorsError);
      return errorResponse(res, formattedError.message, 400);
    }

    if (!counsellors || counsellors.length === 0) {
      return successResponse(res, [], 'No counsellors found for this college');
    }

    const counsellorIds = counsellors.map(c => c.id);

    // Fetch availability rows for the specified date
    const { data: availability, error: availabilityError } = await supabase
      .from('counsellor_availability')
      .select('id, counsellor_id, start_time')
      .eq('date', date)
      .eq('college_id', req.tenant)
      .eq('is_active', true)
      .in('counsellor_id', counsellorIds);

    if (availabilityError) {
      const formattedError = formatSupabaseError(availabilityError);
      return errorResponse(res, formattedError.message, 400);
    }

    // Fetch booked appointments (pending or confirmed) to exclude those slots
    const { data: booked, error: bookedError } = await supabase
      .from('appointments')
      .select('counsellor_id, start_time')
      .eq('date', date)
      .eq('college_id', req.tenant)
      .in('status', ['pending', 'confirmed'])
      .in('counsellor_id', counsellorIds);

    if (bookedError) {
      const formattedError = formatSupabaseError(bookedError);
      return errorResponse(res, formattedError.message, 400);
    }

    const bookedMap = new Set(
      (booked || []).map(b => `${b.counsellor_id}|${b.start_time}`)
    );

    // Group availability by counsellor and filter out booked times
    const availabilityByCounsellor = {};
    (availability || []).forEach(slot => {
      const key = slot.counsellor_id;
      if (!availabilityByCounsellor[key]) availabilityByCounsellor[key] = [];
      const composite = `${slot.counsellor_id}|${slot.start_time}`;
      if (!bookedMap.has(composite)) {
        availabilityByCounsellor[key].push({
          availability_id: slot.id,
          start_time: slot.start_time
        });
      }
    });

    // Build final response array
    const result = counsellors.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      avatar_url: c.avatar_url,
      bio: c.bio,
      phone: c.phone,
      specialization: c.counsellors?.specialization || null,
      date,
      available_slots: availabilityByCounsellor[c.id] || []
    }));

    return successResponse(res, result, 'Counsellors with availability retrieved successfully');
  } catch (error) {
    console.error('❌ Get college counsellors availability error:', error);
    return errorResponse(res, 'Failed to get counsellors availability', 500);
  }
};

/**
 * Get all appointments for the logged-in student (no pagination)
 * Route: GET /api/student/my-appointments
 * Optional query: status=pending|confirmed|completed|cancelled
 * Returns: id, student_id, date, time/start_time, status, counsellor name, specialization, purpose
 */
export const getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        student_id,
        date,
        start_time,
        time,
        status,
        notes,
        student_intent,
        counsellor:counsellor_id (
          id,
          name,
          email,
          counsellors (
            specialization
          )
        )
      `)
      .eq('student_id', req.user.user_id)
      .eq('college_id', req.tenant);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const mapped = (data || []).map(appt => ({
      id: appt.id,
      student_id: appt.student_id,
      date: appt.date,
      time: appt.start_time || appt.time, // support both column names
      status: appt.status,
      counsellor: {
        id: appt.counsellor?.id,
        name: appt.counsellor?.name,
        email: appt.counsellor?.email,
        specialization: appt.counsellor?.counsellors?.specialization || null
      },
      purpose: appt.student_intent || appt.notes || null
    }));

    return successResponse(res, mapped, 'Student appointments retrieved successfully');
  } catch (error) {
    console.error('Get my appointments error:', error);
    return errorResponse(res, 'Failed to get appointments', 500);
  }
};

/**
 * Get sessions summary for the logged-in student (completed appointments only)
 * Route: GET /api/student/sessions-summary
 * Returns: date, time, counsellor name, specialization, session_notes, session_goals
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
        counsellor:counsellor_id (
          id,
          name,
          email,
          counsellors (
            specialization
          )
        )
      `)
      .eq('student_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'completed')
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
      counsellor: {
        id: session.counsellor?.id,
        name: session.counsellor?.name,
        email: session.counsellor?.email,
        specialization: session.counsellor?.counsellors?.specialization || null
      },
      session_notes: session.notes || null,
      session_goals: session.session_goals || []
    }));

    return successResponse(res, sessions, 'Sessions summary retrieved successfully');
  } catch (error) {
    console.error('❌ Get sessions summary error:', error);
    return errorResponse(res, 'Failed to get sessions summary', 500);
  }
};

// Helper functions
function calculateAssessmentScore(questions, responses) {
  let totalScore = 0;
  
  questions.forEach(question => {
    const response = responses[question.id];
    if (response !== undefined && response !== null) {
      totalScore += parseInt(response) || 0;
    }
  });

  return totalScore;
}

function calculateSeverity(score, formName) {
  // Different thresholds for different assessment types
  const thresholds = {
    'PHQ-9': { mild: 5, moderate: 10, severe: 15 },
    'GAD-7': { mild: 5, moderate: 10, severe: 15 },
    'GHQ-12': { mild: 4, moderate: 8, severe: 12 }
  };

  const threshold = thresholds[formName] || thresholds['PHQ-9'];

  if (score < threshold.mild) return 'minimal';
  if (score < threshold.moderate) return 'mild';
  if (score < threshold.severe) return 'moderate';
  return 'severe';
}

function getAssessmentGuidance(formName, score, severity) {
  const guidance = {
    minimal: {
      message: "Your responses suggest minimal symptoms. Keep up the good work!",
      recommendations: [
        "Continue maintaining healthy habits",
        "Stay connected with friends and family",
        "Consider regular exercise and good sleep hygiene"
      ]
    },
    mild: {
      message: "Your responses suggest mild symptoms that may benefit from attention.",
      recommendations: [
        "Consider speaking with a counsellor",
        "Try stress management techniques",
        "Maintain regular routines",
        "Connect with support groups"
      ]
    },
    moderate: {
      message: "Your responses suggest moderate symptoms. Professional support may be helpful.",
      recommendations: [
        "Schedule an appointment with a counsellor",
        "Consider therapy or counseling sessions",
        "Reach out to trusted friends or family",
        "Practice mindfulness and relaxation techniques"
      ]
    },
    severe: {
      message: "Your responses suggest significant symptoms. Professional help is strongly recommended.",
      recommendations: [
        "Contact a mental health professional immediately",
        "Reach out to crisis support if needed",
        "Don't hesitate to seek emergency help if you're in crisis",
        "Connect with immediate support systems"
      ]
    }
  };

  return guidance[severity] || guidance.mild;
}