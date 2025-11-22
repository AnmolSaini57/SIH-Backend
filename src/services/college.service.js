import { supabase } from "../config/supabase.js";
import { formatSupabaseError } from "../utils/response.js";

/**
 * College Service
 * Business logic for college-related operations
 */

export class CollegeService {
  /**
   * Get college by ID
   */
  static async getCollegeById(collegeId) {
    const { data, error } = await supabase
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
      .eq('id', collegeId)
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get all colleges with pagination
   */
  static async getColleges(options = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

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
        updated_at
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return {
      colleges: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Create new college
   */
  static async createCollege(collegeData, createdBy) {
    // Check if college code already exists
    const existingCollege = await this.getCollegeByCode(collegeData.code);
    if (existingCollege) {
      throw new Error('College code already exists');
    }

    const { data, error } = await supabase
      .from('colleges')
      .insert({
        ...collegeData,
        code: collegeData.code.toUpperCase(),
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: createdBy
      })
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Update college
   */
  static async updateCollege(collegeId, updates) {
    // Remove sensitive fields
    const sanitizedUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    delete sanitizedUpdates.id;
    delete sanitizedUpdates.created_at;
    delete sanitizedUpdates.created_by;

    // If updating code, check for duplicates
    if (updates.code) {
      const existingCollege = await this.getCollegeByCode(updates.code);
      if (existingCollege && existingCollege.id !== collegeId) {
        throw new Error('College code already exists');
      }
      sanitizedUpdates.code = updates.code.toUpperCase();
    }

    const { data, error } = await supabase
      .from('colleges')
      .update(sanitizedUpdates)
      .eq('id', collegeId)
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get college by code
   */
  static async getCollegeByCode(code) {
    const { data, error } = await supabase
      .from('colleges')
      .select('id, name, code')
      .eq('code', code.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get college statistics
   */
  static async getCollegeStats(collegeId) {
    const [
      { count: totalUsers },
      { count: students },
      { count: counsellors },
      { count: admins },
      { count: assessments },
      { count: appointments },
      { count: communities }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .eq('role', 'student'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .eq('role', 'counsellor'),
      
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .eq('role', 'admin'),
      
      supabase
        .from('assessment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId),
      
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId),
      
      supabase
        .from('communities')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
    ]);

    return {
      users: {
        total: totalUsers || 0,
        students: students || 0,
        counsellors: counsellors || 0,
        admins: admins || 0
      },
      activities: {
        assessments: assessments || 0,
        appointments: appointments || 0,
        communities: communities || 0
      }
    };
  }

  /**
   * Get college with detailed information
   */
  static async getCollegeDetails(collegeId) {
    const college = await this.getCollegeById(collegeId);
    const stats = await this.getCollegeStats(collegeId);

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('assessment_submissions')
      .select(`
        id,
        score,
        severity,
        created_at,
        assessment_forms (
          name,
          title
        )
      `)
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...college,
      statistics: stats,
      recentActivity: recentActivity || []
    };
  }

  /**
   * Activate/Deactivate college
   */
  static async toggleCollegeStatus(collegeId, isActive) {
    const { data, error } = await supabase
      .from('colleges')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', collegeId)
      .select()
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Get college comparison data
   */
  static async getCollegeComparisons(options = {}) {
    const { limit = 10, metric = 'users' } = options;

    let selectClause = `
      id,
      name,
      code,
      created_at
    `;

    // Add aggregated data based on metric
    switch (metric) {
      case 'users':
        selectClause += ', profiles(count)';
        break;
      case 'assessments':
        selectClause += ', assessment_submissions(count)';
        break;
      case 'appointments':
        selectClause += ', appointments(count)';
        break;
    }

    const { data, error } = await supabase
      .from('colleges')
      .select(selectClause)
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Search colleges
   */
  static async searchColleges(searchQuery, options = {}) {
    const { limit = 20, includeInactive = false } = options;

    let query = supabase
      .from('colleges')
      .select(`
        id,
        name,
        code,
        address,
        is_active
      `)
      .or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
      .limit(limit);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    return data;
  }

  /**
   * Validate college exists and is active
   */
  static async validateCollege(collegeId) {
    const { data, error } = await supabase
      .from('colleges')
      .select('id, name, is_active')
      .eq('id', collegeId)
      .single();

    if (error) {
      throw new Error('College not found');
    }

    if (!data.is_active) {
      throw new Error('College is not active');
    }

    return data;
  }

  /**
   * Get college growth metrics
   */
  static async getCollegeGrowthMetrics(collegeId, period = 30) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    const { data: userGrowth, error } = await supabase
      .from('profiles')
      .select('created_at, role')
      .eq('college_id', collegeId)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(formatSupabaseError(error).message);
    }

    // Process growth data
    const dailyGrowth = {};
    const roleGrowth = { student: 0, counsellor: 0, admin: 0 };

    (userGrowth || []).forEach(user => {
      const date = user.created_at.split('T')[0];
      dailyGrowth[date] = (dailyGrowth[date] || 0) + 1;
      roleGrowth[user.role] = (roleGrowth[user.role] || 0) + 1;
    });

    return {
      period,
      totalNewUsers: userGrowth?.length || 0,
      dailyGrowth,
      roleGrowth
    };
  }
}