-- Migration: Create announcements and announcement_views tables
-- Purpose: Enable admin announcements with duration-based expiry and view tracking
-- Date: December 9, 2025

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  content text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type varchar(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'event', 'maintenance')),
  target_role varchar(20) DEFAULT 'all' CHECK (target_role IN ('all', 'student', 'counsellor', 'admin')),
  is_active boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  attachment_url varchar(500),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_college ON public.announcements(college_id);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON public.announcements(target_role);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_college_role ON public.announcements(college_id, target_role, is_active);

-- Track which users have seen an announcement
CREATE TABLE IF NOT EXISTS public.announcement_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

-- Indexes for views
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON public.announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON public.announcement_views(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_college ON public.announcement_views(college_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement_college ON public.announcement_views(announcement_id, college_id);
