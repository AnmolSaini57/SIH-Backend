import { supabase, supabaseAdmin } from "../config/supabase.js";
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  paginatedResponse,
  formatSupabaseError 
} from "../utils/response.js";

/**
 * SuperAdmin Controller
 * Handles system-wide administration operations across all colleges
 */

/**
 * Get global dashboard statistics
 */
export const getGlobalDashboardStats = async (req, res) => {
  try {
    // Get system-wide statistics
    const [
      { count: totalColleges },
      { count: totalUsers },
      { count: totalStudents },
      { count: totalCounsellors },
      { count: totalAdmins },
      { count: totalAssessments },
      { count: totalAppointments }
    ] = await Promise.all([
      supabase
        .from('colleges')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'counsellor'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin'),
      
      supabase
        .from('assessment_submissions')
        .select('*', { count: 'exact', head: true }),
      
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
    ]);

    // Get recent activity across all colleges
    const { data: recentColleges } = await supabase
      .from('colleges')
      .select(`
        id,
        name,
        code,
        created_at,
        profiles (count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get system health metrics
    const { data: systemHealth } = await supabase
      .from('assessment_submissions')
      .select('severity, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const stats = {
      totalColleges,
      totalUsers,
      totalStudents,
      totalCounsellors,
      totalAdmins,
      totalAssessments,
      totalAppointments,
      recentColleges: recentColleges || [],
      systemHealth: processSystemHealth(systemHealth || [])
    };

    return successResponse(res, stats, 'Global dashboard stats retrieved successfully');
  } catch (error) {
    console.error('Get global dashboard stats error:', error);
    return errorResponse(res, 'Failed to get dashboard stats', 500);
  }
};

/**
 * Get all colleges
 */
export const getColleges = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('colleges')
      .select(`
        id,
        name,
        code,
        address,
        phone,
        email,
        website,
        is_active,
        created_at,
        updated_at,
        profiles (count)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
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
    console.error('Get colleges error:', error);
    return errorResponse(res, 'Failed to get colleges', 500);
  }
};

/**
 * Create new college
 */
export const createCollege = async (req, res) => {
  try {
    const { name, code, address, phone, email, website } = req.body;

    // Check if college code already exists
    const { data: existingCollege } = await supabase
      .from('colleges')
      .select('id')
      .eq('code', code)
      .single();

    if (existingCollege) {
      return errorResponse(res, 'College code already exists', 409);
    }

    const { data, error } = await supabase
      .from('colleges')
      .insert({
        name,
        code: code.toUpperCase(),
        address,
        phone,
        email,
        website,
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: req.user.user_id
      })
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, data, 'College created successfully', 201);
  } catch (error) {
    console.error('Create college error:', error);
    return errorResponse(res, 'Failed to create college', 500);
  }
};

/**
 * Update college
 */
