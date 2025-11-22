import { supabase } from "../config/supabase.js";
import { formatSupabaseError } from "../utils/response.js";

/**
 * Analytics Service
 * Business logic for analytics and reporting operations
 */

export class AnalyticsService {
  /**
   * Get mental health assessment analytics
   */
  static async getAssessmentAnalytics(options = {}) {
    const {
      collegeId,
      period = 30,
      formType,
      severity
    } = options;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    let query = supabase
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
      .gte('created_at', daysAgo.toISOString());

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    if (formType) {
      query = query.eq('assessment_forms.name', formType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return this.processAssessmentAnalytics(data || []);
  }

  /**
   * Process assessment data for analytics
   */
  static processAssessmentAnalytics(submissions) {
    const analytics = {
      totalSubmissions: submissions.length,
      averageScore: 0,
      severityDistribution: { minimal: 0, mild: 0, moderate: 0, severe: 0 },
      formDistribution: {},
      timeSeriesData: {},
      trends: {}
    };

    if (submissions.length === 0) return analytics;

    let totalScore = 0;

    submissions.forEach(submission => {
      // Total score for average calculation
      totalScore += submission.score || 0;

      // Severity distribution
      analytics.severityDistribution[submission.severity]++;

      // Form distribution
      const formName = submission.assessment_forms?.name || 'Unknown';
      analytics.formDistribution[formName] = (analytics.formDistribution[formName] || 0) + 1;

      // Time series data (daily counts)
      const date = submission.created_at.split('T')[0];
      if (!analytics.timeSeriesData[date]) {
        analytics.timeSeriesData[date] = {
          total: 0,
          minimal: 0,
          mild: 0,
          moderate: 0,
          severe: 0
        };
      }
      analytics.timeSeriesData[date].total++;
      analytics.timeSeriesData[date][submission.severity]++;
    });

    // Calculate average score
    analytics.averageScore = totalScore / submissions.length;

    // Calculate trends (compare first and second half of period)
    analytics.trends = this.calculateTrends(analytics.timeSeriesData);

    return analytics;
  }

  /**
   * Calculate trends from time series data
   */
  static calculateTrends(timeSeriesData) {
    const dates = Object.keys(timeSeriesData).sort();
    if (dates.length < 2) return { trend: 'stable', change: 0 };

    const midPoint = Math.floor(dates.length / 2);
    const firstHalf = dates.slice(0, midPoint);
    const secondHalf = dates.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, date) => sum + timeSeriesData[date].total, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, date) => sum + timeSeriesData[date].total, 0) / secondHalf.length;

    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    const trend = change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable';

