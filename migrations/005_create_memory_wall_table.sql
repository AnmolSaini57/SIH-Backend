-- Migration: Create memory_wall table
-- Purpose: Store student memories with photos, titles, dates, and descriptions
-- Author: SIH Backend Team
-- Date: December 9, 2025

-- Create memory_wall table
CREATE TABLE IF NOT EXISTS public.memory_wall (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  college_id uuid NOT NULL,
  photo_url text NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT memory_wall_pkey PRIMARY KEY (id),
  CONSTRAINT memory_wall_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT memory_wall_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE,
  CONSTRAINT memory_wall_title_check CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  CONSTRAINT memory_wall_date_check CHECK (date <= CURRENT_DATE)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_memory_wall_student_id ON public.memory_wall(student_id);
CREATE INDEX IF NOT EXISTS idx_memory_wall_college_id ON public.memory_wall(college_id);
CREATE INDEX IF NOT EXISTS idx_memory_wall_date ON public.memory_wall(date DESC);
CREATE INDEX IF NOT EXISTS idx_memory_wall_created_at ON public.memory_wall(created_at DESC);

-- Create composite index for common query pattern (student + college)
CREATE INDEX IF NOT EXISTS idx_memory_wall_student_college ON public.memory_wall(student_id, college_id);

-- Add comment to table
COMMENT ON TABLE public.memory_wall IS 'Stores student memories with photos, titles, dates, and descriptions for the Memory Wall feature';

-- Add column comments
COMMENT ON COLUMN public.memory_wall.id IS 'Unique identifier for the memory';
COMMENT ON COLUMN public.memory_wall.student_id IS 'Reference to the student who created the memory';
COMMENT ON COLUMN public.memory_wall.college_id IS 'Reference to the college for multi-tenant support';
COMMENT ON COLUMN public.memory_wall.photo_url IS 'URL of the photo stored in Supabase storage';
COMMENT ON COLUMN public.memory_wall.title IS 'Title of the memory (max 200 characters)';
COMMENT ON COLUMN public.memory_wall.date IS 'Date when the memory occurred (cannot be future date)';
COMMENT ON COLUMN public.memory_wall.description IS 'Optional description of the memory';
COMMENT ON COLUMN public.memory_wall.created_at IS 'Timestamp when the memory was created';
COMMENT ON COLUMN public.memory_wall.updated_at IS 'Timestamp when the memory was last updated';
