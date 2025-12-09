import { supabase } from "../config/supabase.js";
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  paginatedResponse,
  formatSupabaseError 
} from "../utils/response.js";
import {
  calculateAnnouncementExpiry,
  cleanupExpiredAnnouncements,
  getAnnouncementViewStats
} from "../services/announcement.service.js";

/**
 * Admin Controller
 * Handles college-level administration operations
 */

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get various statistics for the admin dashboard
    const [
      { count: totalUsers },
      { count: totalStudents },
      { count: totalCounsellors },
      { count: totalAppointments },
      { count: activeCommunities }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', req.tenant),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', req.tenant)
        .eq('role', 'student'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', req.tenant)
        .eq('role', 'counsellor'),
      
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', req.tenant),
      
      supabase
        .from('communities')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', req.tenant)
        .eq('is_active', true)
    ]);

    const stats = {
      totalUsers,
      totalStudents,
      totalCounsellors,
      totalAppointments,
      activeCommunities
    };

    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    return errorResponse(res, 'Failed to get dashboard stats', 500);
  }
};


/**
 * Create announcement
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, target_role, duration_days } = req.body;

    const nowIso = new Date().toISOString();
    const expiresAt = calculateAnnouncementExpiry(duration_days);

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'info',
        target_role: target_role || 'all',
        duration_days,
        college_id: req.tenant,
        created_by: req.user.user_id,
        expires_at: expiresAt,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso
      })
      .select(`
        id,
        title,
        content,
        type,
        target_role,
        duration_days,
        expires_at,
        is_active,
        created_at,
        created_by:created_by (
          name
        )
      `)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const payload = data ? { ...data, seen_count: 0 } : data;

    return successResponse(res, payload, 'Announcement created successfully', 201);
  } catch (error) {
    console.error('Create announcement error:', error);
    return errorResponse(res, 'Failed to create announcement', 500);
  }
};

/**
 * Get announcements
 */
export const getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_active } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;
    const offset = (pageNumber - 1) * limitNumber;

    // Get current time for filtering expired announcements
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        type,
        target_role,
        duration_days,
        expires_at,
        is_active,
        created_at,
        created_by:created_by (
          name
        )
      `, { count: 'exact' })
      .eq('college_id', req.tenant)
      .gt('expires_at', nowIso);  // Only get announcements that haven't expired yet

    if (type) {
      query = query.eq('type', type);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNumber - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    let viewCounts = {};
    if (data && data.length) {
      try {
        const { counts } = await getAnnouncementViewStats(
          data.map((item) => item.id),
          req.tenant
        );
        viewCounts = counts;
      } catch (viewError) {
        console.error('Get announcement view stats error:', viewError);
      }
    }

    const formatted = (data || []).map((item) => ({
      ...item,
      seen_count: viewCounts[item.id] || 0
    }));

    return paginatedResponse(res, formatted, pageNumber, limitNumber, count);
  } catch (error) {
    console.error('Get announcements error:', error);
    return errorResponse(res, 'Failed to get announcements', 500);
  }
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { announcement_id } = req.params;
    await cleanupExpiredAnnouncements(req.tenant);
    const nowIso = new Date().toISOString();
    const updates = { ...req.body, updated_at: nowIso };

    if (updates.duration_days) {
      updates.expires_at = calculateAnnouncementExpiry(updates.duration_days);
    }

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', announcement_id)
      .eq('college_id', req.tenant)
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    if (!data) {
      return notFoundResponse(res, 'Announcement');
    }

    return successResponse(res, data, 'Announcement updated successfully');
  } catch (error) {
    console.error('Update announcement error:', error);
    return errorResponse(res, 'Failed to update announcement', 500);
  }
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { announcement_id } = req.params;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcement_id)
      .eq('college_id', req.tenant);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, null, 'Announcement deleted successfully');
  } catch (error) {
    console.error('Delete announcement error:', error);
    return errorResponse(res, 'Failed to delete announcement', 500);
  }
};

/**
 * Generate reports
 */
export const generateReport = async (req, res) => {
  try {
    const { type, period = '30', format = 'json' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    let reportData = {};

    switch (type) {
      case 'mental-health':
        reportData = await generateMentalHealthReport(req.tenant, daysAgo);
        break;
      case 'usage':
        reportData = await generateUsageReport(req.tenant, daysAgo);
        break;
      case 'appointments':
        reportData = await generateAppointmentsReport(req.tenant, daysAgo);
        break;
      default:
        return errorResponse(res, 'Invalid report type', 400);
    }

    const report = {
      type,
      period: parseInt(period),
      generated_at: new Date().toISOString(),
      data: reportData
    };

    return successResponse(res, report, 'Report generated successfully');
  } catch (error) {
    console.error('Generate report error:', error);
    return errorResponse(res, 'Failed to generate report', 500);
  }
};

async function generateUsageReport(collegeId, fromDate) {
  // Implementation for usage analytics
  return {
    activeUsers: 0,
    sessionData: {},
    featureUsage: {}
  };
}

async function generateAppointmentsReport(collegeId, fromDate) {
  const { data } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      type,
      created_at,
      date
    `)
    .eq('college_id', collegeId)
    .gte('created_at', fromDate.toISOString());

  const statusDistribution = {};
  const typeDistribution = {};
  
  (data || []).forEach(appointment => {
    statusDistribution[appointment.status] = (statusDistribution[appointment.status] || 0) + 1;
    typeDistribution[appointment.type] = (typeDistribution[appointment.type] || 0) + 1;
  });

  return {
    total: data?.length || 0,
    statusDistribution,
    typeDistribution
  };
}


