import express from 'express';
import {
  getDashboardStats,
  getUsers,
  getUserDetails,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  getAssessmentAnalytics,
  getCommunities,
  generateReport
} from '../controllers/admin.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  adminSchemas
} from '../utils/validators.js';

const router = express.Router();

/**
 * Admin Routes
 * Base path: /api/admin
 * All routes require authentication and admin role
 */

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// User management
router.get('/users', 
  validatePagination, 
  getUsers
);

router.get('/users/:user_id', 
  validateUUID('user_id'), 
  getUserDetails
);

// Announcement management
router.post('/announcements', 
  validate(adminSchemas.createAnnouncement), 
  createAnnouncement
);

router.get('/announcements', 
  validatePagination, 
  getAnnouncements
);

router.put('/announcements/:announcement_id', 
  validateUUID('announcement_id'),
  validate(adminSchemas.createAnnouncement), 
  updateAnnouncement
);

router.delete('/announcements/:announcement_id', 
  validateUUID('announcement_id'), 
  deleteAnnouncement
);

// Analytics
router.get('/analytics/assessments', 
  getAssessmentAnalytics
);

// Community management
router.get('/communities', 
  validatePagination, 
  getCommunities
);

// Reports
router.get('/reports', 
  generateReport
);

export default router;