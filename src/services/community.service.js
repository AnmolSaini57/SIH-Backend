import { supabase } from '../config/supabase.js';

/**
 * Community Service
 * Handles all business logic for anonymous community chatrooms
 */

class CommunityService {
  /**
   * Admin: Create a new community
   */
  async createCommunity(adminId, collegeId, title, description) {
    const { data, error } = await supabase
      .from('communities')
      .insert({
        college_id: collegeId,
        title,
        description,
        created_by: adminId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Admin: Update a community
   */
  async updateCommunity(communityId, collegeId, updates) {
    const { data, error } = await supabase
      .from('communities')
      .update({
        title: updates.title,
        description: updates.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', communityId)
      .eq('college_id', collegeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Admin: Delete a community
   */
  async deleteCommunity(communityId, collegeId) {
    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', communityId)
      .eq('college_id', collegeId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Get all communities for a college with member count and join status
   */
  async getAllCommunities(userId, collegeId) {
    console.log(' [CommunityService] getAllCommunities called:');
    console.log('   User ID:', userId);
    console.log('   College ID:', collegeId);

    // Get all communities for the college
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, title, description, created_at, updated_at, college_id')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    console.log('   Query result - Communities found:', communities?.length || 0);
    if (communities && communities.length > 0) {
      console.log('   First community:', JSON.stringify(communities[0], null, 2));
    }

    if (communitiesError) {
      console.error('   ❌ Error fetching communities:', communitiesError);
      throw communitiesError;
    }

    // Get member counts for each community
    const communityIds = communities.map(c => c.id);
    const { data: memberCounts, error: memberError } = await supabase
      .from('community_members')
      .select('community_id')
      .in('community_id', communityIds);

    if (memberError) throw memberError;

    // Get user's joined communities
    const { data: userMemberships, error: membershipError } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);

    if (membershipError) throw membershipError;

    const joinedCommunityIds = new Set(userMemberships.map(m => m.community_id));

    // Count members per community
    const memberCountMap = {};
    memberCounts.forEach(m => {
      memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
    });

    // Combine data
    return communities.map(community => ({
      ...community,
      total_members: memberCountMap[community.id] || 0,
      is_joined: joinedCommunityIds.has(community.id),
    }));
  }

  /**
   * Get joined communities for a user
   */
  async getJoinedCommunities(userId, collegeId) {
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        community_id,
        joined_at,
        communities (
          id,
          title,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Get member counts for joined communities
    const communityIds = data.map(m => m.community_id);
    if (communityIds.length === 0) return [];

    const { data: memberCounts, error: memberError } = await supabase
      .from('community_members')
      .select('community_id')
      .in('community_id', communityIds);

    if (memberError) throw memberError;

    const memberCountMap = {};
    memberCounts.forEach(m => {
      memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
    });

    return data.map(item => ({
      ...item.communities,
      total_members: memberCountMap[item.community_id] || 0,
      is_joined: true,
      joined_at: item.joined_at,
    }));
  }

  /**
   * Get communities not joined by user
   */
  async getAvailableCommunities(userId, collegeId) {
    // Get user's joined community IDs
    const { data: userMemberships, error: membershipError } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId);

    if (membershipError) throw membershipError;

    const joinedCommunityIds = userMemberships.map(m => m.community_id);

    // Get all communities
    let query = supabase
      .from('communities')
      .select('id, title, description, created_at, updated_at')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    // Exclude joined communities if any
    if (joinedCommunityIds.length > 0) {
      query = query.not('id', 'in', `(${joinedCommunityIds.join(',')})`);
    }

    const { data: communities, error: communitiesError } = await query;

    if (communitiesError) throw communitiesError;

    // Get member counts
    if (communities.length === 0) return [];

    const communityIds = communities.map(c => c.id);
    const { data: memberCounts, error: memberError } = await supabase
      .from('community_members')
      .select('community_id')
      .in('community_id', communityIds);

    if (memberError) throw memberError;

    const memberCountMap = {};
    memberCounts.forEach(m => {
      memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
    });

    return communities.map(community => ({
      ...community,
      total_members: memberCountMap[community.id] || 0,
      is_joined: false,
    }));
  }

  /**
   * Join a community
   */
  async joinCommunity(userId, communityId, userRole) {
    // Check if community exists and belongs to user's college
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, college_id')
      .eq('id', communityId)
      .single();

    if (communityError) throw communityError;
    if (!community) throw new Error('Community not found');

    // Verify user belongs to same college
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('college_id')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    if (profile.college_id !== community.college_id) {
      throw new Error('Cannot join community from another college');
    }

    // Add member
    const { data, error } = await supabase
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: userId,
        role: userRole,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Already a member of this community');
      }
      throw error;
    }

    return data;
  }

  /**
   * Leave a community
   */
  async leaveCommunity(userId, communityId) {
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('user_id', userId)
      .eq('community_id', communityId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Check if user is a member of a community
   */
  async isMember(userId, communityId) {
    const { data, error } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .single();

    return !error && data !== null;
  }

  /**
   * Get messages for a community
   */
  async getCommunityMessages(communityId, limit = 100, beforeMessageId = null) {
    let query = supabase
      .from('community_messages')
      .select(`
        id,
        message_text,
        sender_role,
        created_at,
        sender_id,
        community_id
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeMessageId) {
      // Get the timestamp of the reference message
      const { data: refMessage } = await supabase
        .from('community_messages')
        .select('created_at')
        .eq('id', beforeMessageId)
        .single();

      if (refMessage) {
        query = query.lt('created_at', refMessage.created_at);
      }
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Format messages with proper user information
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        const messageData = {
          id: msg.id,
          message_text: msg.message_text,
          sender_role: msg.sender_role,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
        };

        // If sender is a student, get anonymous username from community_members
        if (msg.sender_role === 'student') {
          const { data: student } = await supabase
            .from('students')
            .select('anonymous_username')
            .eq('id', msg.sender_id)
            .single();

          messageData.anonymous_username = student?.anonymous_username || 'Anonymous';
        } else {
          // For counsellor and admin, get their real name from profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', msg.sender_id)
            .single();

          messageData.username = profile?.name || profile?.email || 'Admin';
        }

        return messageData;
      })
    );

    return formattedMessages.reverse(); // Return in chronological order
  }

  /**
   * Send a message to a community
   */
  async sendMessage(userId, communityId, messageText, userRole) {
    const { data, error } = await supabase
      .from('community_messages')
      .insert({
        community_id: communityId,
        sender_id: userId,
        sender_role: userRole,
        message_text: messageText,
      })
      .select(`
        id,
        message_text,
        sender_role,
        created_at,
        sender_id
      `)
      .single();

    if (error) throw error;

    // Get sender information
    const messageData = { ...data };

    if (userRole === 'student') {
      // Get anonymous username from students table
      const { data: student } = await supabase
        .from('students')
        .select('anonymous_username')
        .eq('id', userId)
        .single();

      messageData.anonymous_username = student?.anonymous_username || 'Anonymous';
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();

      messageData.username = profile?.name || profile?.email || 'Admin';
    }

    return messageData;
  }

  /**
   * Admin: Get community statistics
   */
  async getCommunityStatistics(collegeId) {
    // Total communities
    const { count: totalCommunities, error: communitiesError } = await supabase
      .from('communities')
      .select('*', { count: 'exact', head: true })
      .eq('college_id', collegeId);

    if (communitiesError) throw communitiesError;

    // Total members across all communities
    const { data: allMembers, error: membersError } = await supabase
      .from('community_members')
      .select('community_id, communities!inner(college_id)')
      .eq('communities.college_id', collegeId);

    if (membersError) throw membersError;

    const totalMembers = allMembers.length;

    // Get member counts per community for average
    const memberCountMap = {};
    allMembers.forEach(m => {
      memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
    });

    const memberCounts = Object.values(memberCountMap);
    const avgMembers = memberCounts.length > 0
      ? (memberCounts.reduce((sum, count) => sum + count, 0) / memberCounts.length).toFixed(2)
      : 0;

    // Most active community (by message count in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messageCounts, error: messagesError } = await supabase
      .from('community_messages')
      .select('community_id, communities!inner(college_id, title)')
      .eq('communities.college_id', collegeId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (messagesError) throw messagesError;

    const messageCountMap = {};
    messageCounts.forEach(m => {
      if (!messageCountMap[m.community_id]) {
        messageCountMap[m.community_id] = {
          count: 0,
          title: m.communities.title,
        };
      }
      messageCountMap[m.community_id].count++;
    });

    const mostActiveComm = Object.entries(messageCountMap)
      .sort((a, b) => b[1].count - a[1].count)[0];

    const mostActiveCommunity = mostActiveComm
      ? { 
          title: mostActiveComm[1].title, 
          message_count: mostActiveComm[1].count,
          period: 'last_30_days'
        }
      : null;

    return {
      total_communities: totalCommunities || 0,
      total_members: totalMembers,
      avg_members_per_community: parseFloat(avgMembers),
      most_active_community: mostActiveCommunity,
    };
  }

  /**
   * Admin: Get all communities with details
   */
  async getAdminCommunities(collegeId) {
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, title, description, created_at, updated_at, created_by')
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    if (communitiesError) throw communitiesError;

    // Get member counts and message counts
    const communityIds = communities.map(c => c.id);
    if (communityIds.length === 0) return [];

    const { data: members, error: membersError } = await supabase
      .from('community_members')
      .select('community_id')
      .in('community_id', communityIds);

    if (membersError) throw membersError;

    const { data: messages, error: messagesError } = await supabase
      .from('community_messages')
      .select('community_id, created_at')
      .in('community_id', communityIds);

    if (messagesError) throw messagesError;

    // Build count maps
    const memberCountMap = {};
    const messageCountMap = {};
    const lastMessageMap = {};

    members.forEach(m => {
      memberCountMap[m.community_id] = (memberCountMap[m.community_id] || 0) + 1;
    });

    messages.forEach(m => {
      messageCountMap[m.community_id] = (messageCountMap[m.community_id] || 0) + 1;
      if (!lastMessageMap[m.community_id] || m.created_at > lastMessageMap[m.community_id]) {
        lastMessageMap[m.community_id] = m.created_at;
      }
    });

    return communities.map(community => ({
      ...community,
      total_members: memberCountMap[community.id] || 0,
      total_messages: messageCountMap[community.id] || 0,
      last_message_at: lastMessageMap[community.id] || null,
    }));
  }

  /**
   * Get community details by ID
   */
  async getCommunityById(communityId) {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();

    if (error) throw error;
    return data;
  }
}

export default new CommunityService();