///////////////////// USER MANAGEMENT /////////////////////////

/**
 * Get user statistics for the college
 */
export const getUserStats = async (req, res) => {
  try {
    const [{ count: totalUsers }, { count: totalStudents }, { count: totalCounsellors }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', req.tenant)
          .in('role', ['student', 'counsellor']),

        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', req.tenant)
          .eq('role', 'student'),

        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', req.tenant)
          .eq('role', 'counsellor')
      ]);

    const stats = {
      totalUsers,
      totalStudents,
      totalCounsellors
    };

    return successResponse(res, stats, 'User statistics retrieved successfully');
  } catch (error) {
    console.error('Get user statistics error:', error);
    return errorResponse(res, 'Failed to get user statistics', 500);
  }
};

/**
 * Get all users in the college
 */
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    console.log('getUsers called with params:', { page, limit, role, search }); // Debug log

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        phone,
        created_at,
        updated_at,
        students (
          roll_no,
          year
        ),
        counsellors (
          specialization
        )
      `, { count: 'exact' })
      .eq('college_id', req.tenant);

    // Apply role filter
    if (role && role !== 'all') {
      console.log('Filtering by role:', role); // Debug log
      query = query.eq('role', role);
    } else {
      // If no specific role filter, show only students and counsellors (exclude admin/superadmin)
      query = query.in('role', ['student', 'counsellor']);
    }

    if (search) {
      console.log('Searching for:', search); // Debug log
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    console.log('Raw data from DB:', JSON.stringify(data, null, 2)); // Debug log

    // Format response to flatten roll_no and year for students, specialization for counsellors
    const formattedData = data.map((user) => ({
      ...user,
      roll_no: user.students?.roll_no || null,
      year: user.students?.year || null,
      specialization: user.counsellors?.specialization || null,
      students: undefined, // Remove the nested students object
      counsellors: undefined // Remove the nested counsellors object
    }));

    console.log('Formatted data:', JSON.stringify(formattedData, null, 2)); // Debug log

    return paginatedResponse(res, formattedData, page, limit, count);
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, 'Failed to get users', 500);
  }
};

/**
 * Get user details
 */
export const getUserDetails = async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        phone,
        bio,
        created_at,
        updated_at
      `)
      .eq('id', user_id)
      .eq('college_id', req.tenant)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 404);
    }

    return successResponse(res, data, 'User details retrieved successfully');
  } catch (error) {
    console.error('Get user details error:', error);
    return errorResponse(res, 'Failed to get user details', 500);
  }
};

