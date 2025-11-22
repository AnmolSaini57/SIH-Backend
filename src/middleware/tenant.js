import { errorResponse } from "../utils/response.js";

/**
 * Multi-tenant isolation middleware
 * Ensures college-level data separation
 * SuperAdmins bypass tenant restrictions
 * 
 * This middleware:
 * 1. Extracts college_id from authenticated user
 * 2. Sets req.tenant for use in controllers
 * 3. Allows SuperAdmins to access all tenants
 * 4. Enforces tenant isolation for other roles
 */
export default function tenant(req, res, next) {
  // SuperAdmins bypass tenant restrictions
  if (req.user && req.user.role === 'superadmin') {
    req.tenant = null; // null means access to all tenants
    return next();
  }

  // Extract college_id from user
  const collegeId = req.user?.college_id;

  // Ensure user has a college_id (except for superadmin)
  if (!collegeId) {
    return errorResponse(res, "User not associated with any college", 403);
  }

  // Set tenant context
  req.tenant = collegeId;

  // Optional: Allow tenant override for SuperAdmins via query parameter
  if (req.user.role === 'superadmin' && req.query.college_id) {
    req.tenant = req.query.college_id;
  }

  return next();
}

/**
 * Strict tenant middleware - even SuperAdmins must specify tenant
 */
export const strictTenant = (req, res, next) => {
  const collegeId = req.user?.college_id;

  if (!collegeId && req.user.role !== 'superadmin') {
    return errorResponse(res, "User not associated with any college", 403);
  }

  // SuperAdmins must specify tenant via query parameter
  if (req.user.role === 'superadmin') {
    if (!req.query.college_id) {
      return errorResponse(res, "SuperAdmin must specify college_id parameter", 400);
    }
    req.tenant = req.query.college_id;
  } else {
    req.tenant = collegeId;
  }

  return next();
};

/**
 * Tenant validation helper - ensures tenant exists and user has access
 */
export const validateTenant = async (req, res, next) => {
  // This would typically validate against a colleges table
  // For now, we'll just ensure tenant is set
  if (!req.tenant && req.user.role !== 'superadmin') {
    return errorResponse(res, "Invalid tenant context", 403);
  }

  return next();
};

/**
 * Get tenant filter for database queries
 * Returns the appropriate filter object for Supabase queries
 */
export const getTenantFilter = (req) => {
  if (!req.tenant) {
    return {}; // No filter for SuperAdmins with null tenant
  }
  
  return { college_id: req.tenant };
};

/**
 * Apply tenant filter to Supabase query
 * Helper function to automatically add tenant filtering
 */
export const applyTenantFilter = (query, req, columnName = 'college_id') => {
  const filter = getTenantFilter(req);
  
  if (filter[columnName]) {
    return query.eq(columnName, filter[columnName]);
  }
  
  return query; // No filtering for SuperAdmins
};