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
  getDashboardStats,
  getAppointmentRequests,
  acceptAppointmentRequest,
  declineAppointmentRequest,
  addAvailability,
  getSessions,
  getSessionsSummary,
  updateSessionNotesAndGoals
} from '../controllers/counsellor.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  userSchemas,
  appointmentSchemas,
  availabilitySchemas,
  sessionSchemas
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

router.get('/appointment-requests', getAppointmentRequests);

router.put('/appointment-requests/:appointment_id/accept',
  validateUUID('appointment_id'),
  acceptAppointmentRequest
);

router.put('/appointment-requests/:appointment_id/decline',
  validateUUID('appointment_id'),
  declineAppointmentRequest
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

// Availability management
router.post('/manage-availability',
  validate(availabilitySchemas.addAvailability),
  addAvailability
);

// Sessions (all appointments for counsellor)
router.get('/sessions', getSessions);

// Sessions summary (completed appointments with notes and goals)
router.get('/sessions-summary', getSessionsSummary);

router.put('/sessions-summary/:appointment_id',
  validateUUID('appointment_id'),
  validate(sessionSchemas.updateSessionNotesAndGoals),
  updateSessionNotesAndGoals
);

export default router;