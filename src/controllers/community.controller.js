import communityService from '../services/community.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Community Controller
 * Handles HTTP requests for community chatrooms
 */

class CommunityController {
  // ==================== STUDENT ENDPOINTS ====================

  /**
   * Get all communities (joined and available) for a student
   * GET /api/students/communities/all
   */
  async getStudentCommunities(req, res) {
    try {
      const userId = req.user.id;
      const collegeId = req.user.college_id;

      console.log('🔍 [DEBUG] Student Communities Request:');
      console.log('   User ID:', userId);
      console.log('   College ID:', collegeId);
      console.log('   User Role:', req.user.role);
      console.log('   Full req.user:', JSON.stringify(req.user, null, 2));

      const communities = await communityService.getAllCommunities(userId, collegeId);
      
      console.log(' [DEBUG] Communities fetched:', communities.length, 'communities');
      console.log('   Community IDs:', communities.map(c => c.id));
      
      return successResponse(res, communities, 'Communities fetched successfully');
    } catch (error) {
      console.error(' Error fetching student communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get joined communities for a student
   * GET /api/students/communities/joined
   */
  async getStudentJoinedCommunities(req, res) {
    try {
      const userId = req.user.id;
      const collegeId = req.user.college_id;

      const communities = await communityService.getJoinedCommunities(userId, collegeId);
      return successResponse(res, communities, 'Joined communities fetched successfully');
    } catch (error) {
      console.error('Error fetching joined communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get available (not joined) communities for a student
   * GET /api/students/communities/available
   */
  async getStudentAvailableCommunities(req, res) {
    try {
      const userId = req.user.id;
      const collegeId = req.user.college_id;

      const communities = await communityService.getAvailableCommunities(userId, collegeId);
      return successResponse(res, communities, 'Available communities fetched successfully');
    } catch (error) {
      console.error('Error fetching available communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Join a community
   * POST /api/students/communities/:communityId/join
   */
  async joinCommunity(req, res) {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;

      const membership = await communityService.joinCommunity(userId, communityId, 'student');
      return successResponse(res, membership, 'Successfully joined community', 201);
    } catch (error) {
      console.error('Error joining community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Leave a community
   * DELETE /api/students/communities/:communityId/leave
   */
  async leaveCommunity(req, res) {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;

      await communityService.leaveCommunity(userId, communityId);
      return successResponse(res, null, 'Successfully left community');
    } catch (error) {
      console.error('Error leaving community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get messages from a community
   * GET /api/students/communities/:communityId/messages
   */
  async getStudentCommunityMessages(req, res) {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;
      const { limit = 100, before } = req.query;

      // Check if user is a member
      const isMember = await communityService.isMember(userId, communityId);
      if (!isMember) {
        return errorResponse(res, 'You must join the community to view messages', 403);
      }

      const messages = await communityService.getCommunityMessages(
        communityId,
        parseInt(limit),
        before
      );
      return successResponse(res, messages, 'Messages fetched successfully');
    } catch (error) {
      console.error('Error fetching community messages:', error);
      return errorResponse(res, error.message);
    }
  }

  // ==================== COUNSELLOR ENDPOINTS ====================

  /**
   * Get all communities (joined and available) for a counsellor
   * GET /api/counsellors/communities/all
   */
  async getCounsellorCommunities(req, res) {
    try {
      const userId = req.user.id;
      const collegeId = req.user.college_id;

      const communities = await communityService.getAllCommunities(userId, collegeId);
      return successResponse(res, communities, 'Communities fetched successfully');
    } catch (error) {
      console.error('Error fetching counsellor communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get joined communities for a counsellor
   * GET /api/counsellors/communities/joined
   */
  async getCounsellorJoinedCommunities(req, res) {
    try {
      const userId = req.user.id;
      const collegeId = req.user.college_id;

      const communities = await communityService.getJoinedCommunities(userId, collegeId);
      return successResponse(res, communities, 'Joined communities fetched successfully');
    } catch (error) {
      console.error('Error fetching joined communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get available (not joined) communities for a counsellor
   * GET /api/counsellors/communities/available
   */
  async getCounsellorAvailableCommunities(req, res) {
    try {
      const userId = req.user.id;
      const collegeId = req.user.college_id;

      const communities = await communityService.getAvailableCommunities(userId, collegeId);
      return successResponse(res, communities, 'Available communities fetched successfully');
    } catch (error) {
      console.error('Error fetching available communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Counsellor join a community
   * POST /api/counsellors/communities/:communityId/join
   */
  async counsellorJoinCommunity(req, res) {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;

      const membership = await communityService.joinCommunity(userId, communityId, 'counsellor');
      return successResponse(res, membership, 'Successfully joined community', 201);
    } catch (error) {
      console.error('Error joining community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Counsellor leave a community
   * DELETE /api/counsellors/communities/:communityId/leave
   */
  async counsellorLeaveCommunity(req, res) {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;

      await communityService.leaveCommunity(userId, communityId);
      return successResponse(res, null, 'Successfully left community');
    } catch (error) {
      console.error('Error leaving community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get messages from a community (counsellor)
   * GET /api/counsellors/communities/:communityId/messages
   */
  async getCounsellorCommunityMessages(req, res) {
    try {
      const userId = req.user.id;
      const { communityId } = req.params;
      const { limit = 100, before } = req.query;

      // Check if counsellor is a member
      const isMember = await communityService.isMember(userId, communityId);
      if (!isMember) {
        return errorResponse(res, 'You must join the community to view messages', 403);
      }

      const messages = await communityService.getCommunityMessages(
        communityId,
        parseInt(limit),
        before
      );
      return successResponse(res, messages, 'Messages fetched successfully');
    } catch (error) {
      console.error('Error fetching community messages:', error);
      return errorResponse(res, error.message);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get community statistics for admin
   * GET /api/admins/communities/statistics
   */
  async getAdminStatistics(req, res) {
    try {
      const collegeId = req.user.college_id;

      const statistics = await communityService.getCommunityStatistics(collegeId);
      return successResponse(res, statistics, 'Statistics fetched successfully');
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get all communities for admin
   * GET /api/admins/communities
   */
  async getAdminCommunities(req, res) {
    try {
      const collegeId = req.user.college_id;

      const communities = await communityService.getAdminCommunities(collegeId);
      return successResponse(res, communities, 'Communities fetched successfully');
    } catch (error) {
      console.error('Error fetching communities:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Create a new community
   * POST /api/admins/communities
   */
  async createCommunity(req, res) {
    try {
      const adminId = req.user.id;
      const collegeId = req.user.college_id;
      const { title, description } = req.body;

      // Validation
      if (!title || title.trim().length === 0) {
        return errorResponse(res, 'Community title is required', 400);
      }

      if (title.length > 100) {
        return errorResponse(res, 'Community title must be less than 100 characters', 400);
      }

      if (description && description.length > 500) {
        return errorResponse(res, 'Community description must be less than 500 characters', 400);
      }

      const community = await communityService.createCommunity(
        adminId,
        collegeId,
        title.trim(),
        description?.trim()
      );

      return successResponse(res, community, 'Community created successfully', 201);
    } catch (error) {
      console.error('Error creating community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Update a community
   * PUT /api/admins/communities/:communityId
   */
  async updateCommunity(req, res) {
    try {
      const collegeId = req.user.college_id;
      const { communityId } = req.params;
      const { title, description } = req.body;

      // Validation
      if (!title || title.trim().length === 0) {
        return errorResponse(res, 'Community title is required', 400);
      }

      if (title.length > 100) {
        return errorResponse(res, 'Community title must be less than 100 characters', 400);
      }

      if (description && description.length > 500) {
        return errorResponse(res, 'Community description must be less than 500 characters', 400);
      }

      const community = await communityService.updateCommunity(communityId, collegeId, {
        title: title.trim(),
        description: description?.trim(),
      });

      return successResponse(res, community, 'Community updated successfully');
    } catch (error) {
      console.error('Error updating community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Delete a community
   * DELETE /api/admins/communities/:communityId
   */
  async deleteCommunity(req, res) {
    try {
      const collegeId = req.user.college_id;
      const { communityId } = req.params;

      await communityService.deleteCommunity(communityId, collegeId);
      return successResponse(res, null, 'Community deleted successfully');
    } catch (error) {
      console.error('Error deleting community:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get messages from a community (admin)
   * GET /api/admins/communities/:communityId/messages
   */
  async getAdminCommunityMessages(req, res) {
    try {
      const collegeId = req.user.college_id;
      const { communityId } = req.params;
      const { limit = 100, before } = req.query;

      // Verify community belongs to admin's college
      const community = await communityService.getCommunityById(communityId);
      if (!community || community.college_id !== collegeId) {
        return errorResponse(res, 'Community not found', 404);
      }

      const messages = await communityService.getCommunityMessages(
        communityId,
        parseInt(limit),
        before
      );
      return successResponse(res, messages, 'Messages fetched successfully');
    } catch (error) {
      console.error('Error fetching community messages:', error);
      return errorResponse(res, error.message);
    }
  }

  /**
   * Get single community details
   * GET /api/admins/communities/:communityId
   */
  async getCommunityDetails(req, res) {
    try {
      const collegeId = req.user.college_id;
      const { communityId } = req.params;

      const community = await communityService.getCommunityById(communityId);
      if (!community || community.college_id !== collegeId) {
        return errorResponse(res, 'Community not found', 404);
      }

      return successResponse(res, community, 'Community details fetched successfully');
    } catch (error) {
      console.error('Error fetching community details:', error);
      return errorResponse(res, error.message);
    }
  }
}

export default new CommunityController();
