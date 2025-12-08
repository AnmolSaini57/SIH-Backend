/**
 * Vector Store Module for RAG (Retrieval-Augmented Generation)
 * 
 * This module handles:
 * - Text embedding using OpenAI's embedding model
 * - Storing message embeddings in pgvector
 * - Semantic search over user chat history
 * - Semantic search over knowledge base
 */

import { openai } from './openaiClient.js';
import { supabaseAdmin } from './supabaseAdmin.js';

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-large'; // 3072 dimensions
const EMBEDDING_DIMENSIONS = 3072;
const DEFAULT_TOP_K = 5; // Number of similar items to retrieve
const SIMILARITY_THRESHOLD = 0.7; // Cosine similarity threshold (0-1)

// Simple in-memory cache for embeddings (saves API calls for repeated queries)
const embeddingCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached embedding or generate new one
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
function getCachedEmbedding(text) {
  const cacheKey = text.trim().toLowerCase().substring(0, 200); // Use first 200 chars as key
  const cached = embeddingCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[VectorStore] Using cached embedding');
    return Promise.resolve(cached.embedding);
  }
  
  return null;
}

/**
 * Store embedding in cache
 */
function setCachedEmbedding(text, embedding) {
  const cacheKey = text.trim().toLowerCase().substring(0, 200);
  
  // Simple LRU: Remove oldest if cache is full
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  
  embeddingCache.set(cacheKey, {
    embedding,
    timestamp: Date.now()
  });
}

/**
 * Generate embedding vector for given text using OpenAI
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function embedText(text) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty for embedding');
    }

    // Check cache first
    const cached = getCachedEmbedding(text);
    if (cached) {
      return cached;
    }

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      encoding_format: 'float'
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('[VectorStore] Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Store embedding for a chat message
 * @param {Object} params
 * @param {string} params.messageId - Message UUID
 * @param {string} params.userId - User UUID
 * @param {string} params.conversationId - Conversation UUID
 * @param {string} params.content - Message text content
 * @returns {Promise<Object>} - Created embedding record
 */
async function storeMessageEmbedding({ messageId, userId, conversationId, content }) {
  try {
    // Generate embedding
    const embedding = await embedText(content);

    // Store in database
    const { data, error } = await supabaseAdmin
      .from('ai_message_embeddings')
      .insert({
        message_id: messageId,
        user_id: userId,
        conversation_id: conversationId,
        content: content.substring(0, 5000), // Limit content length
        embedding: JSON.stringify(embedding) // pgvector expects array as string
      })
      .select()
      .single();

    if (error) {
      // If duplicate, that's okay - message already has embedding
      if (error.code === '23505') {
        console.log('[VectorStore] Embedding already exists for message:', messageId);
        return { exists: true };
      }
      throw error;
    }

    console.log('[VectorStore] Stored embedding for message:', messageId);
    return data;
  } catch (error) {
    console.error('[VectorStore] Error storing message embedding:', error.message);
    // Don't throw - this is best-effort
    return { error: error.message };
  }
}

/**
 * Search user's chat history using semantic similarity
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.query - Search query text
 * @param {number} params.topK - Number of results to return
 * @param {string} params.currentConversationId - Optional: exclude current conversation
 * @returns {Promise<Array>} - Array of similar messages with similarity scores
 */
async function searchUserHistory({ userId, query, topK = DEFAULT_TOP_K, currentConversationId = null }) {
  try {
    // Try keyword-based search first (no database changes needed)
    return await keywordSearchUserHistory({ userId, query, topK, currentConversationId });
  } catch (error) {
    console.error('[VectorStore] Error searching user history:', error.message);
    return []; // Return empty array on error, don't break chat
  }
}

/**
 * Keyword-based search (no embeddings needed)
 * Searches through ai_messages table using PostgreSQL text search
 */
