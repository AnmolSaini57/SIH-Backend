import { supabase } from '../config/supabase.js';

// Calculate expiry timestamp based on duration in days
export const calculateAnnouncementExpiry = (durationDays, startDate = new Date()) => {
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + Number(durationDays || 0));
  return expiry.toISOString();
};

// Mark announcements as expired (no longer display to users) - DO NOT delete from database
// Announcements are hidden by filtering on expires_at, not by deletion
export const cleanupExpiredAnnouncements = async (collegeId) => {
  // NOTE: We no longer delete announcements from the database
  // Instead, the frontend and API endpoints filter based on expires_at timestamp
  // This preserves the announcement history in the database for auditing/analytics
  // See admin controller - it only fetches announcements where expires_at > now()
  if (!collegeId) return;
  console.log('Announcement cleanup: Using filter-based expiry (no database deletion)');
};

// Build seen counts and seen set for a list of announcements within a college
export const getAnnouncementViewStats = async (announcementIds, collegeId, userId = null) => {
  if (!announcementIds || announcementIds.length === 0) {
    return { counts: {}, seen: new Set() };
  }

  let query = supabase
    .from('announcement_views')
    .select('announcement_id,user_id')
    .in('announcement_id', announcementIds);

  if (collegeId) {
    query = query.eq('college_id', collegeId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const counts = {};
  const seen = new Set();

  (data || []).forEach((row) => {
    counts[row.announcement_id] = (counts[row.announcement_id] || 0) + 1;
    if (userId && row.user_id === userId) {
      seen.add(row.announcement_id);
    }
  });

  return { counts, seen };
};
