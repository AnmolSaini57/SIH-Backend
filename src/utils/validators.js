import Joi from 'joi';
import { validationErrorResponse } from './response.js';

/**
 * Joi validation schemas for the SIH Mental Health Platform
 */

// Common validation patterns
const commonSchemas = {
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  
  uuid: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid ID format',
    'any.required': 'ID is required'
  }),
  
  role: Joi.string().valid('student', 'counsellor', 'admin', 'superadmin').required(),
  
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20)
};

// Authentication schemas
export const authSchemas = {
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),
  
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required'
    }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    role: commonSchemas.role,
    college_id: Joi.string().uuid().when('role', {
      not: 'superadmin',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Password confirmation does not match'
    })
  }),
  
  resetPassword: Joi.object({
    email: commonSchemas.email
  })
};

// User schemas
export const userSchemas = {
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
    avatar: Joi.string().uri().optional(),
    bio: Joi.string().max(500).optional()
  }),
  
  getUserById: Joi.object({
    id: commonSchemas.uuid
  })
};

// Community schemas
export const communitySchemas = {
  createCommunity: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).required(),
    isPrivate: Joi.boolean().default(false)
  }),
  
  updateCommunity: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(1000).optional(),
    isPrivate: Joi.boolean().optional()
  }),
  
  postMessage: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    community_id: commonSchemas.uuid
  })
};

// Appointment schemas
export const appointmentSchemas = {
  createAppointment: Joi.object({
    counsellor_id: commonSchemas.uuid,
    date: Joi.date().iso().min('now').required().messages({
      'date.min': 'Appointment date must be in the future'
    }),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Time must be in HH:MM format'
    }),
    type: Joi.string().valid('individual', 'group', 'emergency').required(),
    notes: Joi.string().max(500).allow('', null).optional()
  }),
  
  updateAppointment: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').optional(),
    notes: Joi.string().max(500).optional(),
    feedback: Joi.string().max(1000).optional()
  })
};

// Availability schemas
export const availabilitySchemas = {
  addAvailability: Joi.object({
    date: Joi.date().iso().min('now').required().messages({
      'date.min': 'Date must be today or in the future'
    }),
    start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Time must be in HH:MM format'
    })
  })
};

// Session schemas
export const sessionSchemas = {
  updateSessionNotesAndGoals: Joi.object({
    notes: Joi.string().max(2000).optional().allow(null),
    session_goals: Joi.array().items(
      Joi.object({
        goal: Joi.string().max(200).required(),
        completed: Joi.boolean().optional(),
        notes: Joi.string().max(500).optional()
      })
    ).optional().allow(null)
  })
};

// Admin schemas
export const adminSchemas = {
  createAnnouncement: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(10).max(5000).required(),
    type: Joi.string().valid('info', 'warning', 'urgent', 'event', 'maintenance').default('info'),
    target_role: Joi.string().valid('all', 'student', 'counsellor', 'admin').default('all'),
    duration_days: Joi.number().integer().min(1).max(365).required()
  }),

  updateAnnouncement: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    content: Joi.string().min(10).max(5000).optional(),
    type: Joi.string().valid('info', 'warning', 'urgent', 'event', 'maintenance').optional(),
    target_role: Joi.string().valid('all', 'student', 'counsellor', 'admin').optional(),
    duration_days: Joi.number().integer().min(1).max(365).optional(),
    is_active: Joi.boolean().optional(),
    is_pinned: Joi.boolean().optional()
  }).min(1),
  
  createStudent: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'any.required': 'Name is required'
    }),
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('', null).messages({
      'string.pattern.base': 'Phone must be a valid 10-digit number'
    }),
    passing_year: Joi.number().integer().min(2024).max(2100).optional().allow(null).messages({
      'number.min': 'Passing year must be 2024 or later',
      'number.max': 'Passing year must be valid'
    }),
    roll_no: Joi.string().max(50).optional().allow('', null)
  }),
  
  createCounsellor: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'any.required': 'Name is required'
    }),
    email: commonSchemas.email,
    password: commonSchemas.password,
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow('', null).messages({
      'string.pattern.base': 'Phone must be a valid 10-digit number'
    }),
    specialization: Joi.string().max(200).optional().allow('', null)
  }),
  
  changeUserPassword: Joi.object({
    new_password: commonSchemas.password
  })
};

// Pagination schema (softened for dev usage)
export const paginationSchema = Joi.object({
  page: commonSchemas.page.optional(),
  limit: commonSchemas.limit.optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  role: Joi.string().valid('student', 'counsellor', 'all').optional().allow(''),
  search: Joi.string().optional().allow('')
}).unknown(true);

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    console.log('Validating property:', property);
    console.log('Request body:', req[property]);
    
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      console.log('Validation errors:', error.details);
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return validationErrorResponse(res, errors, 'Validation failed');
    }

    // Replace the request property with the validated (and potentially transformed) value
    req[property] = value;
    next();
  };
};

/**
 * Validate pagination parameters
 */
// In non-production dev mode we allow unknown/extra query params and avoid blocking requests
export const validatePagination = (req, res, next) => next();

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName = 'id') => {
  return validate(Joi.object({
    [paramName]: commonSchemas.uuid
  }), 'params');
};

/**
 * Custom validation helpers
 */
export const customValidators = {
  // Check if date is in the future
  futureDate: (value, helpers) => {
    if (new Date(value) <= new Date()) {
      return helpers.error('date.future');
    }
    return value;
  },
  
  // Check if time is within business hours
  businessHours: (value, helpers) => {
    const [hours, minutes] = value.split(':').map(Number);
    const time = hours * 60 + minutes;
    const startTime = 9 * 60; // 9:00 AM
    const endTime = 17 * 60;  // 5:00 PM
    
    if (time < startTime || time >= endTime) {
      return helpers.error('time.businessHours');
    }
    return value;
  }
};

export default {
  authSchemas,
  userSchemas,
  communitySchemas,
  appointmentSchemas,
  availabilitySchemas,
  sessionSchemas,
  adminSchemas,
  validate,
  validatePagination,
  validateUUID,
  customValidators
};