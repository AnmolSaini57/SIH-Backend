-- =====================================================
-- MESSAGING SYSTEM SCHEMA
-- =====================================================
-- This schema creates tables for real-time messaging between students and counsellors
-- Features: conversation threads, messages, read receipts, timestamps

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================
-- Stores conversation threads between a student and a counsellor
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  counsellor_id uuid NOT NULL,
  college_id uuid NOT NULL,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT conversations_counsellor_id_fkey FOREIGN KEY (counsellor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT conversations_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id) ON DELETE CASCADE,
  
  -- Ensure only one conversation between a student and counsellor
  CONSTRAINT conversations_unique_pair UNIQUE (student_id, counsellor_id)
);

-- Index for faster queries
CREATE INDEX idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX idx_conversations_counsellor_id ON public.conversations(counsellor_id);
CREATE INDEX idx_conversations_college_id ON public.conversations(college_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
-- Stores individual messages within conversations
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Ensure sender and receiver are different
  CONSTRAINT messages_check_different_users CHECK (sender_id != receiver_id)
);

-- Indexes for faster queries
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

-- =====================================================
-- FUNCTION: Update conversation last_message_at
-- =====================================================
-- Automatically update the conversation's last_message_at when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- FUNCTION: Update read_at timestamp
-- =====================================================
-- Automatically set read_at when is_read is set to true
CREATE OR REPLACE FUNCTION update_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update read_at
CREATE TRIGGER trigger_update_message_read_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
EXECUTE FUNCTION update_message_read_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.conversations IS 'Stores conversation threads between students and counsellors';
COMMENT ON TABLE public.messages IS 'Stores individual messages within conversations';
COMMENT ON COLUMN public.conversations.last_message_at IS 'Timestamp of the last message in the conversation for sorting';
COMMENT ON COLUMN public.messages.is_read IS 'Whether the receiver has read the message';
COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when the message was read';