/**
 * Create a new student account
 * Admin can add students by providing their details
 */
export const createStudent = async (req, res) => {
  try {
    const { name, email, password, phone, passing_year, roll_no } = req.body;
    const collegeId = req.tenant;

    console.log('Creating student with data:', { name, email, phone, passing_year, roll_no });

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return errorResponse(res, 'A user with this email already exists', 400);
    }

    // Check if roll_no already exists (if provided)
    if (roll_no) {
      const { data: existingRollNo } = await supabase
        .from('students')
        .select('roll_no')
        .eq('roll_no', roll_no)
        .single();

      if (existingRollNo) {
        return errorResponse(res, 'A student with this roll number already exists', 400);
      }
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm the email
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return errorResponse(res, `Failed to create user account: ${authError.message}`, 400);
    }

    // Update auth user metadata with college_id and role
    const { error: metadataError } = await supabase.auth.admin.updateUserById(authUser.user.id, {
      user_metadata: {
        college_id: collegeId,
        role: 'student'
      }
    });

    if (metadataError) {
      console.error('Failed to update user metadata:', metadataError);
      // Rollback: Delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(res, `Failed to set user metadata: ${metadataError.message}`, 400);
    }

    // Create profile entry
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role: 'student',
        college_id: collegeId,
        phone: phone || null
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Rollback: Delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(res, `Failed to create user profile: ${profileError.message}`, 400);
    }

    // Create student entry
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        id: authUser.user.id,
        year: passing_year || null,
        roll_no: roll_no || null
        // anonymous_username will be set by the student later
      })
      .select()
      .single();

    if (studentError) {
      console.error('Student entry creation error:', studentError);
      console.error('Error details:', JSON.stringify(studentError, null, 2));
      // Rollback: Delete profile and auth user
      await supabase.from('profiles').delete().eq('id', authUser.user.id);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(res, `Failed to create student entry: ${studentError.message}`, 400);
    }

    return successResponse(res, {
      id: authUser.user.id,
      name,
      email,
      role: 'student',
      passing_year,
      roll_no
    }, 'Student created successfully', 201);
  } catch (error) {
    console.error('Create student error:', error);
    return errorResponse(res, 'Failed to create student', 500);
  }
};

/**
 * Create a new counsellor account
 * Admin can add counsellors by providing their details
 */
export const createCounsellor = async (req, res) => {
  try {
    const { name, email, password, phone, specialization } = req.body;
    const collegeId = req.tenant;

    console.log('Creating counsellor with data:', { name, email, phone, specialization });

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return errorResponse(res, 'A user with this email already exists', 400);
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm the email
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return errorResponse(res, `Failed to create user account: ${authError.message}`, 400);
    }

    // Update auth user metadata with college_id and role
    const { error: metadataError } = await supabase.auth.admin.updateUserById(authUser.user.id, {
      user_metadata: {
        college_id: collegeId,
        role: 'counsellor'
      }
    });

    if (metadataError) {
      console.error('Failed to update user metadata:', metadataError);
      // Rollback: Delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(res, `Failed to set user metadata: ${metadataError.message}`, 400);
    }

    // Create profile entry
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role: 'counsellor',
        college_id: collegeId,
        phone: phone || null
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Rollback: Delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(res, `Failed to create user profile: ${profileError.message}`, 400);
    }

    // Create counsellor entry
    const { data: counsellor, error: counsellorError } = await supabase
      .from('counsellors')
      .insert({
        id: authUser.user.id,
        specialization: specialization || null
      })
      .select()
      .single();

    if (counsellorError) {
      console.error('Counsellor entry creation error:', counsellorError);
      // Rollback: Delete profile and auth user
      await supabase.from('profiles').delete().eq('id', authUser.user.id);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(res, `Failed to create counsellor entry: ${counsellorError.message}`, 400);
    }

    return successResponse(res, {
      id: authUser.user.id,
      name,
      email,
      role: 'counsellor',
      specialization
    }, 'Counsellor created successfully', 201);
  } catch (error) {
    console.error('Create counsellor error:', error);
    return errorResponse(res, 'Failed to create counsellor', 500);
  }
};

