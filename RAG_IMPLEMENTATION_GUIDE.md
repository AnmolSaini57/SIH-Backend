# RAG Implementation Guide

## Overview

We've implemented a complete **Retrieval-Augmented Generation (RAG)** system for the AI companion using pgvector with Supabase/Postgres. This enables semantic search over:
- **User's chat history** (personalized, per-user only)
- **Knowledge base** (counsellor resources, FAQs, psychoeducation)

## Backend Implementation Summary

### 1. Vector Database (pgvector)
- **Tables Created:**
  - `ai_message_embeddings`: Stores embeddings of all user + assistant messages
  - `knowledge_embeddings`: Stores embeddings of counsellor resources, FAQs, etc.
  
- **Security:**
  - Row Level Security (RLS) enabled
  - Users can only access their own message embeddings
  - Knowledge embeddings: global (user_id IS NULL) or user-specific

### 2. New Backend Features
- **Automatic Embedding Storage:** Every chat/voice message is automatically embedded and stored
- **Semantic Search:** Before generating AI responses, the system:
  - Searches user's past conversations for relevant context
  - Searches knowledge base for helpful resources
  - Injects this context into the AI prompt
- **Privacy Guaranteed:** All user history searches filter by user_id - no cross-user data leakage

### 3. API Changes
**No breaking changes!** All existing endpoints work exactly as before:
- `POST /api/ai/chat`
- `POST /api/ai/voice`
- `GET /api/ai/conversations`
- `GET /api/ai/messages`
- `DELETE /api/ai/conversations/:id`

**New Response Field:**
- `ragUsed: boolean` - Indicates if RAG context was retrieved and used

## Setup Instructions

### Step 1: Run Database Migrations

You need to run two SQL migration files in your Supabase SQL editor:

#### Migration 1: Enable pgvector and Create Tables
```bash
# File: migrations/001_enable_pgvector_and_create_embeddings_tables.sql
```

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire contents of `migrations/001_enable_pgvector_and_create_embeddings_tables.sql`
4. Click "Run"
5. Verify success: Check that `ai_message_embeddings` and `knowledge_embeddings` tables exist

#### Migration 2: Create Search Functions
```bash
# File: migrations/002_create_vector_search_functions.sql
```

1. In SQL Editor, create another new query
2. Copy contents of `migrations/002_create_vector_search_functions.sql`
3. Click "Run"
4. Verify: Functions `search_user_message_embeddings` and `search_knowledge_embeddings` should exist

### Step 2: Verify Environment Variables

Ensure your `.env` has:
```env
OPENAI_API_KEY=sk-...  # Must have access to text-embedding-3-large
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
```

### Step 3: Restart Backend Server

```bash
cd backend
npm run dev
```

The backend will now:
- Store embeddings for every message
- Use RAG when generating responses
- Log RAG activity in console

### Step 4: Test RAG System

#### Test 1: Basic Chat
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "message": "I am feeling stressed about exams"
  }'
```

**Expected Response:**
```json
{
  "reply": "...",
  "conversationId": "...",
  "mood": {...},
  "ragUsed": true
}
```

#### Test 2: Check Embeddings Stored
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM ai_message_embeddings;
-- Should show rows after chatting
```

## Frontend Integration

### No Changes Required for Basic Functionality

Your existing frontend code will continue to work without any modifications! The RAG system works transparently in the background.

### Optional: Display RAG Status

If you want to show users when RAG is active:

```javascript
// In your chat component
const sendMessage = async (message) => {
  const response = await fetch('http://localhost:5000/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      userId: currentUser.id,
      conversationId: currentConversationId,
      message: message
    })
  });

  const data = await response.json();
  
  // Optional: Show RAG indicator
  if (data.ragUsed) {
    console.log('✓ Response enhanced with context from past conversations and resources');
  }
  
  return data;
};
```

### Voice Endpoint (No Changes)

Your voice recording implementation continues to work:

```javascript
const sendVoiceMessage = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('userId', currentUser.id);
  formData.append('conversationId', conversationId);

  const response = await fetch('http://localhost:5000/api/ai/voice', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  const data = await response.json();
  // data.ragUsed will indicate if RAG was used
  return data;
};
```

## Monitoring RAG

### Backend Logs

Watch your backend console for RAG activity:

```
[VectorStore] Stored embedding for message: abc123...
[RAG] Retrieved 5 history items, 3 knowledge items
[RAG Voice] Retrieved 2 history items, 4 knowledge items
```

### Database Queries

Check embedding storage:

```sql
-- Count embeddings per user
SELECT user_id, COUNT(*) as embedding_count
FROM ai_message_embeddings
GROUP BY user_id;

-- View recent embeddings
SELECT id, content, created_at
FROM ai_message_embeddings
ORDER BY created_at DESC
LIMIT 10;

-- Check knowledge base
SELECT source_type, COUNT(*) as count
FROM knowledge_embeddings
GROUP BY source_type;
```

