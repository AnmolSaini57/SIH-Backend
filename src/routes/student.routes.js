import express from 'express';
import {
  getProfile,
  updateProfile,
  getAssessments,
  submitAssessment,
  getCommunities,
  joinCommunity,
  bookAppointment,
  getCollegeCounsellorsWithAvailability,
  getMyAppointments,
  getSessionsSummary
} from '../controllers/student.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  userSchemas,
  assessmentSchemas,
  appointmentSchemas
} from '../utils/validators.js';

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





















// Assessment management
router.get('/assessments', 
  validatePagination, 
  getAssessments
);

router.post('/assessments', 
  validate(assessmentSchemas.submitAssessment), 
  submitAssessment
);

// Community management
router.get('/communities', 
  validatePagination, 
  getCommunities
);

router.post('/communities/:community_id/join', 
  validateUUID('community_id'), 
  joinCommunity
);

export default router;