/**
 * Delete a user (student or counsellor)
 * Admin can delete users from their college
 */
export const deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const collegeId = req.tenant;

    // Verify user exists and belongs to the admin's college
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, role, college_id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return notFoundResponse(res, 'User not found');
    }

    if (user.college_id !== collegeId) {
      return errorResponse(res, 'You do not have permission to delete this user', 403);
    }

    // Prevent deletion of admin and superadmin accounts
    if (user.role === 'admin' || user.role === 'superadmin') {
      return errorResponse(res, 'Cannot delete admin or superadmin accounts', 403);
    }

    console.log(`Starting deletion process for user ${user_id} (${user.role})`);

    try {
      // Delete related records in correct order to avoid FK constraints
      
      // 1. Delete AI conversations and messages
      const { data: conversations } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user_id);
      
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        await supabase.from('ai_messages').delete().in('conversation_id', conversationIds);
        await supabase.from('ai_conversations').delete().eq('user_id', user_id);
        console.log(`Deleted ${conversations.length} AI conversations`);
      }

      // 2. Delete messages (as sender or receiver)
      await supabase.from('messages').delete().eq('sender_id', user_id);
      await supabase.from('messages').delete().eq('receiver_id', user_id);
      console.log('Deleted messages');

      // 3. Delete community-related data
      await supabase.from('community_messages').delete().eq('sender_id', user_id);
      await supabase.from('community_members').delete().eq('user_id', user_id);
      console.log('Deleted community data');

      // 4. Delete conversations (as student or counsellor)
      await supabase.from('conversations').delete().eq('student_id', user_id);
      await supabase.from('conversations').delete().eq('counsellor_id', user_id);
      console.log('Deleted conversations');

      if (user.role === 'student') {
        // 5. Delete student-specific data
        await supabase.from('assessments').delete().eq('student_id', user_id);
        await supabase.from('daily_checkins').delete().eq('student_id', user_id);
        await supabase.from('weekly_checkins').delete().eq('student_id', user_id);
        await supabase.from('worries_journal').delete().eq('student_id', user_id);
        console.log('Deleted student journal and assessment data');

        // 6. Delete appointments (as student)
        await supabase.from('appointments').delete().eq('student_id', user_id);
        console.log('Deleted student appointments');

        // 7. Delete student record
        const { error: studentError } = await supabase.from('students').delete().eq('id', user_id);
        if (studentError) {
          console.error('Student deletion error:', studentError);
          return errorResponse(res, `Failed to delete student record: ${studentError.message}`, 400);
        }
        console.log('Deleted student record');
      } else if (user.role === 'counsellor') {
        // 5. Delete counsellor-specific data
        await supabase.from('counsellor_resources').delete().eq('counsellor_id', user_id);
        await supabase.from('counsellor_availability').delete().eq('counsellor_id', user_id);
        console.log('Deleted counsellor resources and availability');

        // 6. Delete appointments (as counsellor)
        await supabase.from('appointments').delete().eq('counsellor_id', user_id);
        console.log('Deleted counsellor appointments');

        // 7. Delete counsellor record
        const { error: counsellorError } = await supabase.from('counsellors').delete().eq('id', user_id);
        if (counsellorError) {
          console.error('Counsellor deletion error:', counsellorError);
          return errorResponse(res, `Failed to delete counsellor record: ${counsellorError.message}`, 400);
        }
        console.log('Deleted counsellor record');
      }

      // 8. Delete communities created by user (optional - might want to keep these)
      // await supabase.from('communities').delete().eq('created_by', user_id);

      // 9. Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user_id);

      if (profileError) {
        console.error('Profile deletion error:', profileError);
        return errorResponse(res, `Failed to delete user profile: ${profileError.message}`, 400);
      }
      console.log('Deleted profile');

      // 10. Delete from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

      if (authError) {
        console.error('Auth user deletion error:', authError);
        console.warn('User profile deleted but auth user deletion failed');
      } else {
        console.log('Deleted auth user');
      }

      return successResponse(res, null, 'User and all related data deleted successfully');
    } catch (deletionError) {
      console.error('Error during user deletion:', deletionError);
      return errorResponse(res, `Failed to delete user: ${deletionError.message}`, 500);
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
};

