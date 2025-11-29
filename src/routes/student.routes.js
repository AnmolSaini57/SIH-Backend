import express from 'express';
import {
  getProfile,
  updateProfile,
  getCommunities,
  joinCommunity,
  bookAppointment,
  getCollegeCounsellorsWithAvailability,
  getMyAppointments,
  getSessionsSummary
} from '../controllers/student.controller.js';
import {
  submitAssessmentController,
  getAssessmentHistoryController,
  getAssessmentByIdController,
  getAssessmentStatsController,
  getAvailableAssessments
} from '../controllers/assessment.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  userSchemas,
  appointmentSchemas
} from '../utils/validators.js';
import journalingRoutes from './journaling.routes.js';

const router = express.Router();

/**
 * Student Routes
 * Base path: /api/student
 * All routes require authentication and student role
 */

//////////////////////// PROFILE MANAGEMENT /////////////////////////////
router.get('/profile', getProfile);

router.put('/profile', 
  validate(userSchemas.updateProfile), 
  updateProfile
);

//////////////////////// APPPOINTMENT MANAGEMENT /////////////////////////////

router.post('/appointments', 
  validate(appointmentSchemas.createAppointment), 
  bookAppointment
);

// Counsellors with availability for a given date
router.get('/college-counsellors', getCollegeCounsellorsWithAvailability);

// All appointments for the logged in student (no pagination)
router.get('/my-appointments', getMyAppointments);

// Completed sessions summary with session notes and goals
router.get('/sessions-summary', getSessionsSummary);


















// Community management
router.get('/communities', 
  validatePagination, 
  getCommunities
);

router.post('/communities/:community_id/join', 
  validateUUID('community_id'), 
  joinCommunity
);

//////////////////////// ASSESSMENT MANAGEMENT /////////////////////////////

// Get available assessment forms
router.get('/assessments/available', getAvailableAssessments);

// Get assessment statistics
router.get('/assessments/stats', getAssessmentStatsController);

// Get assessment history (with optional filters)
router.get('/assessments', getAssessmentHistoryController);

// Get single assessment by ID
router.get('/assessments/:id', getAssessmentByIdController);

// Submit a new assessment
router.post('/assessments', submitAssessmentController);

//////////////////////// JOURNALING /////////////////////////////

// Mount journaling routes under /journal
router.use('/journal', journalingRoutes);

export default router;





