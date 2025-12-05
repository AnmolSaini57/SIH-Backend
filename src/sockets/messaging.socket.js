import {
  createMessage,
  markMessagesAsRead,
  getConversationById,
  getUnreadMessageCount
} from '../services/messaging.service.js';
import {
  addActiveUser,
  removeActiveUser,
  isUserOnline,
  getUserSocketIds,
  addTypingUser,
  removeTypingUser,
  getTypingUsers,
  typingUsers
} from '../config/socket.js';
import { supabase } from '../config/supabase.js';

/**
 * Initialize Socket.io event handlers
 * @param {Object} io - Socket.io server instance
 */
export const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.user.user_id;
    const userRole = socket.user.role;
    const userName = socket.user.name || 'User';
    
    console.log(`User connected: ${userId} (${userRole})`);

    // Add user to active users
    addActiveUser(userId, socket.id);

    // Notify ALL users about this user's online status
    io.emit('user_online_status', { 
      user_id: userId, 
      online: true 
    });

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
        const { data: readMessages } = await markMessagesAsRead(conversation_id, userId);
        
        console.log(`User ${userName} joined conversation ${conversation_id}`);
        
        socket.emit('joined_conversation', {
          conversation_id,
          message: 'Successfully joined conversation'
        });

        // Notify other user that messages were read
        const otherUserId = conversation.student_id === userId 
          ? conversation.counsellor_id 
          : conversation.student_id;
        
        // Emit to the sender's room so they see checkmarks
        io.to(`user:${otherUserId}`).emit('messages_read', {
          conversation_id,
          reader_id: userId
        });
        
        console.log(`[Socket] Messages read in conversation ${conversation_id} by ${userId}, notifying ${otherUserId}`);

        // Update unread count for the user who joined (if messages were marked as read)
        if (readMessages && readMessages.length > 0) {
          const { data: unreadData } = await getUnreadMessageCount(userId);
          socket.emit('unread_count_updated', {
            count: unreadData?.count || 0
          });
        }

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
            user_id: userId,
            user_name: userName
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

        // Update unread count for receiver - emit per-conversation data
        // Get unread count for this specific conversation
        const { count: unreadCount, error: unreadError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversation_id)
          .eq('receiver_id', receiver_id)
          .eq('is_read', false);

        const unreadData = {
          conversation_id,
          unread_count: unreadCount || 0,
          last_message: message_text.trim(),
          last_message_at: new Date().toISOString(),
          last_message_sender: userId,
        };

        console.log(`[Socket] Emitting unread_count_updated to user:${receiver_id}:`, unreadData);
        io.to(`user:${receiver_id}`).emit('unread_count_updated', unreadData);

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

        // Update unread count for the user who marked messages as read
        if (data && data.length > 0) {
          const { data: unreadData } = await getUnreadMessageCount(userId);
          socket.emit('unread_count_updated', {
            count: unreadData?.count || 0
          });
        }

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
     * Event: get_unread_count
     * Get current unread message count for the user
     */
    socket.on('get_unread_count', async () => {
      try {
        const { data, error } = await getUnreadMessageCount(userId);
        
        if (error) {
          console.error('Error getting unread count:', error);
          socket.emit('error', { message: 'Failed to get unread count' });
          return;
        }

        socket.emit('unread_count_updated', {
          count: data?.count || 0
        });
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    });

    /**
     * Event: disconnect
     * Handle user disconnection
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (${userRole})`);
      
      // Remove user from active users
      removeActiveUser(userId, socket.id);

      // Check if user is still online on another device
      const stillOnline = isUserOnline(userId);
      
      // Clean up typing indicators ONLY if user is completely offline
      // (no other devices still connected)
      if (!stillOnline) {
        // Remove typing status from all conversations this user was typing in
        typingUsers.forEach((users, conversationId) => {
          if (users.has(userId)) {
            users.delete(userId);
            // Notify other users in the conversation
            io.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
              conversation_id: conversationId,
              user_id: userId
            });
          }
        });
        
        // Notify all users that this user is offline
        io.emit('user_online_status', {
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