/**
 * Change user password
 * Admin can reset password for students and counsellors in their college
 */
export const changeUserPassword = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { new_password } = req.body;
    const collegeId = req.tenant;

    console.log('Change password request:', { user_id, new_password: '***', collegeId });

    // Validate new_password exists
    if (!new_password || new_password.trim() === '') {
      return errorResponse(res, 'New password is required and cannot be empty', 400);
    }

    // Verify user exists and belongs to the admin's college
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, role, college_id, email')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      console.log('User not found error:', userError);
      return notFoundResponse(res, 'User not found');
    }

    if (user.college_id !== collegeId) {
      return errorResponse(res, 'You do not have permission to modify this user', 403);
    }

    // Prevent password change for admin and superadmin accounts
    if (user.role === 'admin' || user.role === 'superadmin') {
      return errorResponse(res, 'Cannot change password for admin or superadmin accounts', 403);
    }

    console.log('Updating password for user:', user_id);

    // Update password in Supabase Auth
    const { data, error: authError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (authError) {
      console.error('Password update error:', authError);
      console.error('Error details:', JSON.stringify(authError, null, 2));
      return errorResponse(res, `Failed to update password: ${authError.message}`, 400);
    }

    console.log('Password updated successfully for user:', user_id);
    return successResponse(res, null, 'Password updated successfully');
  } catch (error) {
    console.error('Change user password error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return errorResponse(res, 'Failed to change password', 500);
  }
};

/**
 * Get admin profile details
 */