async function keywordSearchUserHistory({ userId, query, topK, currentConversationId }) {
  try {
    // Extract keywords from query (simple word tokenization)
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Only words longer than 3 chars
      .slice(0, 10); // Max 10 keywords

    if (keywords.length === 0) {
      console.log('[VectorStore] No valid keywords found in query');
      return [];
    }

    console.log('[VectorStore] Searching with keywords:', keywords);

    // Get user's recent conversations (last 30 days)
    let conversationsQuery = supabaseAdmin
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (currentConversationId) {
      conversationsQuery = conversationsQuery.neq('id', currentConversationId);
    }

    const { data: conversations, error: convError } = await conversationsQuery;
    
    if (convError) throw convError;
    
    if (!conversations || conversations.length === 0) {
      console.log('[VectorStore] No recent conversations found');
      return [];
    }

    const conversationIds = conversations.map(c => c.id);

    // Search messages that contain any of the keywords
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('ai_messages')
      .select('id, conversation_id, message, sender, created_at')
      .in('conversation_id', conversationIds)
      // Search BOTH user and assistant messages for better context
      .order('created_at', { ascending: false })
      .limit(200); // Get more messages for better coverage

    if (msgError) throw msgError;

    if (!messages || messages.length === 0) {
      console.log('[VectorStore] No messages found');
      return [];
    }

    console.log(`[VectorStore] Searching through ${messages.length} total messages`);

    // Score messages based on keyword matches
    const scoredMessages = messages.map(msg => {
      const contentLower = (msg.message || '').toLowerCase();
      let score = 0;
      let matchedKeywords = 0;

      keywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
          matchedKeywords++;
          // Count occurrences for better scoring
          const occurrences = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
          score += occurrences * 2; // Weight by frequency
        }
      });

      // Boost score for messages matching multiple keywords
      score += matchedKeywords * 3;

      // IMPORTANT: Give strong boost to USER messages with keywords
      // User messages contain the information we need (like "My name is john")
      if (msg.sender === 'user' && matchedKeywords > 0) {
        score += matchedKeywords * 5;
        
        // EXTRA BOOST for declarative statements containing important info
        // Pattern: "my name is X", "i am X", "called X", etc.
        if (keywords.includes('name') && 
            (contentLower.includes('my name is') || 
             contentLower.includes('name is') || 
             contentLower.includes('i am') ||
             contentLower.includes('called'))) {
          score += 20; // Major boost for statements introducing themselves
        }
      }

      // Add recency bonus (newer messages get slight boost)
      const daysSinceCreation = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyBonus = Math.max(0, 1 - daysSinceCreation / 30);
      score += recencyBonus;

      return {
        id: msg.id,
        message_id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.message,
        sender: msg.sender,
        created_at: msg.created_at,
        similarity: score > 0 ? Math.min(score / 10, 0.95) : 0, // Normalize to 0-1 range
        matched_keywords: matchedKeywords,
        score
      };
    });

    // Filter messages with at least 1 keyword match and sort by score
    const relevantMessages = scoredMessages
      .filter(msg => msg.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[VectorStore] Found ${relevantMessages.length} relevant messages using keyword search`);
    
    // Log top 3 messages for debugging
    relevantMessages.slice(0, 3).forEach((msg, idx) => {
      const preview = msg.content.substring(0, 80);
      console.log(`[VectorStore]   ${idx+1}. ${msg.sender} (score: ${msg.score.toFixed(2)}): "${preview}..."`);
    });
    
    return relevantMessages;
  } catch (error) {
    console.error('[VectorStore] Keyword search failed:', error.message);
    return [];
  }
}

/**
 * Fallback search if RPC function doesn't exist
 */
async function fallbackSearchUserHistory({ userId, queryEmbedding, topK, currentConversationId }) {
  try {
    let query = supabaseAdmin
      .from('ai_message_embeddings')
      .select('id, content, created_at, conversation_id, message_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Get recent messages

    if (currentConversationId) {
      query = query.neq('conversation_id', currentConversationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate cosine similarity in JavaScript (less efficient but works)
    const withSimilarity = data.map(item => ({
      ...item,
      similarity: 0.8 // Placeholder - actual similarity calculation would be complex
    }));

    return withSimilarity.slice(0, topK);
  } catch (error) {
    console.error('[VectorStore] Fallback search failed:', error.message);
    return [];
  }
}

/**
 * Search knowledge base using semantic similarity
 * @param {Object} params
 * @param {string} params.userId - User UUID (for user-specific knowledge)
 * @param {string} params.query - Search query text
 * @param {number} params.topK - Number of results to return
 * @param {Array<string>} params.sourceTypes - Filter by source types
 * @returns {Promise<Array>} - Array of similar knowledge items
 */
async function searchKnowledge({ userId, query, topK = DEFAULT_TOP_K, sourceTypes = null }) {
  try {
    // Use keyword-based search for resources
    return await keywordSearchKnowledge({ userId, query, topK, sourceTypes });
  } catch (error) {
    console.error('[VectorStore] Error searching knowledge:', error.message);
    return [];
  }
}

/**
 * Keyword-based knowledge search
 */
async function keywordSearchKnowledge({ userId, query, topK, sourceTypes }) {
  try {
    // Extract keywords
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);

    if (keywords.length === 0) {
      return [];
    }

    console.log('[VectorStore] Searching knowledge with keywords:', keywords);

    // Search in resources table (counsellor resources)
    let resourceQuery = supabaseAdmin
      .from('resources')
      .select('id, title, description, content, resource_type, created_at, created_by')
      .limit(50);

    const { data: resources, error: resourceError } = await resourceQuery;

    if (resourceError) throw resourceError;

    if (!resources || resources.length === 0) {
      console.log('[VectorStore] No resources found');
      return [];
    }

    // Score resources based on keyword matches
    const scoredResources = resources.map(resource => {
      const titleLower = (resource.title || '').toLowerCase();
      const descLower = (resource.description || '').toLowerCase();
      const contentLower = (resource.content || '').toLowerCase();
      const combinedText = `${titleLower} ${descLower} ${contentLower}`;
      
      let score = 0;
      let matchedKeywords = 0;

      keywords.forEach(keyword => {
        // Title matches are most important
        if (titleLower.includes(keyword)) {
          matchedKeywords++;
          score += 5;
        }
        // Description matches
        if (descLower.includes(keyword)) {
          matchedKeywords++;
          score += 3;
        }
        // Content matches
        if (contentLower.includes(keyword)) {
          score += 1;
        }
      });

      return {
        id: resource.id,
        source_id: resource.id,
        source_type: 'resource',
        title: resource.title,
        content: resource.description || resource.content?.substring(0, 500) || '',
        metadata: {
          resource_type: resource.resource_type,
          created_by: resource.created_by
        },
        created_at: resource.created_at,
        similarity: score > 0 ? Math.min(score / 10, 0.95) : 0,
        score
      };
    });

    // Filter and sort
    const relevantResources = scoredResources
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[VectorStore] Found ${relevantResources.length} relevant knowledge items using keyword search`);
    
    return relevantResources;
  } catch (error) {
    console.error('[VectorStore] Keyword knowledge search failed:', error.message);
    return [];
  }
}

