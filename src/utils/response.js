/**
 * Standardized API response utilities
 * Provides consistent response format across all endpoints
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...(data !== null && { data })
  };

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Object} errors - Additional error details
 * @returns {Object} JSON response
 */
export const errorResponse = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    error: {
      message,
      code: statusCode,
      timestamp: new Date().toISOString(),
      ...(errors && { details: errors })
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 * @returns {Object} JSON response
 */
export const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null
    }
  };

  return res.status(200).json(response);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} validationErrors - Validation error details
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
export const validationErrorResponse = (res, validationErrors, message = 'Validation failed') => {
  return errorResponse(res, message, 422, {
    validation: validationErrors
  });
};

/**
 * Send an authentication error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
export const authErrorResponse = (res, message = 'Authentication failed') => {
  return errorResponse(res, message, 401);
};

/**
 * Send an authorization error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
export const authorizationErrorResponse = (res, message = 'Access denied') => {
  return errorResponse(res, message, 403);
};

/**
 * Send a not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name that wasn't found
 * @returns {Object} JSON response
 */
export const notFoundResponse = (res, resource = 'Resource') => {
  return errorResponse(res, `${resource} not found`, 404);
};

/**
 * Send a conflict error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
export const conflictResponse = (res, message = 'Resource already exists') => {
  return errorResponse(res, message, 409);
};

/**
 * Send an internal server error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Additional error details (only in development)
 * @returns {Object} JSON response
 */
export const serverErrorResponse = (res, message = 'Internal server error', errorDetails = null) => {
  const errors = process.env.NODE_ENV === 'development' ? errorDetails : null;
  return errorResponse(res, message, 500, errors);
};

/**
 * Format Supabase error for consistent response
 * @param {Object} error - Supabase error object
 * @returns {Object} Formatted error object
 */
export const formatSupabaseError = (error) => {
  const commonErrors = {
    '23505': 'Resource already exists',
    '23503': 'Referenced resource does not exist',
    '42501': 'Insufficient permissions',
    'PGRST116': 'Resource not found',
    'PGRST301': 'Invalid request format'
  };

  return {
    message: commonErrors[error.code] || error.message || 'Database error',
    code: error.code,
    details: error.details,
    hint: error.hint
  };
};

/**
 * Handle async route errors
 * Wrapper for async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};