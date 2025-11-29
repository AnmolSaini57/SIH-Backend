import {
  getOrCreateConversation,
  getConversationById,
  getStudentConversations,
  getCounsellorConversations,
  getConversationMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  deleteConversation
} from '../services/messaging.service.js';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  formatSupabaseError
} from '../utils/response.js';

/**
 * Create or get conversation
 * POST /api/student/conversations
 */
export const createConversationController = async (req, res) => {
  try {
    const { counsellor_id } = req.body;
    const studentId = req.user.user_id;
    const collegeId = req.tenant;

    if (!counsellor_id) {
      return errorResponse(res, 'counsellor_id is required', 400);
    }

    // Verify counsellor exists and belongs to same college
    const { data: conversation, error } = await getOrCreateConversation(
      studentId,
      counsellor_id,
      collegeId
    );

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      conversation,
      'Conversation created successfully',
      201
    );
  } catch (error) {
    console.error('Create conversation error:', error);
    return errorResponse(res, 'Failed to create conversation', 500);
  }
};

/**
 * Get all conversations for the logged-in student
 * GET /api/student/conversations
 */
export const getStudentConversationsController = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const collegeId = req.tenant;

    const { data, error } = await getStudentConversations(studentId, collegeId);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      data,
      'Conversations retrieved successfully'
    );
  } catch (error) {
    console.error('Get student conversations error:', error);
    return errorResponse(res, 'Failed to get conversations', 500);
  }
};

/**
 * Get all conversations for the logged-in counsellor
 * GET /api/counsellor/conversations
 */
export const getCounsellorConversationsController = async (req, res) => {
  try {
    const counsellorId = req.user.user_id;
    const collegeId = req.tenant;

    const { data, error } = await getCounsellorConversations(counsellorId, collegeId);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      data,
      'Conversations retrieved successfully'
    );
  } catch (error) {
    console.error('Get counsellor conversations error:', error);
    return errorResponse(res, 'Failed to get conversations', 500);
  }
};

/**
 * Get messages for a specific conversation
 * GET /api/student/conversations/:id/messages
 * GET /api/counsellor/conversations/:id/messages
 */
export const getConversationMessagesController = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const { data, error } = await getConversationMessages(
      conversationId,
      userId,
      page,
      limit
    );

    if (error) {
      if (error.message === 'Conversation not found or access denied') {
        return notFoundResponse(res, 'Conversation not found');
      }
      if (error.message === 'Access denied') {
        return errorResponse(res, 'Access denied', 403);
      }
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      data,
      'Messages retrieved successfully'
    );
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return errorResponse(res, 'Failed to get messages', 500);
  }
};

/**
 * Mark messages as read in a conversation
 * PUT /api/student/conversations/:id/read
 * PUT /api/counsellor/conversations/:id/read
 */
export const markMessagesAsReadController = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.user_id;

    const { data, error } = await markMessagesAsRead(conversationId, userId);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      { marked_read: data?.length || 0 },
      'Messages marked as read'
    );
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return errorResponse(res, 'Failed to mark messages as read', 500);
  }
};

/**
 * Get unread message count
 * GET /api/student/messages/unread-count
 * GET /api/counsellor/messages/unread-count
 */
export const getUnreadCountController = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const { data, error } = await getUnreadMessageCount(userId);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      data,
      'Unread count retrieved successfully'
    );
  } catch (error) {
    console.error('Get unread count error:', error);
    return errorResponse(res, 'Failed to get unread count', 500);
  }
};

/**
 * Get a single conversation by ID
 * GET /api/student/conversations/:id
 * GET /api/counsellor/conversations/:id
 */
export const getConversationByIdController = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.user_id;

    const { data, error } = await getConversationById(conversationId, userId);

    if (error) {
      const formattedError = formatSupabaseError(error);
      return notFoundResponse(res, 'Conversation not found');
    }

    return successResponse(
      res,
      data,
      'Conversation retrieved successfully'
    );
  } catch (error) {
    console.error('Get conversation by ID error:', error);
    return errorResponse(res, 'Failed to get conversation', 500);
  }
};

/**
 * Delete a conversation
 * DELETE /api/student/conversations/:id
 * DELETE /api/counsellor/conversations/:id
 */
export const deleteConversationController = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.user_id;

    const { data, error } = await deleteConversation(conversationId, userId);

    if (error) {
      if (error.message === 'Conversation not found or access denied' || 
          error.message === 'Access denied') {
        return errorResponse(res, 'Access denied', 403);
      }
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(
      res,
      data,
      'Conversation deleted successfully'
    );
  } catch (error) {
    console.error('Delete conversation error:', error);
    return errorResponse(res, 'Failed to delete conversation', 500);
  }
};
