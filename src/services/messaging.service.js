import { supabase } from '../config/supabase.js';

/**
 * Create or get existing conversation between student and counsellor
 */
export const getOrCreateConversation = async (studentId, counsellorId, collegeId) => {
  try {
    // Check if conversation already exists
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('*')
      .eq('student_id', studentId)
      .eq('counsellor_id', counsellorId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      throw existingError;
    }

    if (existing) {
      return { data: existing, error: null };
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        student_id: studentId,
        counsellor_id: counsellorId,
        college_id: collegeId,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return { data: newConversation, error: null };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return { data: null, error };
  }
};

/**
 * Get conversation by ID
 */
export const getConversationById = async (conversationId, userId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        student:student_id(id, name, email, avatar_url),
        counsellor:counsellor_id(id, name, email, avatar_url)
      `)
      .eq('id', conversationId)
      .or(`student_id.eq.${userId},counsellor_id.eq.${userId}`)
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in getConversationById:', error);
    return { data: null, error };
  }
};

/**
 * Get all conversations for a student
 */
export const getStudentConversations = async (studentId, collegeId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        student_id,
        counsellor_id,
        college_id,
        last_message_at,
        created_at,
        updated_at
      `)
      .eq('student_id', studentId)
      .eq('college_id', collegeId)
      .order('last_message_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get counsellor details and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      data.map(async (conv) => {
        // Get counsellor details
        const { data: counsellor } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            avatar_url,
            counsellors(specialization)
          `)
          .eq('id', conv.counsellor_id)
          .single();

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('message_text, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('receiver_id', studentId)
          .eq('is_read', false);

        return {
          ...conv,
          counsellor: {
            id: counsellor?.id,
            name: counsellor?.name,
            email: counsellor?.email,
            avatar_url: counsellor?.avatar_url,
            specialization: counsellor?.counsellors?.specialization || null
          },
          last_message: lastMessage?.message_text || null,
          last_message_time: lastMessage?.created_at || conv.last_message_at,
          last_message_sender: lastMessage?.sender_id || null,
          unread_count: unreadCount || 0
        };
      })
    );

    return { data: conversationsWithDetails, error: null };
  } catch (error) {
    console.error('Error in getStudentConversations:', error);
    return { data: null, error };
  }
};

/**
 * Get all conversations for a counsellor
 */
export const getCounsellorConversations = async (counsellorId, collegeId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        student_id,
        counsellor_id,
        college_id,
        last_message_at,
        created_at,
        updated_at
      `)
      .eq('counsellor_id', counsellorId)
      .eq('college_id', collegeId)
      .order('last_message_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get student details and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      data.map(async (conv) => {
        // Get student details
        const { data: student } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            avatar_url
          `)
          .eq('id', conv.student_id)
          .single();

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('message_text, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('receiver_id', counsellorId)
          .eq('is_read', false);

        return {
          ...conv,
          student: {
            id: student?.id,
            name: student?.name,
            email: student?.email,
            avatar_url: student?.avatar_url
          },
          last_message: lastMessage?.message_text || null,
          last_message_time: lastMessage?.created_at || conv.last_message_at,
          last_message_sender: lastMessage?.sender_id || null,
          unread_count: unreadCount || 0
        };
      })
    );

    return { data: conversationsWithDetails, error: null };
  } catch (error) {
    console.error('Error in getCounsellorConversations:', error);
    return { data: null, error };
  }
};

/**
 * Get messages for a conversation with pagination
 */
export const getConversationMessages = async (conversationId, userId, page = 1, limit = 50) => {
  try {
    // Verify user is part of the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('student_id, counsellor_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    if (conversation.student_id !== userId && conversation.counsellor_id !== userId) {
      throw new Error('Access denied');
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get messages
    const { data: messages, error: messagesError, count } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        receiver_id,
        message_text,
        is_read,
        read_at,
        created_at
      `, { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      throw messagesError;
    }

    // Get sender details for each message
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', msg.sender_id)
          .single();

        return {
          ...msg,
          sender: {
            id: sender?.id,
            name: sender?.name,
            avatar_url: sender?.avatar_url
          }
        };
      })
    );

    return {
      data: {
        messages: messagesWithSender.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return { data: null, error };
  }
};

/**
 * Create a new message
 */
export const createMessage = async (conversationId, senderId, receiverId, messageText) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: messageText,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        conversation_id,
        sender_id,
        receiver_id,
        message_text,
        is_read,
        read_at,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    // Get sender details
    const { data: sender } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', senderId)
      .single();

    return {
      data: {
        ...data,
        sender: {
          id: sender?.id,
          name: sender?.name,
          avatar_url: sender?.avatar_url
        }
      },
      error: null
    };
  } catch (error) {
    console.error('Error in createMessage:', error);
    return { data: null, error };
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return { data: null, error };
  }
};

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return { data: { count }, error: null };
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    return { data: null, error };
  }
};

/**
 * Delete a conversation and all its messages
 */
export const deleteConversation = async (conversationId, userId) => {
  try {
    // Verify user is part of the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('student_id, counsellor_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    if (conversation.student_id !== userId && conversation.counsellor_id !== userId) {
      throw new Error('Access denied');
    }

    // Delete conversation (messages will be cascade deleted)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    return { data: null, error };
  }
};
