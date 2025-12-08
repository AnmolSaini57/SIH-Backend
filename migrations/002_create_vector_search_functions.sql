-- RPC Functions for efficient vector similarity search
-- These functions enable semantic search directly in the database

-- Function to search user's message history by vector similarity
CREATE OR REPLACE FUNCTION search_user_message_embeddings(
    query_embedding vector(3072),
    query_user_id UUID,
    match_count INT DEFAULT 5,
    exclude_conversation_id UUID DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    message_id UUID,
    conversation_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ame.id,
        ame.message_id,
        ame.conversation_id,
        ame.content,
        ame.created_at,
        1 - (ame.embedding <=> query_embedding) AS similarity
    FROM ai_message_embeddings ame
    WHERE ame.user_id = query_user_id
        AND (exclude_conversation_id IS NULL OR ame.conversation_id != exclude_conversation_id)
        AND 1 - (ame.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ame.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search knowledge base by vector similarity
CREATE OR REPLACE FUNCTION search_knowledge_embeddings(
    query_embedding vector(3072),
    query_user_id UUID DEFAULT NULL,
    match_count INT DEFAULT 5,
    source_type_filter TEXT[] DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    source_type VARCHAR(50),
    source_id UUID,
    title TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ke.id,
        ke.source_type,
        ke.source_id,
        ke.title,
        ke.content,
        ke.metadata,
        ke.created_at,
        1 - (ke.embedding <=> query_embedding) AS similarity
    FROM knowledge_embeddings ke
    WHERE (ke.user_id IS NULL OR ke.user_id = query_user_id)
        AND (source_type_filter IS NULL OR ke.source_type = ANY(source_type_filter))
        AND 1 - (ke.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ke.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get conversation context with embeddings
CREATE OR REPLACE FUNCTION get_conversation_context(
    p_conversation_id UUID,
    message_limit INT DEFAULT 10
)
RETURNS TABLE (
    message_id UUID,
    sender VARCHAR(20),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    has_embedding BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        am.id AS message_id,
        am.sender,
        am.content,
        am.created_at,
        EXISTS(SELECT 1 FROM ai_message_embeddings WHERE message_id = am.id) AS has_embedding
    FROM ai_messages am
    WHERE am.conversation_id = p_conversation_id
    ORDER BY am.created_at DESC
    LIMIT message_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_user_message_embeddings TO postgres, service_role, authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_embeddings TO postgres, service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_context TO postgres, service_role, authenticated;
