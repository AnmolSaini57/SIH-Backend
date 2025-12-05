import { Server } from 'socket.io';
import { supabase } from './supabase.js';

/**
 * Initialize Socket.io server with authentication
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Configured Socket.io server
 */
export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Simplified middleware - just extract user data from handshake
  // Authentication is handled by REST API endpoints
  io.use(async (socket, next) => {
    try {
      // Get user data from auth object sent by frontend
      const { userId, userRole, collegeId } = socket.handshake.auth;
      
      if (!userId) {
        console.log('[Socket] No user ID provided in handshake');
        return next(new Error('User ID required'));
      }

      // Attach user data to socket (frontend already authenticated via REST API)
      socket.user = {
        user_id: userId,
        role: userRole,
        college_id: collegeId
      };

      console.log(`[Socket] User connected: ${userId} (${userRole})`);
      next();
    } catch (error) {
      console.error('[Socket] Connection error:', error);
      return next(new Error('Connection failed'));
    }
  });

  return io;
};

/**
 * Store for active users and their socket IDs
 * Structure: { userId: Set of socket IDs }
 */
export const activeUsers = new Map();

/**
 * Store for typing indicators
 * Structure: { conversationId: Set of user IDs currently typing }
 */
export const typingUsers = new Map();

/**
 * Helper function to add user to active users
 */
export const addActiveUser = (userId, socketId) => {
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
  }
  activeUsers.get(userId).add(socketId);
};

/**
 * Helper function to remove user from active users
 */
export const removeActiveUser = (userId, socketId) => {
  if (activeUsers.has(userId)) {
    const userSockets = activeUsers.get(userId);
    userSockets.delete(socketId);
    if (userSockets.size === 0) {
      activeUsers.delete(userId);
    }
  }
};

/**
 * Helper function to check if user is online
 */
export const isUserOnline = (userId) => {
  return activeUsers.has(userId) && activeUsers.get(userId).size > 0;
};

/**
 * Helper function to get all socket IDs for a user
 */
export const getUserSocketIds = (userId) => {
  return activeUsers.get(userId) || new Set();
};

/**
 * Helper function to add typing user
 */
export const addTypingUser = (conversationId, userId) => {
  if (!typingUsers.has(conversationId)) {
    typingUsers.set(conversationId, new Set());
  }
  typingUsers.get(conversationId).add(userId);
};

/**
 * Helper function to remove typing user
 */
export const removeTypingUser = (conversationId, userId) => {
  if (typingUsers.has(conversationId)) {
    const typing = typingUsers.get(conversationId);
    typing.delete(userId);
    if (typing.size === 0) {
      typingUsers.delete(conversationId);
    }
  }
};

/**
 * Helper function to get typing users in a conversation
 */
export const getTypingUsers = (conversationId) => {
  return Array.from(typingUsers.get(conversationId) || new Set());
};



// Store for community typing indicators
// Structure: { communityId: Set of user IDs currently typing }
export const communityTypingUsers = new Map();

export const addCommunityTypingUser = (communityId, userId) => {
  if (!communityTypingUsers.has(communityId)) {
    communityTypingUsers.set(communityId, new Set());
  }
  communityTypingUsers.get(communityId).add(userId);
};

export const removeCommunityTypingUser = (communityId, userId) => {
  if (communityTypingUsers.has(communityId)) {
    const typing = communityTypingUsers.get(communityId);
    typing.delete(userId);
    if (typing.size === 0) {
      communityTypingUsers.delete(communityId);
    }
  }
};

export const getCommunityTypingUsers = (communityId) => {
  return Array.from(communityTypingUsers.get(communityId) || new Set());
};
