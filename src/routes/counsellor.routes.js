import express from 'express';
import {
  getProfile,
  updateProfile,
  getDashboardStats,
  getAppointmentRequests,
  acceptAppointmentRequest,
  declineAppointmentRequest,
  addAvailability,
  getAvailability,
  deleteAvailability,
  getSessions,
  getSessionsSummary,
  updateSessionNotesAndGoals,
  createRealtimeSession
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
  getCounsellorConversationsController,
  getConversationMessagesController,
  markMessagesAsReadController,
  getUnreadCountController,
  getConversationByIdController,
  deleteConversationController
} from '../controllers/messaging.controller.js';
import {
  getAnnouncementsForUser,
  markAnnouncementSeen
} from '../controllers/announcement.controller.js';
import {
  getAssessmentAnalytics
} from '../controllers/admin.controller.js';
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

//////////////// PROFILE MANAGEMENT /////////////////////////////
router.get('/profile', getProfile);

router.put('/profile', 
  validate(userSchemas.updateProfile), 
  updateProfile
);

//////////////// ANNOUNCEMENTS /////////////////////////////
router.get('/announcements', getAnnouncementsForUser);

router.post('/announcements/:announcement_id/seen',
  validateUUID('announcement_id'),
  markAnnouncementSeen
);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Analytics
router.get('/analytics/assessments', getAssessmentAnalytics);


/////////////////// APPOINTMENT MANAGEMENT ///////////////////////////////

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
router.get('/manage-availability', getAvailability);

router.post('/manage-availability',
  validate(availabilitySchemas.addAvailability),
  addAvailability
);

router.get('/manage-availability',
  getAvailability
);

router.delete('/manage-availability/:availability_id',
  validateUUID('availability_id'),
  deleteAvailability
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


/////////////////// RESOURCE MANAGEMENT ///////////////////////////////

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

//////////////////////// MESSAGING /////////////////////////////

// Get all conversations for the counsellor
router.get('/conversations', getCounsellorConversationsController);

// Get a specific conversation
router.get('/conversations/:id', 
  validateUUID('id'), 
  getConversationByIdController
);

// Get messages in a conversation (with pagination)
router.get('/conversations/:id/messages',
  validateUUID('id'),
  getConversationMessagesController
);

// Mark messages as read in a conversation
router.put('/conversations/:id/read',
  validateUUID('id'),
  markMessagesAsReadController
);

// Delete a conversation
router.delete('/conversations/:id',
  validateUUID('id'),
  deleteConversationController
);

// Get total unread message count
router.get('/messages/unread-count', getUnreadCountController);

//////////////////////// COMMUNITY MANAGEMENT /////////////////////////////
// Import community controller for counsellor-specific endpoints
import communityController from '../controllers/community.controller.js';

// Get all communities (joined and available)
router.get('/communities/all', communityController.getCounsellorCommunities);

// Get joined communities only
router.get('/communities/joined', communityController.getCounsellorJoinedCommunities);

// Get available (not joined) communities only
router.get('/communities/available', communityController.getCounsellorAvailableCommunities);

// Join a community
router.post('/communities/:communityId/join', 
  validateUUID('communityId'), 
  communityController.counsellorJoinCommunity
);

// Leave a community
router.delete('/communities/:communityId/leave', 
  validateUUID('communityId'), 
  communityController.counsellorLeaveCommunity
);

// Get messages from a specific community
router.get('/communities/:communityId/messages', 
  validateUUID('communityId'), 
  communityController.getCounsellorCommunityMessages
);

// Voice Chat Realtime Session
router.post('/realtime-session', createRealtimeSession);

export default router;