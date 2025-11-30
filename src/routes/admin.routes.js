import express from 'express';
import {
  getDashboardStats,
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
  getCommunities,
  generateReport
} from '../controllers/admin.controller.js';
import { 
  validate, 
  validatePagination,
  validateUUID,
  adminSchemas,
  communitySchemas
} from '../utils/validators.js';
import {
  adminCreateCommunityController,
  adminCommunityStatsController,
  getCommunityMessagesController,
  postCommunityMessageController
} from '../controllers/community.controller.js';

const router = express.Router();


 // Admin Routes
 // Base path: /api/admin
 // All routes require authentication and admin role

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

/////////////// USER MANAGEMENT /////////////////////
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
  validate(adminSchemas.createAnnouncement), 
  updateAnnouncement
);

router.delete('/announcements/:announcement_id', 
  validateUUID('announcement_id'), 
  deleteAnnouncement
);

// Community management (OLD - TO BE REPLACED)
// router.get('/communities', 
//   validatePagination, 
//   getCommunities
// );

// Community creation and stats (Admin)
// router.post('/communities', 
//   validate(communitySchemas.createCommunity),
//   adminCreateCommunityController
// );

// router.get('/communities/stats', adminCommunityStatsController);

// router.get('/communities/:id/messages', 
//   validateUUID('id'),
//   getCommunityMessagesController
// );

// router.post('/communities/:id/messages', 
//   validateUUID('id'),
//   validate(communitySchemas.postMessage),
//   postCommunityMessageController
// );

//////////////////////// COMMUNITY MANAGEMENT /////////////////////////////
// Import community routes
import communityRoutes from './community.routes.js';
router.use('/communities', communityRoutes);

// Reports
router.get('/reports', 
  generateReport
);

export default router;