export const updateCollege = async (req, res) => {
  try {
    const { college_id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    // Remove sensitive fields
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    const { data, error } = await supabase
      .from('colleges')
      .update(updates)
      .eq('id', college_id)
      .select()
      .single();

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    if (!data) {
      return notFoundResponse(res, 'College');
    }

    return successResponse(res, data, 'College updated successfully');
  } catch (error) {
    console.error('Update college error:', error);
    return errorResponse(res, 'Failed to update college', 500);
  }
};

/**
 * Get college details with analytics
 */
export const getCollegeDetails = async (req, res) => {
  try {
    const { college_id } = req.params;

    // Get college information
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select(`
        id,
        name,
        code,
        address,
        phone,
        email,
        website,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', college_id)
      .single();

    if (collegeError || !college) {
      return notFoundResponse(res, 'College');
    }

    // Get college statistics
    const [
      { count: totalUsers },
      { count: totalStudents },
      { count: totalCounsellors },
      { count: totalAdmins },
      { count: totalAssessments },
      { count: totalAppointments },
      { count: activeCommunities }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id)
        .eq('role', 'student'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id)
        .eq('role', 'counsellor'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id)
        .eq('role', 'admin'),
      
      supabase
        .from('assessment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id),
      
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id),
      
      supabase
        .from('communities')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college_id)
        .eq('is_active', true)
    ]);

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('assessment_submissions')
      .select(`
        id,
        score,
        severity,
        created_at,
        assessment_forms (
          name
        )
      `)
      .eq('college_id', college_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const collegeDetails = {
      ...college,
      statistics: {
        totalUsers,
        totalStudents,
        totalCounsellors,
        totalAdmins,
        totalAssessments,
        totalAppointments,
        activeCommunities
      },
      recentActivity: recentActivity || []
    };

    return successResponse(res, collegeDetails, 'College details retrieved successfully');
  } catch (error) {
    console.error('Get college details error:', error);
    return errorResponse(res, 'Failed to get college details', 500);
  }
};

/**
 * Get global analytics
 */
export const getGlobalAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get assessment data across all colleges
    const { data: assessments, error: assessmentError } = await supabase
      .from('assessment_submissions')
      .select(`
        id,
        score,
        severity,
        created_at,
        college_id,
        assessment_forms (
          name
        ),
        colleges (
          name,
          code
        )
      `)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (assessmentError) {
      const formattedError = formatSupabaseError(assessmentError);
      return errorResponse(res, formattedError.message, 400);
    }

    // Get user growth data
    const { data: userGrowth, error: userGrowthError } = await supabase
      .from('profiles')
      .select('created_at, role, college_id')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (userGrowthError) {
      const formattedError = formatSupabaseError(userGrowthError);
      return errorResponse(res, formattedError.message, 400);
    }

    const analytics = {
      assessmentAnalytics: processGlobalAssessmentAnalytics(assessments || []),
      userGrowthAnalytics: processUserGrowthAnalytics(userGrowth || []),
      collegeComparisons: await getCollegeComparisons()
    };

    return successResponse(res, analytics, 'Global analytics retrieved successfully');
  } catch (error) {
    console.error('Get global analytics error:', error);
    return errorResponse(res, 'Failed to get global analytics', 500);
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req, res) => {
  try {
    // Check database connectivity
    const { data: dbCheck, error: dbError } = await supabase
      .from('colleges')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    // Get system metrics
    const metrics = {
      database: {
        status: dbError ? 'error' : 'healthy',
        lastChecked: new Date().toISOString(),
        error: dbError?.message || null
      },
      server: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version
      },
      statistics: {
        totalColleges: dbCheck || 0,
        lastUpdated: new Date().toISOString()
      }
    };

    return successResponse(res, metrics, 'System health retrieved successfully');
  } catch (error) {
    console.error('Get system health error:', error);
    return errorResponse(res, 'Failed to get system health', 500);
  }
};

/**
 * Create system admin user
 */
export const createSystemAdmin = async (req, res) => {
  try {
    const { email, password, name, college_id } = req.body;

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: 'admin',
        college_id
      },
      email_confirm: true
    });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const { user } = data;

    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email,
        name,
        role: 'admin',
        college_id,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      // Clean up user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      const formattedError = formatSupabaseError(profileError);
      return errorResponse(res, formattedError.message, 400);
    }

    const userData = {
      id: user.id,
      email,
      name,
      role: 'admin',
      college_id,
      created_at: user.created_at
    };

    return successResponse(res, userData, 'System admin created successfully', 201);
  } catch (error) {
    console.error('Create system admin error:', error);
    return errorResponse(res, 'Failed to create system admin', 500);
  }
};

// Helper functions
function processSystemHealth(assessments) {
  const last7Days = assessments.filter(a => {
    const date = new Date(a.created_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date > weekAgo;
  });

  const severityCount = { minimal: 0, mild: 0, moderate: 0, severe: 0 };
  last7Days.forEach(assessment => {
    severityCount[assessment.severity]++;
  });

  return {
    totalAssessments: last7Days.length,
    severityDistribution: severityCount,
    riskLevel: calculateRiskLevel(severityCount)
  };
}

function calculateRiskLevel(severityCount) {
  const total = Object.values(severityCount).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 'low';
  
  const severePercentage = (severityCount.severe / total) * 100;
  const moderatePercentage = (severityCount.moderate / total) * 100;
  
  if (severePercentage > 20) return 'high';
  if (severePercentage > 10 || moderatePercentage > 30) return 'medium';
  return 'low';
}

function processGlobalAssessmentAnalytics(assessments) {
  const collegeData = {};
  const formData = {};
  const timeSeriesData = {};

  assessments.forEach(assessment => {
    const collegeName = assessment.colleges?.name || 'Unknown';
    const formName = assessment.assessment_forms?.name || 'Unknown';
    const date = assessment.created_at.split('T')[0];

    // College distribution
    if (!collegeData[collegeName]) {
      collegeData[collegeName] = { total: 0, severe: 0 };
    }
    collegeData[collegeName].total++;
    if (assessment.severity === 'severe') {
      collegeData[collegeName].severe++;
    }

    // Form distribution
    formData[formName] = (formData[formName] || 0) + 1;

    // Time series
    if (!timeSeriesData[date]) {
      timeSeriesData[date] = 0;
    }
    timeSeriesData[date]++;
  });

  return {
    collegeDistribution: collegeData,
    formDistribution: formData,
    timeSeriesData
  };
}

function processUserGrowthAnalytics(users) {
  const dailyGrowth = {};
  const roleDistribution = { student: 0, counsellor: 0, admin: 0 };

  users.forEach(user => {
    const date = user.created_at.split('T')[0];
    dailyGrowth[date] = (dailyGrowth[date] || 0) + 1;
    roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
  });

  return {
    dailyGrowth,
    roleDistribution,
    totalNewUsers: users.length
  };
}

async function getCollegeComparisons() {
  const { data } = await supabase
    .from('colleges')
    .select(`
      id,
      name,
      code,
      profiles (count),
      assessment_submissions (count),
      appointments (count)
    `)
    .eq('is_active', true)
    .limit(10);

  return data || [];
}