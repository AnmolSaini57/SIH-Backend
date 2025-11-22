import express from 'express';
import {
  getProfile,
  updateProfile,
  getAssessments,
  submitAssessment,
  getCommunities,
  joinCommunity,
  getAppointments,
  bookAppointment
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

// Profile management
router.get('/profile', getProfile);

router.put('/profile', 
  validate(userSchemas.updateProfile), 
  updateProfile
);

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

// Appointment management
router.get('/appointments', 
  validatePagination, 
  getAppointments
);

router.post('/appointments', 
  validate(appointmentSchemas.createAppointment), 
  bookAppointment
);

export default router;