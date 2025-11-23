import { supabase } from "../config/supabase.js";
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  paginatedResponse,
  formatSupabaseError 
} from "../utils/response.js";

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
      { count: totalAssessments },
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
        .from('assessment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', req.tenant),
      
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

    // Get recent activity
    const { data: recentAssessments } = await supabase
      .from('assessment_submissions')
      .select(`
        id,
        score,
        severity,
        created_at,
        user:user_id (
          name
        ),
        assessment_forms (
          name,
          title
        )
      `)
      .eq('college_id', req.tenant)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get assessment trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: assessmentTrends } = await supabase
      .from('assessment_submissions')
      .select('severity, created_at')
      .eq('college_id', req.tenant)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    const stats = {
      totalUsers,
      totalStudents,
      totalCounsellors,
      totalAssessments,
      totalAppointments,
      activeCommunities,
      recentAssessments: recentAssessments || [],
      assessmentTrends: processAssessmentTrends(assessmentTrends || [])
    };

    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    console.error('❌ Get admin dashboard stats error:', error);
    return errorResponse(res, 'Failed to get dashboard stats', 500);
  }
};

/**
 * Get all users in the college
 */
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

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
        updated_at
      `, { count: 'exact' })
      .eq('college_id', req.tenant);

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
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
    console.error('❌ Get users error:', error);
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
        updated_at,
        assessment_submissions (
          id,
          score,
          severity,
          created_at,
          assessment_forms (
            name,
            title
          )
        ),
        appointments (
          id,
          date,
          time,
          status,
          type
        )
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
 * Create announcement
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, target_role, expires_at } = req.body;

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'info',
        target_role: target_role || 'all',
        college_id: req.tenant,
        created_by: req.user.user_id,
        expires_at,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        title,
        content,
        type,
        target_role,
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

    return successResponse(res, data, 'Announcement created successfully', 201);
  } catch (error) {
    console.error('❌ Create announcement error:', error);
    return errorResponse(res, 'Failed to create announcement', 500);
  }
};

/**
 * Get announcements
 */
export const getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        type,
        target_role,
        expires_at,
        is_active,
        created_at,
        created_by:created_by (
          name
        )
      `, { count: 'exact' })
      .eq('college_id', req.tenant);

    if (type) {
      query = query.eq('type', type);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
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
    console.error('❌ Get announcements error:', error);
    return errorResponse(res, 'Failed to get announcements', 500);
  }
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { announcement_id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

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
    console.error('❌ Update announcement error:', error);
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
    console.error('❌ Delete announcement error:', error);
    return errorResponse(res, 'Failed to delete announcement', 500);
  }
};

/**
 * Get assessment analytics
 */
export const getAssessmentAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get assessment submissions with details
    const { data: submissions, error } = await supabase
      .from('assessment_submissions')
      .select(`
        id,
        score,
        severity,
        created_at,
        assessment_forms (
          name,
          title
        ),
        user:user_id (
          role
        )
      `)
      .eq('college_id', req.tenant)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    // Process analytics data
    const analytics = processAssessmentAnalytics(submissions || []);

    return successResponse(res, analytics, 'Assessment analytics retrieved successfully');
  } catch (error) {
    console.error('❌ Get assessment analytics error:', error);
    return errorResponse(res, 'Failed to get assessment analytics', 500);
  }
};

/**
 * Get communities management
 */
export const getCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('communities')
      .select(`
        id,
        name,
        description,
        is_private,
        is_active,
        member_count,
        created_at,
        created_by:created_by (
          name
        )
      `, { count: 'exact' })
      .eq('college_id', req.tenant)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return paginatedResponse(res, data, page, limit, count);
  } catch (error) {
    console.error('❌ Get communities error:', error);
    return errorResponse(res, 'Failed to get communities', 500);
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
    console.error('❌ Generate report error:', error);
    return errorResponse(res, 'Failed to generate report', 500);
  }
};

// Helper functions
function processAssessmentTrends(assessments) {
  const trends = {};
  assessments.forEach(assessment => {
    const date = assessment.created_at.split('T')[0];
    if (!trends[date]) {
      trends[date] = { minimal: 0, mild: 0, moderate: 0, severe: 0 };
    }
    trends[date][assessment.severity]++;
  });
  return trends;
}

function processAssessmentAnalytics(submissions) {
  const severityDistribution = { minimal: 0, mild: 0, moderate: 0, severe: 0 };
  const formDistribution = {};
  const timeSeriesData = {};

  submissions.forEach(submission => {
    // Severity distribution
    severityDistribution[submission.severity]++;

    // Form distribution
    const formName = submission.assessment_forms?.name || 'Unknown';
    formDistribution[formName] = (formDistribution[formName] || 0) + 1;

    // Time series
    const date = submission.created_at.split('T')[0];
    if (!timeSeriesData[date]) {
      timeSeriesData[date] = 0;
    }
    timeSeriesData[date]++;
  });

  return {
    totalSubmissions: submissions.length,
    severityDistribution,
    formDistribution,
    timeSeriesData,
    averageScore: submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length || 0
  };
}

async function generateMentalHealthReport(collegeId, fromDate) {
  const { data } = await supabase
    .from('assessment_submissions')
    .select(`
      id,
      score,
      severity,
      created_at,
      assessment_forms (name),
      user:user_id (role)
    `)
    .eq('college_id', collegeId)
    .gte('created_at', fromDate.toISOString());

  return processAssessmentAnalytics(data || []);
}

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