import { supabase } from "../config/supabase.js";
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  paginatedResponse,
  formatSupabaseError 
} from "../utils/response.js";
import { applyTenantFilter } from "../middleware/tenant.js";

//////////////////////// STUDENT PROFILE MANAGEMENT /////////////////////////////

// Get student profile
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
    console.error('Get student profile error:', error);
    return errorResponse(res, 'Failed to get profile', 500);
  }
};

// Update student profile
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
    console.error('Update student profile error:', error);
    return errorResponse(res, 'Failed to update profile', 500);
  }
};


///////////////////// APPOINTMENT MANAGEMENT /////////////////////////

/**
 * Book an appointment
 */
export const bookAppointment = async (req, res) => {
  try {
    const { counsellor_id, date, notes } = req.body;
    const startTime = req.body.start_time || req.body.time;

    if (!startTime) {
      return errorResponse(res, 'start_time (or time) is required', 400);
    }

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
      .eq('start_time', startTime)
      .in('status', ['pending', 'confirmed'])
      .single();

    if (conflict) {
      return errorResponse(res, 'Time slot not available', 409);
    }

    // Create appointment (avoid relational select to handle missing FK relationships)
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        student_id: req.user.user_id,
        counsellor_id,
        college_id: req.tenant,
        date,
        start_time: startTime,
        notes,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id, date, start_time, status, notes, created_at, counsellor_id')
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const responsePayload = {
      ...data,
      counsellor: {
        id: counsellor.id,
        name: counsellor.name,
        email: counsellor.email
      }
    };

    return successResponse(res, responsePayload, 'Appointment booked successfully', 201);
  } catch (error) {
    console.error('Book appointment error:', error);
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
    console.error('Get college counsellors availability error:', error);
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
        counsellor_id,
        date,
        start_time,
        status,
        notes,
        student_intent
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

    const appointments = data || [];
    const counsellorIds = [...new Set(appointments.map(a => a.counsellor_id).filter(Boolean))];

    const counsellorMap = {};
    const specializationMap = {};

    if (counsellorIds.length > 0) {
      const { data: counsellorProfiles, error: counsellorProfilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('college_id', req.tenant)
        .in('id', counsellorIds);

      if (counsellorProfilesError) {
        const formattedError = formatSupabaseError(counsellorProfilesError);
        return errorResponse(res, formattedError.message, 400);
      }

      (counsellorProfiles || []).forEach(c => {
        counsellorMap[c.id] = c;
      });

      const { data: counsellorDetails, error: counsellorDetailsError } = await supabase
        .from('counsellors')
        .select('id, specialization')
        .in('id', counsellorIds);

      if (counsellorDetailsError) {
        const formattedError = formatSupabaseError(counsellorDetailsError);
        return errorResponse(res, formattedError.message, 400);
      }

      (counsellorDetails || []).forEach(detail => {
        specializationMap[detail.id] = detail.specialization;
      });
    }

    const mapped = appointments.map(appt => {
      const counsellor = counsellorMap[appt.counsellor_id];
      return {
        id: appt.id,
        student_id: appt.student_id,
        date: appt.date,
        time: appt.start_time,
        status: appt.status,
        counsellor: counsellor
          ? {
              id: counsellor.id,
              name: counsellor.name,
              email: counsellor.email,
              specialization: specializationMap[counsellor.id] || null
            }
          : null,
        purpose: appt.student_intent || appt.notes || null
      };
    });

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
      .select('id, counsellor_id, date, start_time, notes, session_goals')
      .eq('student_id', req.user.user_id)
      .eq('college_id', req.tenant)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const completed = data || [];
    const counsellorIds = [...new Set(completed.map(s => s.counsellor_id).filter(Boolean))];

    const counsellorMap = {};
    const specializationMap = {};

    if (counsellorIds.length > 0) {
      const { data: counsellorProfiles, error: counsellorProfilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('college_id', req.tenant)
        .in('id', counsellorIds);

      if (counsellorProfilesError) {
        const formattedError = formatSupabaseError(counsellorProfilesError);
        return errorResponse(res, formattedError.message, 400);
      }

      (counsellorProfiles || []).forEach(c => {
        counsellorMap[c.id] = c;
      });

      const { data: counsellorDetails, error: counsellorDetailsError } = await supabase
        .from('counsellors')
        .select('id, specialization')
        .in('id', counsellorIds);

      if (counsellorDetailsError) {
        const formattedError = formatSupabaseError(counsellorDetailsError);
        return errorResponse(res, formattedError.message, 400);
      }

      (counsellorDetails || []).forEach(detail => {
        specializationMap[detail.id] = detail.specialization;
      });
    }

    const sessions = completed.map(session => {
      const counsellor = counsellorMap[session.counsellor_id];
      return {
        id: session.id,
        date: session.date,
        time: session.start_time,
        counsellor: counsellor
          ? {
              id: counsellor.id,
              name: counsellor.name,
              email: counsellor.email,
              specialization: specializationMap[counsellor.id] || null
            }
          : null,
        session_notes: session.notes || null,
        session_goals: session.session_goals || []
      };
    });

    return successResponse(res, sessions, 'Sessions summary retrieved successfully');
  } catch (error) {
    console.error('Get sessions summary error:', error);
    return errorResponse(res, 'Failed to get sessions summary', 500);
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
    console.error('Get student communities error:', error);
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
    console.error('Join community error:', error);
    return errorResponse(res, 'Failed to join community', 500);
  }
};


///////////////////// MESSAGING /////////////////////////

/**
 * Get all counsellors from student's college for messaging
 * Route: GET /api/student/counsellors-for-messaging
 * Returns: List of counsellors with basic details (id, name, email, avatar_url, bio, phone, specialization)
 */
export const getCollegeCounsellorsForMessaging = async (req, res) => {
  try {
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
      .eq('college_id', req.tenant)
      .order('name', { ascending: true });

    if (counsellorsError) {
      const formattedError = formatSupabaseError(counsellorsError);
      return errorResponse(res, formattedError.message, 400);
    }

    if (!counsellors || counsellors.length === 0) {
      return successResponse(res, [], 'No counsellors found for this college');
    }

    // Format the response
    const result = counsellors.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      avatar_url: c.avatar_url,
      bio: c.bio,
      phone: c.phone,
      specialization: c.counsellors?.specialization || null
    }));

    return successResponse(res, result, 'Counsellors retrieved successfully');
  } catch (error) {
    console.error('Get college counsellors for messaging error:', error);
    return errorResponse(res, 'Failed to get counsellors', 500);
  }
};

//////////////////////// REALTIME VOICE SESSION /////////////////////////////

/**
 * Create OpenAI Realtime Voice Session
 * POST /api/student/realtime-session
 * Returns ephemeral session token for WebRTC connection
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
    console.log(`Realtime voice session created for user: ${req.user.user_id}`);

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