-- Migration: Enable pgvector and create embeddings tables for RAG
-- Description: Sets up vector database infrastructure for semantic search
-- Date: 2025-12-08

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing embeddings of AI chat messages (user + assistant)
-- This enables semantic search over a user's conversation history
CREATE TABLE IF NOT EXISTS ai_message_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- Using text-embedding-3-large which has 3072 dimensions
    embedding vector(3072) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure we don't duplicate embeddings for the same message
    UNIQUE(message_id)
);

-- Index for fast vector similarity search per user
CREATE INDEX IF NOT EXISTS idx_ai_message_embeddings_user_id 
    ON ai_message_embeddings(user_id);

-- Index for fast vector similarity search using cosine distance
CREATE INDEX IF NOT EXISTS idx_ai_message_embeddings_vector 
    ON ai_message_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for conversation-based queries
CREATE INDEX IF NOT EXISTS idx_ai_message_embeddings_conversation 
    ON ai_message_embeddings(conversation_id);


-- Table for storing embeddings of knowledge base content
-- This includes counsellor resources, FAQs, psychoeducation materials, etc.
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL, -- 'resource', 'faq', 'psychoeducation', etc.
    source_id UUID, -- FK to the original resource (counsellor_resources, etc.)
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL for global knowledge
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072) NOT NULL,
    metadata JSONB DEFAULT '{}', -- Additional context (tags, categories, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for global vs user-specific knowledge
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_user_id 
    ON knowledge_embeddings(user_id);

-- Index for source type filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source_type 
    ON knowledge_embeddings(source_type);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector 
    ON knowledge_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for metadata searches
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_metadata 
    ON knowledge_embeddings USING gin(metadata);


-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_knowledge_embeddings_updated_at
    BEFORE UPDATE ON knowledge_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_embeddings_updated_at();


-- Add RLS policies for security

-- ai_message_embeddings: Users can only access their own embeddings
ALTER TABLE ai_message_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_message_embeddings_user_policy ON ai_message_embeddings
    FOR ALL
    USING (user_id = auth.uid());

-- knowledge_embeddings: Users can access global knowledge (user_id IS NULL) or their own
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_embeddings_read_policy ON knowledge_embeddings
    FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY knowledge_embeddings_admin_policy ON knowledge_embeddings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superadmin')
        )
    );


-- Grant necessary permissions (adjust schema/role as needed)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE ai_message_embeddings TO postgres, service_role;
GRANT SELECT ON TABLE ai_message_embeddings TO authenticated;
GRANT ALL ON TABLE knowledge_embeddings TO postgres, service_role;
GRANT SELECT ON TABLE knowledge_embeddings TO authenticated;
