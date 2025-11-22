import express from 'express';
import {
  getProfile,
  updateProfile,
  getStudents,
  getStudentDetails,
  getAppointments,
  updateAppointment,
  addSessionNote,
  getSessionNotes,
  getResources,
  getDashboardStats
} from '../controllers/counsellor.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  userSchemas,
  appointmentSchemas
} from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

/**
 * Counsellor Routes
 * Base path: /api/counsellor
 * All routes require authentication and counsellor role
 */

// Profile management
router.get('/profile', getProfile);

router.put('/profile', 
  validate(userSchemas.updateProfile), 
  updateProfile
);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Student management
router.get('/students', 
  validatePagination, 
  getStudents
);

router.get('/students/:student_id', 
  validateUUID('student_id'), 
  getStudentDetails
);

// Appointment management
router.get('/appointments', 
  validatePagination, 
  getAppointments
);

router.put('/appointments/:appointment_id', 
  validateUUID('appointment_id'),
  validate(appointmentSchemas.updateAppointment), 
  updateAppointment
);

// Session notes
router.post('/session-notes', 
  validate(Joi.object({
    student_id: Joi.string().uuid().required(),
    content: Joi.string().min(10).max(5000).required(),
    session_date: Joi.date().iso().optional(),
    appointment_id: Joi.string().uuid().optional()
  })), 
  addSessionNote
);

router.get('/session-notes/:student_id', 
  validateUUID('student_id'),
  validatePagination, 
  getSessionNotes
);

// Resources
router.get('/resources', 
  validatePagination, 
  getResources
);

export default router;