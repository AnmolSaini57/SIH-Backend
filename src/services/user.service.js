import { supabase } from "../config/supabase.js";
import { formatSupabaseError } from "../utils/response.js";

/**
 * User Service
 * Business logic for user-related operations
 */

export class UserService {
  /**
   * Get user by ID with optional college filtering
   */
  static async getUserById(userId, collegeId = null) {
    let query = supabase
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
          code
        )
      `)
      .eq('id', userId);

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get users with pagination and filtering
   */
  static async getUsers(options = {}) {
    const {
      page = 1,
      limit = 20,
      collegeId,
      role,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

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
        updated_at,
        last_login_at
      `, { count: 'exact' });

    // Apply filters
    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return {
      users: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId, updates, collegeId = null) {
    // Remove sensitive fields
    const sanitizedUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    delete sanitizedUpdates.id;
    delete sanitizedUpdates.email;
    delete sanitizedUpdates.role;
    delete sanitizedUpdates.college_id;
    delete sanitizedUpdates.created_at;

    let query = supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId);

    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    const { data, error } = await query
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get user statistics
   */
  static async getUserStats(collegeId = null) {
    let baseQuery = supabase.from('profiles');

    if (collegeId) {
      baseQuery = baseQuery.eq('college_id', collegeId);
    }

    const [
      { count: totalUsers },
      { count: students },
      { count: counsellors },
      { count: admins }
    ] = await Promise.all([
      baseQuery.select('*', { count: 'exact', head: true }),
      baseQuery.select('*', { count: 'exact', head: true }).eq('role', 'student'),
      baseQuery.select('*', { count: 'exact', head: true }).eq('role', 'counsellor'),
      baseQuery.select('*', { count: 'exact', head: true }).eq('role', 'admin')
    ]);

    return {
      totalUsers,
      roleDistribution: {
        students,
        counsellors,
        admins
      }
    };
  }

  /**
   * Check if user exists
   */
  static async userExists(identifier, type = 'id') {
    const column = type === 'email' ? 'email' : 'id';
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq(column, identifier)
      .single();

    return !error && data;
  }

  /**
   * Get user activity summary
   */
  static async getUserActivity(userId, collegeId = null) {
    const queries = [];

    // Assessment submissions
    let assessmentQuery = supabase
      .from('assessment_submissions')
      .select('id, created_at', { count: 'exact' })
      .eq('user_id', userId);

    if (collegeId) {
      assessmentQuery = assessmentQuery.eq('college_id', collegeId);
    }

    queries.push(assessmentQuery);

    // Appointments
    let appointmentQuery = supabase
      .from('appointments')
      .select('id, created_at', { count: 'exact' })
      .eq('student_id', userId);

    if (collegeId) {
      appointmentQuery = appointmentQuery.eq('college_id', collegeId);
    }

    queries.push(appointmentQuery);

    // Community memberships
    let communityQuery = supabase
      .from('community_members')
      .select('id, joined_at', { count: 'exact' })
      .eq('user_id', userId);

    queries.push(communityQuery);

    const [
      { count: totalAssessments },
      { count: totalAppointments },
      { count: totalCommunities }
    ] = await Promise.all(queries);

    return {
      assessments: totalAssessments || 0,
      appointments: totalAppointments || 0,
      communities: totalCommunities || 0
    };
  }

  /**
   * Bulk update users
   */
  static async bulkUpdateUsers(userUpdates, collegeId = null) {
    const results = [];

    for (const update of userUpdates) {
      try {
        const result = await this.updateUserProfile(update.id, update.data, collegeId);
        results.push({ success: true, user: result });
      } catch (error) {
        results.push({ success: false, error: error.message, userId: update.id });
      }
    }

    return results;
  }

  /**
   * Search users with advanced filters
   */
  static async searchUsers(searchOptions = {}) {
    const {
      query: searchQuery,
      collegeId,
      roles = [],
      dateRange,
      limit = 50
    } = searchOptions;

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        avatar_url,
        created_at
      `)
      .limit(limit);

    // College filter
    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }

    // Text search
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    // Role filter
    if (roles.length > 0) {
      query = query.in('role', roles);
    }

    // Date range filter
    if (dateRange && dateRange.from) {
      query = query.gte('created_at', dateRange.from);
    }
    if (dateRange && dateRange.to) {
      query = query.lte('created_at', dateRange.to);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }
}