/**
 * Fallback knowledge search
 */
async function fallbackSearchKnowledge({ userId, queryEmbedding, topK, sourceTypes }) {
  try {
    let query = supabaseAdmin
      .from('knowledge_embeddings')
      .select('id, title, content, source_type, metadata, created_at')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .limit(50);

    if (sourceTypes && sourceTypes.length > 0) {
      query = query.in('source_type', sourceTypes);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.slice(0, topK);
  } catch (error) {
    console.error('[VectorStore] Fallback knowledge search failed:', error.message);
    return [];
  }
}

/**
 * Store embedding for knowledge base item
 * @param {Object} params
 * @param {string} params.sourceType - Type of source (resource, faq, etc.)
 * @param {string} params.sourceId - Original item ID
 * @param {string} params.userId - User ID (null for global)
 * @param {string} params.title - Title
 * @param {string} params.content - Content text
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} - Created embedding record
 */
async function storeKnowledgeEmbedding({ sourceType, sourceId, userId = null, title, content, metadata = {} }) {
  try {
    const embedding = await embedText(`${title}\n\n${content}`);

    const { data, error } = await supabaseAdmin
      .from('knowledge_embeddings')
      .insert({
        source_type: sourceType,
        source_id: sourceId,
        user_id: userId,
        title,
        content: content.substring(0, 10000),
        embedding: JSON.stringify(embedding),
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[VectorStore] Stored knowledge embedding:', title);
    return data;
  } catch (error) {
    console.error('[VectorStore] Error storing knowledge embedding:', error.message);
    return { error: error.message };
  }
}

/**
 * Format retrieved context for RAG prompt
 * @param {Array} historyItems - Retrieved chat history items
 * @param {Array} knowledgeItems - Retrieved knowledge items
 * @returns {string} - Formatted context string
 */
function formatRAGContext(historyItems, knowledgeItems) {
  let context = '';

  // Format chat history
  if (historyItems && historyItems.length > 0) {
    context += '### Relevant Past Conversations:\n\n';
    historyItems.forEach((item, idx) => {
      const date = new Date(item.created_at).toLocaleDateString();
      const speaker = item.sender === 'user' ? 'User' : 'Assistant';
      // Show full message content, not just preview
      context += `${idx + 1}. [${date}] ${speaker}: "${item.content}"\n\n`;
    });
  }

  // Format knowledge base
  if (knowledgeItems && knowledgeItems.length > 0) {
    context += '### Relevant Resources:\n\n';
    knowledgeItems.forEach((item, idx) => {
      const preview = item.content.substring(0, 500);
      context += `${idx + 1}. **${item.title}** (${item.source_type})\n`;
      context += `   ${preview}${item.content.length > 500 ? '...' : ''}\n\n`;
    });
  }

  return context.trim();
}

export {
  embedText,
  storeMessageEmbedding,
  searchUserHistory,
  searchKnowledge,
  storeKnowledgeEmbedding,
  formatRAGContext,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS
};
