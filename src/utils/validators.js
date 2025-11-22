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
  
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  uuid: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid ID format',
    'any.required': 'ID is required'
  }),
  
  role: Joi.string().valid('student', 'counsellor', 'admin', 'superadmin').required(),
  
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
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

// Assessment schemas
export const assessmentSchemas = {
  submitAssessment: Joi.object({
    form_id: Joi.string().required(),
    responses: Joi.object().required(),
    session_id: Joi.string().uuid().optional()
  }),
  
  createAssessmentForm: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000).required(),
    questions: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('likert', 'multiple-choice', 'text', 'scale').required(),
        options: Joi.array().when('type', {
          is: Joi.string().valid('likert', 'multiple-choice'),
          then: Joi.required(),
          otherwise: Joi.optional()
        })
      })
    ).min(1).required()
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
    notes: Joi.string().max(500).optional()
  }),
  
  updateAppointment: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').optional(),
    notes: Joi.string().max(500).optional(),
    feedback: Joi.string().max(1000).optional()
  })
};

// Admin schemas
export const adminSchemas = {
  createAnnouncement: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(10).max(5000).required(),
    type: Joi.string().valid('info', 'warning', 'urgent', 'event').default('info'),
    target_role: Joi.string().valid('all', 'student', 'counsellor').default('all')
  })
};

// Pagination schema
export const paginationSchema = Joi.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
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
export const validatePagination = validate(paginationSchema, 'query');

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
  assessmentSchemas,
  communitySchemas,
  appointmentSchemas,
  adminSchemas,
  validate,
  validatePagination,
  validateUUID,
  customValidators
};