import express from 'express';
import {
  getGlobalDashboardStats,
  getColleges,
  createCollege,
  updateCollege,
  getCollegeDetails,
  getGlobalAnalytics,
  getSystemHealth,
  createSystemAdmin
} from '../controllers/superadmin.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  authSchemas
} from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

/**
 * SuperAdmin Routes
 * Base path: /api/superadmin
 * All routes require authentication and superadmin role
 */

// Global dashboard
router.get('/dashboard/stats', getGlobalDashboardStats);

// College management
router.get('/colleges', 
  validatePagination, 
  getColleges
);

router.post('/colleges', 
  validate(Joi.object({
    name: Joi.string().min(3).max(200).required(),
    code: Joi.string().min(2).max(20).required(),
    address: Joi.string().max(500).optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional()
  })), 
  createCollege
);

router.put('/colleges/:college_id', 
  validateUUID('college_id'),
  validate(Joi.object({
    name: Joi.string().min(3).max(200).optional(),
    address: Joi.string().max(500).optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional(),
    is_active: Joi.boolean().optional()
  })), 
  updateCollege
);

router.get('/colleges/:college_id', 
  validateUUID('college_id'), 
  getCollegeDetails
);

// Analytics
router.get('/analytics/global', 
  getGlobalAnalytics
);

// System management
router.get('/system/health', 
  getSystemHealth
);

router.post('/system/admins', 
  validate(Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(100).required(),
    college_id: Joi.string().uuid().required()
  })), 
  createSystemAdmin
);

export default router;