export const getAdminProfile = async (req, res) => {
  try {
    const { user_id } = req.user;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        phone,
        bio,
        created_at,
        updated_at
      `)
      .eq('id', user_id)
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 404);
    }

    return successResponse(res, data, 'Admin profile retrieved successfully');
  } catch (error) {
    console.error('Get admin profile error:', error);
    return errorResponse(res, 'Failed to get admin profile', 500);
  }
};

/**
 * Update admin profile
 */
export const updateAdminProfile = async (req, res) => {
  try {
    const { user_id } = req.user;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'Admin profile updated successfully');
  } catch (error) {
    console.error('Update admin profile error:', error);
    return errorResponse(res, 'Failed to update admin profile', 500);
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
    console.log(`Realtime voice session created for admin: ${req.user.user_id}`);

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

/**
 * Get Assessment Analytics
 * GET /api/admin/analytics/assessments
 * Returns aggregated analytics data from student assessments (latest per student)
 */
export const getAssessmentAnalytics = async (req, res) => {
  try {
    const collegeId = req.tenant;

    // Get all assessments for the college, grouped by student (taking latest one)
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('student_id, form_type, score, severity_level, responses, created_at')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return errorResponse(res, 'Failed to fetch assessment data', 500);
    }

    // Group by student and keep only the latest assessment per student
    const latestAssessmentsByStudent = {};
    assessments.forEach(assessment => {
      if (!latestAssessmentsByStudent[assessment.student_id]) {
        latestAssessmentsByStudent[assessment.student_id] = assessment;
      }
    });

    const latestAssessments = Object.values(latestAssessmentsByStudent);

    // Calculate analytics
    const analytics = {
      // Stress Levels Over Time (PHQ-9 or PSS-10)
      stressLevels: calculateStressLevelsOverTime(assessments),
      
      // Anxiety/Depression Distribution (GAD-7 or PHQ-9)
      anxietyDepressionDistribution: calculateSeverityDistribution(latestAssessments),
      
      // Risk Alert Distribution
      riskAlertDistribution: calculateRiskDistribution(latestAssessments),
      
      // Total stats
      totalStudentsAssessed: latestAssessments.length,
      totalAssessments: assessments.length,
      
      // Assessment type breakdown
      assessmentTypeBreakdown: calculateAssessmentTypeBreakdown(latestAssessments)
    };

    return successResponse(res, analytics, 'Assessment analytics retrieved successfully');
  } catch (error) {
    console.error('Get assessment analytics error:', error);
    return errorResponse(res, 'Failed to get assessment analytics', 500);
  }
};

// Helper function to calculate stress levels over time (weekly aggregates)
function calculateStressLevelsOverTime(assessments) {
  // Group assessments by week
  const now = new Date();
  const weeks = [];
  const weekLabels = [];
  
  // Get last 5 weeks
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    weeks.push({ start: weekStart, end: weekEnd });
    weekLabels.push(`Week ${5 - i}`);
  }
  
  // Calculate average score per week for stress-related assessments
  const weeklyScores = weeks.map(week => {
    const weekAssessments = assessments.filter(a => {
      const aDate = new Date(a.created_at);
      return aDate >= week.start && aDate < week.end && 
             (a.form_type === 'PSS-10' || a.form_type === 'PHQ-9' || a.form_type === 'GAD-7');
    });
    
    if (weekAssessments.length === 0) return 0;
    
    const avgScore = weekAssessments.reduce((sum, a) => sum + a.score, 0) / weekAssessments.length;
    // Normalize to 0-10 scale
    return parseFloat((avgScore / 27 * 10).toFixed(1)); // Assuming max score of ~27
  });
  
  return {
    labels: weekLabels,
    values: weeklyScores.map(s => s || 5.0), // Default to 5.0 if no data
    average: weeklyScores.filter(s => s > 0).length > 0 
      ? parseFloat((weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.filter(s => s > 0).length).toFixed(1))
      : 5.0
  };
}

// Helper function to calculate severity distribution
function calculateSeverityDistribution(latestAssessments) {
  const distribution = {
    normal: 0,
    mild: 0,
    moderate: 0,
    severe: 0
  };
  
  latestAssessments.forEach(assessment => {
    const severity = assessment.severity_level?.toLowerCase() || 'normal';
    if (distribution.hasOwnProperty(severity)) {
      distribution[severity]++;
    } else {
      distribution.normal++;
    }
  });
  
  const total = latestAssessments.length || 1;
  
  return {
    labels: ['Normal', 'Mild', 'Moderate', 'Severe'],
    values: [distribution.normal, distribution.mild, distribution.moderate, distribution.severe],
    percentages: [
      parseFloat((distribution.normal / total * 100).toFixed(1)),
      parseFloat((distribution.mild / total * 100).toFixed(1)),
      parseFloat((distribution.moderate / total * 100).toFixed(1)),
      parseFloat((distribution.severe / total * 100).toFixed(1))
    ]
  };
}

// Helper function to calculate risk distribution
function calculateRiskDistribution(latestAssessments) {
  const riskLevels = {
    low: 0,
    medium: 0,
    high: 0
  };
  
  latestAssessments.forEach(assessment => {
    const severity = assessment.severity_level?.toLowerCase() || 'normal';
    
    if (severity === 'normal' || severity === 'minimal') {
      riskLevels.low++;
    } else if (severity === 'mild' || severity === 'moderate') {
      riskLevels.medium++;
    } else {
      riskLevels.high++;
    }
  });
  
  return {
    labels: ['Low Risk (Green)', 'Medium Risk (Yellow)', 'High Risk (Red)'],
    values: [riskLevels.low, riskLevels.medium, riskLevels.high],
    colors: ['green', 'yellow', 'red']
  };
}

// Helper function to calculate assessment type breakdown
function calculateAssessmentTypeBreakdown(latestAssessments) {
  const breakdown = {};
  
  latestAssessments.forEach(assessment => {
    const type = assessment.form_type;
    if (!breakdown[type]) {
      breakdown[type] = 0;
    }
    breakdown[type]++;
  });
  
  return breakdown;
}