## Performance Considerations

### Current Configuration
- **Top K Results:** 5 history items + 5 knowledge items per query
- **Similarity Threshold:** 0.7 (cosine similarity)
- **Embedding Model:** text-embedding-3-large (3072 dimensions)

### Optimization Tips

1. **Adjust Top K** in `vectorStore.js`:
```javascript
const DEFAULT_TOP_K = 5; // Increase for more context, decrease for speed
```

2. **Disable RAG Temporarily** in `aiChatController.js`:
```javascript
const RAG_ENABLED = false; // Set to false to disable RAG
```

3. **Monitor OpenAI Costs:**
   - Embeddings: ~$0.00013 per 1K tokens
   - Chat: ~$0.01 per 1K tokens (GPT-4)
   - Each message creates 1 embedding + uses embeddings for search

## Populating Knowledge Base

To add counsellor resources, FAQs, etc. to the knowledge base:

```javascript
// Example script (create as scripts/populateKnowledge.js)
import { storeKnowledgeEmbedding } from '../src/utils/vectorStore.js';

const resources = [
  {
    sourceType: 'resource',
    sourceId: 'resource-uuid-1',
    userId: null, // null = global, or specific user UUID
    title: 'Managing Exam Stress',
    content: 'Stress before exams is normal. Try these techniques: 1) Break study into 25-min chunks...',
    metadata: { category: 'stress', tags: ['exams', 'coping'] }
  },
  {
    sourceType: 'faq',
    sourceId: 'faq-uuid-1',
    userId: null,
    title: 'What is Cognitive Behavioral Therapy?',
    content: 'CBT is a type of talk therapy that helps you identify negative thought patterns...',
    metadata: { category: 'therapy' }
  }
];

for (const resource of resources) {
  await storeKnowledgeEmbedding(resource);
  console.log(`Stored: ${resource.title}`);
}
```

Run it:
```bash
node scripts/populateKnowledge.js
```

## Troubleshooting

### Issue: "No embeddings being created"

**Check:**
1. `RAG_ENABLED = true` in `aiChatController.js`
2. OpenAI API key is valid
3. Backend logs show no errors
4. Run migration files successfully

**Test:**
```sql
-- Should return ai_message_embeddings table
SELECT * FROM information_schema.tables 
WHERE table_name = 'ai_message_embeddings';
```

### Issue: "RAG not affecting responses"

**Check:**
1. Embeddings exist: `SELECT COUNT(*) FROM ai_message_embeddings;`
2. Knowledge base populated: `SELECT COUNT(*) FROM knowledge_embeddings;`
3. Backend logs show "Retrieved X history items"
4. Try asking about topics from past conversations

### Issue: "OpenAI embedding errors"

**Check:**
1. OPENAI_API_KEY is correct
2. API key has access to `text-embedding-3-large` model
3. No rate limits hit (check OpenAI dashboard)

**Fallback:**
Change model in `vectorStore.js`:
```javascript
const EMBEDDING_MODEL = 'text-embedding-ada-002'; // Older, cheaper model
const EMBEDDING_DIMENSIONS = 1536; // Update dimension
```

Then re-run migrations with new dimension.

### Issue: "Slow response times"

**Solutions:**
1. Reduce `DEFAULT_TOP_K` from 5 to 3
2. Increase `SIMILARITY_THRESHOLD` from 0.7 to 0.8 (fewer, more relevant results)
3. Use database indexes (already created in migrations)
4. Consider caching frequently accessed embeddings

## Feature Flags

You can toggle RAG on/off without code changes:

```javascript
// aiChatController.js
const RAG_ENABLED = process.env.RAG_ENABLED === 'true'; // Read from env
```

Then in `.env`:
```env
RAG_ENABLED=true  # or false to disable
```

## Next Steps

1. **Populate Knowledge Base:** Add counsellor resources, FAQs, coping strategies
2. **Monitor Usage:** Watch logs to see how RAG improves responses
3. **Tune Parameters:** Adjust Top K and similarity threshold based on user feedback
4. **Analytics:** Track `ragUsed: true` responses to measure impact

## Security Notes

- ✅ User chat history is strictly isolated (RLS policies enforce user_id filtering)
- ✅ No user can access another user's embeddings
- ✅ Knowledge base can be global or user-specific
- ✅ Crisis detection still works before RAG (safety first)
- ✅ All existing authentication and authorization preserved

## Support

If you encounter issues:
1. Check backend console logs for `[RAG]` or `[VectorStore]` messages
2. Verify migrations ran successfully in Supabase
3. Test with simple queries first ("tell me about stress")
4. Ensure OpenAI API key is valid and has credits

---

**RAG System Status:** ✅ Fully Implemented & Production Ready

The system is designed to be:
- **Non-breaking:** Existing features work unchanged
- **Safe:** User data privacy guaranteed
- **Performant:** Optimized vector searches with indexes
- **Extensible:** Easy to add new knowledge sources
