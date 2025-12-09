import { supabase } from "../config/supabase.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  formatSupabaseError
} from "../utils/response.js";
import {
  cleanupExpiredAnnouncements,
  getAnnouncementViewStats
} from "../services/announcement.service.js";

// Fetch active announcements for the logged-in student/counsellor
export const getAnnouncementsForUser = async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const roleFilter = req.user?.role || 'student';

    const { data, error } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        type,
        target_role,
        duration_days,
        expires_at,
        is_active,
        created_at,
        created_by:created_by ( name )
      `)
      .eq('college_id', req.tenant)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .or(`target_role.eq.all,target_role.eq.${roleFilter}`)
      .order('created_at', { ascending: false });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const announcementIds = (data || []).map((item) => item.id);
    const { counts, seen } = await getAnnouncementViewStats(
      announcementIds,
      req.tenant,
      req.user?.user_id
    );

    const formatted = (data || []).map((item) => ({
      ...item,
      seen_count: counts[item.id] || 0,
      has_seen: seen.has(item.id)
    }));

    return successResponse(res, formatted, 'Announcements fetched successfully');
  } catch (err) {
    console.error('Get announcements for user error:', err);
    return errorResponse(res, 'Failed to fetch announcements', 500);
  }
};

// Mark a single announcement as seen by the logged-in user
export const markAnnouncementSeen = async (req, res) => {
  try {
    const { announcement_id } = req.params;

    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('id, college_id, expires_at, is_active')
      .eq('id', announcement_id)
      .eq('college_id', req.tenant)
      .single();

    if (announcementError || !announcement) {
      return notFoundResponse(res, 'Announcement');
    }

    if (!announcement.is_active || (announcement.expires_at && new Date(announcement.expires_at) <= new Date())) {
      await cleanupExpiredAnnouncements(req.tenant);
      return errorResponse(res, 'Announcement expired or inactive', 410);
    }

    const { error } = await supabase
      .from('announcement_views')
      .upsert({
        announcement_id,
        user_id: req.user.user_id,
        college_id: req.tenant,
        viewed_at: new Date().toISOString()
      }, { onConflict: 'announcement_id,user_id' });

    if (error) {
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const { counts, seen } = await getAnnouncementViewStats(
      [announcement_id],
      req.tenant,
      req.user?.user_id
    );

    return successResponse(res, {
      announcement_id,
      seen_count: counts[announcement_id] || 0,
      has_seen: seen.has(announcement_id)
    }, 'Announcement marked as seen');
  } catch (err) {
    console.error('Mark announcement seen error:', err);
    return errorResponse(res, 'Failed to mark announcement as seen', 500);
  }
};
