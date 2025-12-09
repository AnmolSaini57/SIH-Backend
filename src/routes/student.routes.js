import express from 'express';
import {
  getProfile,
  updateProfile,
  getCommunities,
  joinCommunity,
  bookAppointment,
  getCollegeCounsellorsWithAvailability,
  getMyAppointments,
  getSessionsSummary,
  getCollegeCounsellorsForMessaging,
  createRealtimeSession
} from '../controllers/student.controller.js';
import {
  submitAssessmentController,
  getAssessmentHistoryController,
  getAssessmentByIdController,
  getAssessmentStatsController,
  getAvailableAssessments
} from '../controllers/assessment.controller.js';
import {
  getAnnouncementsForUser,
  markAnnouncementSeen
} from '../controllers/announcement.controller.js';
import {
  createConversationController,
  getStudentConversationsController,
  getConversationMessagesController,
  markMessagesAsReadController,
  getUnreadCountController,
  getConversationByIdController,
  deleteConversationController
} from '../controllers/messaging.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  userSchemas,
  appointmentSchemas
} from '../utils/validators.js';
import journalingRoutes from './journaling.routes.js';
import memoryWallRoutes from './memoryWall.routes.js';

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

//////////////////////// ANNOUNCEMENTS /////////////////////////////
router.get('/announcements', getAnnouncementsForUser);

router.post('/announcements/:announcement_id/seen',
  validateUUID('announcement_id'),
  markAnnouncementSeen
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


//////////////////////// MESSAGING /////////////////////////////

// Get all counsellors from student's college for messaging
router.get('/counsellors-for-messaging', getCollegeCounsellorsForMessaging);

// Get all conversations for the student
router.get('/conversations', getStudentConversationsController);

// Create or get conversation with a counsellor
router.post('/conversations', createConversationController);

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
// Import community controller for student-specific endpoints
import communityController from '../controllers/community.controller.js';

// Get all communities (joined and available)
router.get('/communities/all', communityController.getStudentCommunities);

// Get joined communities only
router.get('/communities/joined', communityController.getStudentJoinedCommunities);

// Get available (not joined) communities only
router.get('/communities/available', communityController.getStudentAvailableCommunities);

// Join a community
router.post('/communities/:communityId/join', 
  validateUUID('communityId'), 
  communityController.joinCommunity
);

// Leave a community
router.delete('/communities/:communityId/leave', 
  validateUUID('communityId'), 
  communityController.leaveCommunity
);

// Get messages from a specific community
router.get('/communities/:communityId/messages', 
  validateUUID('communityId'), 
  communityController.getStudentCommunityMessages
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

// Mount journaling routes
router.use('/journal', journalingRoutes);

//////////////////////// MEMORY WALL /////////////////////////////

// Mount memory wall routes
router.use('/memory-wall', memoryWallRoutes);

//////////////////////// REALTIME VOICE SESSION /////////////////////////////

/**
 * Create OpenAI Realtime Voice Session
 * POST /api/student/realtime-session
 * Returns ephemeral token for WebRTC voice connection
 */
router.post('/realtime-session', createRealtimeSession);

export default router;





