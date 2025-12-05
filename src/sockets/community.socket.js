import { addCommunityTypingUser, removeCommunityTypingUser, getCommunityTypingUsers } from '../config/socket.js';
import communityService from '../services/community.service.js';

/**
 * Initialize community socket handlers
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
export const initializeCommunitySocket = (io) => {
  // Create a namespace for community chat
  const communityNamespace = io.of('/community');

  // Add authentication middleware for the community namespace
  communityNamespace.use(async (socket, next) => {
    try {
      const { userId, userRole, collegeId } = socket.handshake.auth;
      
      console.log('[Community] Auth check:', {
        userId: userId || 'MISSING',
        userRole: userRole || 'MISSING',
        collegeId: collegeId || 'MISSING'
      });
      
      if (!userId || !userRole || !collegeId) {
        console.error('[Community] Missing authentication data:', { 
          hasUserId: !!userId, 
          hasUserRole: !!userRole, 
          hasCollegeId: !!collegeId 
        });
        return next(new Error('Authentication required - missing userId, userRole, or collegeId'));
      }

      // Attach user data to socket
      socket.user = {
        id: userId,
        user_id: userId,
        role: userRole,
        college_id: collegeId
      };

      console.log(`[Community] Authentication successful: userId=${userId}, role=${userRole}, college=${collegeId}`);
      next();
    } catch (error) {
      console.error('[Community] Authentication error:', error);
      return next(new Error('Authentication failed'));
    }
  });

  communityNamespace.on('connection', async (socket) => {
    console.log(`[Community] User connected: ${socket.id}`);

    const userId = socket.user.id;
    const userRole = socket.user.role;
    const collegeId = socket.user.college_id;

    console.log(`[Community] Connection established: userId=${userId}, role=${userRole}, college=${collegeId}`);

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
        addCommunityTypingUser(communityId, userId);
        let displayName = null;
        if (userRole === 'student') {
          // Get anonymous username from DB
          const { data: student } = await communityService.supabase
            .from('students')
            .select('anonymous_username')
            .eq('id', userId)
            .single();
          displayName = student?.anonymous_username || 'Anonymous';
        } else {
          // Get real name from profile
          const { data: profile } = await communityService.supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();
          displayName = profile?.name || 'Unknown';
        }
        const roomName = `community:${communityId}`;
        socket.to(roomName).emit('user_typing', {
          communityId,
          userId,
          role: userRole,
          username: displayName
        });
      } catch (error) {
        console.error('[Community] Error handling typing event:', error);
      }
    });

    socket.on('stop_typing', async ({ communityId }) => {
      try {
        if (socket.currentCommunity !== communityId) {
          return;
        }
        removeCommunityTypingUser(communityId, userId);
        let displayName = null;
        if (userRole === 'student') {
          const { data: student } = await communityService.supabase
            .from('students')
            .select('anonymous_username')
            .eq('id', userId)
            .single();
          displayName = student?.anonymous_username || 'Anonymous';
        } else {
          const { data: profile } = await communityService.supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();
          displayName = profile?.name || 'Unknown';
        }
        const roomName = `community:${communityId}`;
        socket.to(roomName).emit('user_stopped_typing', {
          communityId,
          userId,
          role: userRole,
          username: displayName
        });
      } catch (error) {
        console.error('[Community] Error handling stop typing event:', error);
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