    return { trend, change: Math.round(change * 100) / 100 };
  }

  /**
   * Get user engagement analytics
   */
  static async getUserEngagementAnalytics(options = {}) {
    const { collegeId, period = 30 } = options;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    // Get various engagement metrics
    const queries = [];

    // Assessment engagement
    let assessmentQuery = supabase
      .from('assessment_submissions')
      .select('user_id, created_at', { count: 'exact' })
      .gte('created_at', daysAgo.toISOString());

    if (collegeId) {
      assessmentQuery = assessmentQuery.eq('college_id', collegeId);
    }

    queries.push(assessmentQuery);

    // Appointment engagement
    let appointmentQuery = supabase
      .from('appointments')
      .select('student_id, created_at', { count: 'exact' })
      .gte('created_at', daysAgo.toISOString());

    if (collegeId) {
      appointmentQuery = appointmentQuery.eq('college_id', collegeId);
    }

    queries.push(appointmentQuery);

    // Community engagement
    let communityQuery = supabase
      .from('community_members')
      .select('user_id, joined_at', { count: 'exact' })
      .gte('joined_at', daysAgo.toISOString());

    queries.push(communityQuery);

    const [
      { data: assessmentData, count: totalAssessments },
      { data: appointmentData, count: totalAppointments },
      { data: communityData, count: totalCommunityJoins }
    ] = await Promise.all(queries);

    // Process unique active users
    const activeUsers = new Set([
      ...(assessmentData || []).map(a => a.user_id),
      ...(appointmentData || []).map(a => a.student_id),
      ...(communityData || []).map(c => c.user_id)
    ]);

    return {
      activeUsers: activeUsers.size,
      totalAssessments: totalAssessments || 0,
      totalAppointments: totalAppointments || 0,
      totalCommunityJoins: totalCommunityJoins || 0,
      engagementRate: this.calculateEngagementRate(activeUsers.size, collegeId)
    };
  }

  /**
   * Calculate engagement rate
   */
  static async calculateEngagementRate(activeUsers, collegeId) {
    let query = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { count: totalUsers } = await query;

    return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  }

  /**
   * Get risk assessment analytics
   */
  static async getRiskAssessmentAnalytics(options = {}) {
    const { collegeId, period = 30 } = options;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    let query = supabase
      .from('assessment_submissions')
      .select(`
        id,
        user_id,
        severity,
        score,
        created_at,
        assessment_forms (name)
      `)
      .gte('created_at', daysAgo.toISOString());

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    // Identify high-risk users
    const userRiskProfiles = {};
    (data || []).forEach(submission => {
      if (!userRiskProfiles[submission.user_id]) {
        userRiskProfiles[submission.user_id] = {
          latestSeverity: submission.severity,
          submissions: [],
          riskScore: 0
        };
      }
      userRiskProfiles[submission.user_id].submissions.push(submission);
    });

    // Calculate risk scores
    Object.keys(userRiskProfiles).forEach(userId => {
      const profile = userRiskProfiles[userId];
      profile.riskScore = this.calculateRiskScore(profile.submissions);
    });

    // Categorize risk levels
    const riskCategories = {
      low: Object.values(userRiskProfiles).filter(p => p.riskScore < 30).length,
      medium: Object.values(userRiskProfiles).filter(p => p.riskScore >= 30 && p.riskScore < 70).length,
      high: Object.values(userRiskProfiles).filter(p => p.riskScore >= 70).length
    };

    return {
      totalUsersAssessed: Object.keys(userRiskProfiles).length,
      riskCategories,
      highRiskUsers: Object.entries(userRiskProfiles)
        .filter(([_, profile]) => profile.riskScore >= 70)
        .map(([userId, profile]) => ({
          userId,
          riskScore: profile.riskScore,
          latestSeverity: profile.latestSeverity
        }))
    };
  }

  /**
   * Calculate individual risk score
   */
  static calculateRiskScore(submissions) {
    if (submissions.length === 0) return 0;

    const severityWeights = { minimal: 0, mild: 25, moderate: 50, severe: 100 };
    const recentWeightMultiplier = 1.5; // More weight to recent submissions
    
    let totalScore = 0;
    let totalWeight = 0;

    submissions.forEach((submission, index) => {
      const isRecent = index < 3; // Last 3 submissions get more weight
      const weight = isRecent ? recentWeightMultiplier : 1;
      
      totalScore += severityWeights[submission.severity] * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Get appointment analytics
   */
  static async getAppointmentAnalytics(options = {}) {
    const { collegeId, period = 30 } = options;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    let query = supabase
      .from('appointments')
      .select(`
        id,
        status,
        type,
        created_at,
        date,
        counsellor_id,
        student_id
      `)
      .gte('created_at', daysAgo.toISOString());

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    const analytics = {
      totalAppointments: data?.length || 0,
      statusDistribution: {},
      typeDistribution: {},
      counsellorUtilization: {},
      timeDistribution: {}
    };

    (data || []).forEach(appointment => {
      // Status distribution
      analytics.statusDistribution[appointment.status] = 
        (analytics.statusDistribution[appointment.status] || 0) + 1;

      // Type distribution
      analytics.typeDistribution[appointment.type] = 
        (analytics.typeDistribution[appointment.type] || 0) + 1;

      // Counsellor utilization
      analytics.counsellorUtilization[appointment.counsellor_id] = 
        (analytics.counsellorUtilization[appointment.counsellor_id] || 0) + 1;

      // Time distribution (daily)
      const date = appointment.date || appointment.created_at.split('T')[0];
      analytics.timeDistribution[date] = 
        (analytics.timeDistribution[date] || 0) + 1;
    });

    return analytics;
  }

  /**
   * Generate comprehensive report
   */
  static async generateComprehensiveReport(options = {}) {
    const { collegeId, period = 30, includeUserDetails = false } = options;

    try {
      const [
        assessmentAnalytics,
        engagementAnalytics,
        riskAnalytics,
        appointmentAnalytics
      ] = await Promise.all([
        this.getAssessmentAnalytics({ collegeId, period }),
        this.getUserEngagementAnalytics({ collegeId, period }),
        this.getRiskAssessmentAnalytics({ collegeId, period }),
        this.getAppointmentAnalytics({ collegeId, period })
      ]);

      const report = {
        generatedAt: new Date().toISOString(),
        period,
        collegeId,
        summary: {
          totalAssessments: assessmentAnalytics.totalSubmissions,
          activeUsers: engagementAnalytics.activeUsers,
          highRiskUsers: riskAnalytics.highRiskUsers.length,
          totalAppointments: appointmentAnalytics.totalAppointments
        },
        assessmentAnalytics,
        engagementAnalytics,
        riskAnalytics,
        appointmentAnalytics
      };

      return report;
    } catch (error) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  static async getDashboardMetrics(collegeId = null) {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Today's metrics
      const todayMetrics = await Promise.all([
        this.getTodayAssessments(collegeId, today),
        this.getTodayAppointments(collegeId, today),
        this.getActiveUsers(collegeId, 7), // Last 7 days
        this.getAlerts(collegeId)
      ]);

      return {
        today: {
          assessments: todayMetrics[0],
          appointments: todayMetrics[1],
          activeUsers: todayMetrics[2],
          alerts: todayMetrics[3]
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
  }

  // Helper methods for dashboard metrics
  static async getTodayAssessments(collegeId, date) {
    let query = supabase
      .from('assessment_submissions')
      .select('severity', { count: 'exact' })
      .gte('created_at', date)
      .lt('created_at', new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString());

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { count } = await query;
    return count || 0;
  }

  static async getTodayAppointments(collegeId, date) {
    let query = supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('date', date);

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { count } = await query;
    return count || 0;
  }

  static async getActiveUsers(collegeId, days) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // This would require a more complex query to track user activity
    // For now, return a simplified version
    return 0;
  }

  static async getAlerts(collegeId) {
    // Get recent high-risk assessments
    let query = supabase
      .from('assessment_submissions')
      .select('id, user_id, severity, created_at')
      .eq('severity', 'severe')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { data } = await query.limit(5);
    return data?.length || 0;
  }
}