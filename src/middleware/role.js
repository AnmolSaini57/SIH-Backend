import { errorResponse } from "../utils/response.js";

/**
 * Role-based access control middleware
 * Ensures user has the required role to access the route
 * 
 * @param {string|array} requiredRole - Required role(s) for access
 * @returns {function} Middleware function
 */
export default function role(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const userRole = req.user.role;
    
    console.log(`[Role Check] User: ${req.user.user_id}, Role: ${userRole}, Required: ${requiredRole}`);
    
    // Handle multiple allowed roles
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(userRole)) {
        console.log(`[Role Check FAILED] User role '${userRole}' not in required roles: [${requiredRole.join(', ')}]`);
        return errorResponse(res, `Access denied. Required role: ${requiredRole.join(' or ')}`, 403);
      }
    } else {
      // Handle single required role
      if (userRole !== requiredRole) {
        console.log(`[Role Check FAILED] User role '${userRole}' doesn't match required '${requiredRole}'`);
        return errorResponse(res, `Access denied. Required role: ${requiredRole}`, 403);
      }
    }

    // SuperAdmin has access to everything
    if (userRole === 'superadmin') {
      console.log(`[Role Check PASSED] SuperAdmin access`);
      return next();
    }

    console.log(`[Role Check PASSED] User has required role`);
    return next();
  };
}

/**
 * Role hierarchy middleware - allows higher roles to access lower role routes
 * Hierarchy: superadmin > admin > counsellor > student
 */
export const roleHierarchy = (minRole) => {
  const hierarchy = {
    'student': 1,
    'counsellor': 2,
    'admin': 3,
    'superadmin': 4
  };

  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const userRoleLevel = hierarchy[req.user.role] || 0;
    const minRoleLevel = hierarchy[minRole] || 999;

    if (userRoleLevel < minRoleLevel) {
      return errorResponse(res, `Access denied. Minimum role required: ${minRole}`, 403);
    }

    return next();
  };
};

/**
 * Check if user is admin or higher
 */
export const adminOrAbove = role(['admin', 'superadmin']);

/**
 * Check if user is counsellor or higher
 */
export const counsellorOrAbove = role(['counsellor', 'admin', 'superadmin']);

/**
 * SuperAdmin only access
 */
export const superAdminOnly = role('superadmin');