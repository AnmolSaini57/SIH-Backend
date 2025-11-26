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
  uploadResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  getDownloadUrl,
  getResourceStats
} from '../controllers/resources.controller.js';
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


// Counsellor Routes
// Base path: /api/counsellor
// All routes require authentication and counsellor role

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


// Resource management


// Get resource statistics
router.get('/resources/stats', getResourceStats);

// Upload new resource
router.post('/resources', uploadResource);

// Get all counsellor's resources
router.get('/resources', getResources);

// Get single resource by ID
router.get('/resources/:id', validateUUID('id'), getResourceById);

// Update resource metadata
router.put('/resources/:id', 
  validateUUID('id'),
  updateResource
);

// Delete resource
router.delete('/resources/:id', validateUUID('id'), deleteResource);

// Generate download URL for resource
router.get('/resources/:id/download', validateUUID('id'), getDownloadUrl);


export default router;