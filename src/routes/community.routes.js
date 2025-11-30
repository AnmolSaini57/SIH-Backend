import express from 'express';
import communityController from '../controllers/community.controller.js';

const router = express.Router();

/**
 * Community Routes for Students
 * Base path: /api/students/communities
 */

// Get all communities (joined and available)
router.get('/all', communityController.getStudentCommunities);

// Get joined communities only
router.get('/joined', communityController.getStudentJoinedCommunities);

// Get available (not joined) communities only
router.get('/available', communityController.getStudentAvailableCommunities);

// Join a community
router.post('/:communityId/join', communityController.joinCommunity);

// Leave a community
router.delete('/:communityId/leave', communityController.leaveCommunity);

// Get messages from a specific community
router.get('/:communityId/messages', communityController.getStudentCommunityMessages);

export default router;
