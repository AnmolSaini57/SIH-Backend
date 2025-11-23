import express from 'express';
import {
  getProfile,
  updateProfile,
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

router.get('/appointment-requests', getAppointmentRequests);

router.put('/appointment-requests/:appointment_id/accept',
  validateUUID('appointment_id'),
  acceptAppointmentRequest
);

router.put('/appointment-requests/:appointment_id/decline',
  validateUUID('appointment_id'),
  declineAppointmentRequest
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