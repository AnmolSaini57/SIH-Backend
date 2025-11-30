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
  getCollegeCounsellorsForMessaging
} from '../controllers/student.controller.js';
import {
  submitAssessmentController,
  getAssessmentHistoryController,
  getAssessmentByIdController,
  getAssessmentStatsController,
  getAvailableAssessments
} from '../controllers/assessment.controller.js';
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
// Import community routes
import communityRoutes from './community.routes.js';
router.use('/communities', communityRoutes);

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

export default router;





