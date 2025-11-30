import communityService from '../services/community.service.js';

/**
 * Community Socket Handler
 * Handles real-time messaging for anonymous community chatrooms
 */

/**
 * Initialize community socket handlers
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
export const initializeCommunitySocket = (io) => {
  // Create a namespace for community chat
  const communityNamespace = io.of('/community');

  communityNamespace.on('connection', async (socket) => {
    console.log(`[Community] User connected: ${socket.id}`);

    const userId = socket.handshake.auth.userId;
    const userRole = socket.handshake.auth.userRole;
    const collegeId = socket.handshake.auth.collegeId;

    if (!userId || !userRole || !collegeId) {
      console.error('[Community] Missing authentication data');
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    console.log(`[Community] Authenticated: userId=${userId}, role=${userRole}, college=${collegeId}`);

    /**
     * Join a community room
     * Event: 'join-community'
     * Data: { communityId: string }
     */
    socket.on('join-community', async ({ communityId }) => {
      try {
        console.log(`[Community] Join request: user=${userId}, community=${communityId}`);

        // Verify community exists and belongs to user's college
        const community = await communityService.getCommunityById(communityId);
        if (!community) {
          socket.emit('error', { message: 'Community not found' });
          return;
        }

        if (community.college_id !== collegeId) {
          socket.emit('error', { message: 'Cannot join community from another college' });
          return;
        }

        // For students and counsellors, verify membership
        // Admins can join any community in their college
        if (userRole !== 'admin') {
          const isMember = await communityService.isMember(userId, communityId);
          if (!isMember) {
            socket.emit('error', { message: 'You must be a member to join this community' });
            return;
          }
        }

        // Join the room
        const roomName = `community:${communityId}`;
        socket.join(roomName);
        socket.currentCommunity = communityId;

        console.log(`[Community] User ${userId} joined room ${roomName}`);

        // Notify user of successful join
        socket.emit('joined-community', {
          communityId,
          message: 'Successfully joined community',
        });

        // Notify others in the room (optional)
        socket.to(roomName).emit('user-joined', {
          userId: userRole === 'student' ? 'anonymous' : userId,
          role: userRole,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Community] Error joining community:', error);
        socket.emit('error', { message: 'Failed to join community' });
      }
    });

    /**
     * Leave a community room
     * Event: 'leave-community'
     * Data: { communityId: string }
     */
    socket.on('leave-community', async ({ communityId }) => {
      try {
        const roomName = `community:${communityId}`;
        socket.leave(roomName);
        socket.currentCommunity = null;

        console.log(`[Community] User ${userId} left room ${roomName}`);

        socket.emit('left-community', {
          communityId,
          message: 'Successfully left community',
        });

        // Notify others in the room (optional)
        socket.to(roomName).emit('user-left', {
          userId: userRole === 'student' ? 'anonymous' : userId,
          role: userRole,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Community] Error leaving community:', error);
        socket.emit('error', { message: 'Failed to leave community' });
      }
    });

    /**
     * Send a message to the community
     * Event: 'send-message'
     * Data: { communityId: string, messageText: string }
     */
    socket.on('send-message', async ({ communityId, messageText }) => {
      try {
        console.log(`[Community] Message from user=${userId} to community=${communityId}`);

        // Validate message
        if (!messageText || messageText.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (messageText.length > 2000) {
          socket.emit('error', { message: 'Message too long (max 2000 characters)' });
          return;
        }

        // Verify user is in the room
        if (socket.currentCommunity !== communityId) {
          socket.emit('error', { message: 'You must join the community first' });
          return;
        }

        // For students and counsellors, verify membership
        // Admins can send to any community in their college
        if (userRole !== 'admin') {
          const isMember = await communityService.isMember(userId, communityId);
          if (!isMember) {
            socket.emit('error', { message: 'You must be a member to send messages' });
            return;
          }
        }

        // Save message to database
        const savedMessage = await communityService.sendMessage(
          userId,
          communityId,
          messageText.trim(),
          userRole
        );

        console.log(`[Community] Message saved: id=${savedMessage.id}`);

        // Broadcast message to all users in the community room
        const roomName = `community:${communityId}`;
        communityNamespace.to(roomName).emit('new-message', {
          id: savedMessage.id,
          communityId,
          message_text: savedMessage.message_text,
          sender_id: savedMessage.sender_id,
          sender_role: savedMessage.sender_role,
          username: savedMessage.username || null,
          anonymous_username: savedMessage.anonymous_username || null,
          created_at: savedMessage.created_at,
        });

        console.log(`[Community] Message broadcast to room ${roomName}`);
      } catch (error) {
        console.error('[Community] Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * User is typing indicator
     * Event: 'typing'
     * Data: { communityId: string }
     */
    socket.on('typing', async ({ communityId }) => {
      try {
        if (socket.currentCommunity !== communityId) {
          return;
        }

        const roomName = `community:${communityId}`;
        socket.to(roomName).emit('user-typing', {
          userId: userRole === 'student' ? 'anonymous' : userId,
          role: userRole,
          communityId,
        });
      } catch (error) {
        console.error('[Community] Error handling typing event:', error);
      }
    });

    /**
     * User stopped typing indicator
     * Event: 'stop-typing'
     * Data: { communityId: string }
     */
    socket.on('stop-typing', async ({ communityId }) => {
      try {
        if (socket.currentCommunity !== communityId) {
          return;
        }

        const roomName = `community:${communityId}`;
        socket.to(roomName).emit('user-stop-typing', {
          userId: userRole === 'student' ? 'anonymous' : userId,
          role: userRole,
          communityId,
        });
      } catch (error) {
        console.error('[Community] Error handling stop-typing event:', error);
      }
    });

    /**
     * Request message history
     * Event: 'get-messages'
     * Data: { communityId: string, limit?: number, beforeMessageId?: string }
     */
    socket.on('get-messages', async ({ communityId, limit = 50, beforeMessageId = null }) => {
      try {
        console.log(`[Community] Message history request: community=${communityId}`);

        // Verify user can access the community
        if (userRole !== 'admin') {
          const isMember = await communityService.isMember(userId, communityId);
          if (!isMember) {
            socket.emit('error', { message: 'You must be a member to view messages' });
            return;
          }
        } else {
          // Verify community belongs to admin's college
          const community = await communityService.getCommunityById(communityId);
          if (!community || community.college_id !== collegeId) {
            socket.emit('error', { message: 'Community not found' });
            return;
          }
        }

        const messages = await communityService.getCommunityMessages(
          communityId,
          limit,
          beforeMessageId
        );

        socket.emit('messages-history', {
          communityId,
          messages,
          hasMore: messages.length === limit,
        });

        console.log(`[Community] Sent ${messages.length} messages to user ${userId}`);
      } catch (error) {
        console.error('[Community] Error fetching messages:', error);
        socket.emit('error', { message: 'Failed to fetch messages' });
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[Community] User disconnected: ${socket.id}`);
      
      // If user was in a community, notify others
      if (socket.currentCommunity) {
        const roomName = `community:${socket.currentCommunity}`;
        socket.to(roomName).emit('user-disconnected', {
          userId: userRole === 'student' ? 'anonymous' : userId,
          role: userRole,
          timestamp: new Date().toISOString(),
        });
      }
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error('[Community] Socket error:', error);
    });
  });

  console.log('[Community] Community socket namespace initialized at /community');
};
