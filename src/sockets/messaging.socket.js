import {
  createMessage,
  markMessagesAsRead,
  getConversationById
} from '../services/messaging.service.js';
import {
  addActiveUser,
  removeActiveUser,
  isUserOnline,
  getUserSocketIds,
  addTypingUser,
  removeTypingUser,
  getTypingUsers
} from '../config/socket.js';

/**
 * Initialize Socket.io event handlers
 * @param {Object} io - Socket.io server instance
 */
export const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.user.user_id;
    const userName = socket.user.name;
    
    console.log(`User connected: ${userName} (${userId})`);

    // Add user to active users
    addActiveUser(userId, socket.id);

    // Notify user about their online status
    socket.broadcast.emit('online_status', { userId, online: true });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    /**
     * Event: join_conversation
     * Join a conversation room
     */
    socket.on('join_conversation', async ({ conversation_id }) => {
      try {
        // Verify user is part of the conversation
        const { data: conversation, error } = await getConversationById(
          conversation_id,
          userId
        );

        if (error || !conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        // Join conversation room
        socket.join(`conversation:${conversation_id}`);
        
        // Automatically mark messages as read when user joins/views conversation
        await markMessagesAsRead(conversation_id, userId);
        
        console.log(`User ${userName} joined conversation ${conversation_id}`);
        
        socket.emit('joined_conversation', {
          conversation_id,
          message: 'Successfully joined conversation'
        });

        // Notify other user that messages were read
        const otherUserId = conversation.student_id === userId 
          ? conversation.counsellor_id 
          : conversation.student_id;
        
        io.to(`user:${otherUserId}`).emit('messages_read', {
          conversation_id,
          reader_id: userId
        });

        // Check if the other user is online
        const isOnline = isUserOnline(otherUserId);
        socket.emit('user_online_status', {
          conversation_id,
          user_id: otherUserId,
          online: isOnline
        });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    /**
     * Event: leave_conversation
     * Leave a conversation room
     */
    socket.on('leave_conversation', ({ conversation_id }) => {
      socket.leave(`conversation:${conversation_id}`);
      
      // Remove typing status when leaving
      removeTypingUser(conversation_id, userId);
      socket.to(`conversation:${conversation_id}`).emit('user_stopped_typing', {
        conversation_id,
        user_id: userId
      });
      
      console.log(`User ${userName} left conversation ${conversation_id}`);
    });

    /**
     * Event: send_message
     * Send a new message in a conversation
     */
    socket.on('send_message', async ({ conversation_id, receiver_id, message_text }) => {
      try {
        if (!message_text || !message_text.trim()) {
          socket.emit('error', { message: 'Message text cannot be empty' });
          return;
        }

        // Create message in database
        const { data: message, error } = await createMessage(
          conversation_id,
          userId,
          receiver_id,
          message_text.trim()
        );

        if (error) {
          console.error('Error creating message:', error);
          socket.emit('error', { message: 'Failed to send message' });
          return;
        }

        // Clear typing status
        removeTypingUser(conversation_id, userId);
        io.to(`conversation:${conversation_id}`).emit('user_stopped_typing', {
          conversation_id,
          user_id: userId
        });

        // Emit message to all users in the conversation
        io.to(`conversation:${conversation_id}`).emit('new_message', {
          conversation_id,
          message
        });

        // Also emit to receiver's personal room (for notifications)
        io.to(`user:${receiver_id}`).emit('new_message_notification', {
          conversation_id,
          message,
          sender: {
            id: socket.user.user_id,
            name: socket.user.name,
            avatar_url: socket.user.avatar_url
          }
        });

        console.log(`Message sent from ${userName} in conversation ${conversation_id}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Event: mark_as_read
     * Mark messages in a conversation as read
     */
    socket.on('mark_as_read', async ({ conversation_id }) => {
      try {
        const { data, error } = await markMessagesAsRead(conversation_id, userId);

        if (error) {
          console.error('Error marking messages as read:', error);
          return;
        }

        // Notify sender that messages were read
        socket.to(`conversation:${conversation_id}`).emit('messages_read', {
          conversation_id,
          reader_id: userId,
          read_count: data?.length || 0
        });

        console.log(`Messages marked as read by ${userName} in conversation ${conversation_id}`);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    /**
     * Event: typing
     * User is typing in a conversation
     */
    socket.on('typing', ({ conversation_id }) => {
      try {
        addTypingUser(conversation_id, userId);
        
        // Notify other users in the conversation
        socket.to(`conversation:${conversation_id}`).emit('user_typing', {
          conversation_id,
          user_id: userId,
          user_name: userName
        });

        console.log(`${userName} is typing in conversation ${conversation_id}`);
      } catch (error) {
        console.error('Error handling typing event:', error);
      }
    });

    /**
     * Event: stop_typing
     * User stopped typing in a conversation
     */
    socket.on('stop_typing', ({ conversation_id }) => {
      try {
        removeTypingUser(conversation_id, userId);
        
        // Notify other users in the conversation
        socket.to(`conversation:${conversation_id}`).emit('user_stopped_typing', {
          conversation_id,
          user_id: userId
        });

        console.log(`${userName} stopped typing in conversation ${conversation_id}`);
      } catch (error) {
        console.error('Error handling stop typing event:', error);
      }
    });

    /**
     * Event: check_online_status
     * Check if a user is online
     */
    socket.on('check_online_status', ({ user_id }) => {
      const isOnline = isUserOnline(user_id);
      socket.emit('user_online_status', {
        user_id,
        online: isOnline
      });
    });

    /**
     * Event: disconnect
     * Handle user disconnection
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userName} (${userId})`);
      
      // Remove user from active users
      removeActiveUser(userId, socket.id);

      // Check if user is still online on another device
      const stillOnline = isUserOnline(userId);
      
      if (!stillOnline) {
        // Notify all conversations that the user is offline
        io.emit('user_offline', {
          user_id: userId,
          online: false
        });
      }
    });

    /**
     * Event: error
     * Handle client-side errors
     */
    socket.on('error', (error) => {
      console.error(`Socket error from ${userName}:`, error);
    });
  });

  // Log when Socket.io server is ready
  console.log('Socket.io handlers initialized');
};

export default initializeSocketHandlers;
