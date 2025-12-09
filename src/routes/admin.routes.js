import express from 'express';
import {
  getDashboardStats,
  getUserStats,
  getUsers,
  getUserDetails,
  createStudent,
  createCounsellor,
  deleteUser,
  changeUserPassword,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  generateReport,
  getAdminProfile,
  updateAdminProfile,
  createRealtimeSession,
  getAssessmentAnalytics
} from '../controllers/admin.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  adminSchemas,
} from '../utils/validators.js';

const router = express.Router();


 // Admin Routes
 // Base path: /api/admin
 // All routes require authentication and admin role

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Analytics
router.get('/analytics/assessments', getAssessmentAnalytics);

/////////////// PROFILE MANAGEMENT /////////////////////
// Get admin profile
router.get('/profile', getAdminProfile);

router.put('/profile',
  validate(adminSchemas.updateProfile),
  updateAdminProfile
);

/////////////// USER MANAGEMENT /////////////////////
// Get user statistics
router.get('/users/stats', getUserStats);

router.get('/users', 
  validatePagination, 
  getUsers
);

router.get('/users/:user_id', 
  validateUUID('user_id'), 
  getUserDetails
);

// Create student
router.post('/users/students',
  validate(adminSchemas.createStudent),
  createStudent
);

// Create counsellor
router.post('/users/counsellors',
  validate(adminSchemas.createCounsellor),
  createCounsellor
);

// Delete user
router.delete('/users/:user_id',
  validateUUID('user_id'),
  deleteUser
);

// Change user password
router.put('/users/:user_id/password',
  validateUUID('user_id'),
  validate(adminSchemas.changeUserPassword),
  changeUserPassword
);


// Announcement management
router.post('/announcements', 
  validate(adminSchemas.createAnnouncement), 
  createAnnouncement
);

router.get('/announcements', 
  validatePagination, 
  getAnnouncements
);

router.put('/announcements/:announcement_id', 
  validateUUID('announcement_id'),
  validate(adminSchemas.updateAnnouncement), 
  updateAnnouncement
);

router.delete('/announcements/:announcement_id', 
  validateUUID('announcement_id'), 
  deleteAnnouncement
);

//////////////////////// COMMUNITY MANAGEMENT /////////////////////////////
import communityController from '../controllers/community.controller.js';

// Get community statistics
router.get('/communities/statistics', communityController.getAdminStatistics);

// Get all communities
router.get('/communities', communityController.getAdminCommunities);

// Get single community details
router.get('/communities/:communityId', 
  validateUUID('communityId'), 
  communityController.getCommunityDetails
);

// Create a new community
router.post('/communities', communityController.createCommunity);

// Update a community
router.put('/communities/:communityId', 
  validateUUID('communityId'), 
  communityController.updateCommunity
);

// Delete a community
router.delete('/communities/:communityId', 
  validateUUID('communityId'), 
  communityController.deleteCommunity
);

// Get messages from a specific community
router.get('/communities/:communityId/messages', 
  validateUUID('communityId'), 
  communityController.getAdminCommunityMessages
);




// Reports
router.get('/reports', 
  generateReport
);

// Voice Chat Realtime Session
router.post('/realtime-session', createRealtimeSession);

export default router;