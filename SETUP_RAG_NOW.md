# 🚀 RAG Setup - DO THIS NOW!

## Why RAG isn't working:
The database tables and functions don't exist yet. You need to run the migrations!

## Quick Setup (5 minutes):

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run Migration 001
1. Click **New Query**
2. Copy the **entire contents** of `migrations/001_enable_pgvector_and_create_embeddings_tables.sql`
3. Paste into the SQL editor
4. Click **RUN** (bottom right)
5. ✅ You should see "Success. No rows returned"

### Step 3: Run Migration 002
1. Click **New Query** again
2. Copy the **entire contents** of `migrations/002_create_vector_search_functions.sql`
3. Paste into the SQL editor
4. Click **RUN**
5. ✅ You should see "Success. No rows returned"

### Step 4: Verify Setup
Run this verification query in SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('ai_message_embeddings', 'knowledge_embeddings');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%embedding%';
```

You should see:
- 2 tables: `ai_message_embeddings`, `knowledge_embeddings`
- 3 functions: `search_user_message_embeddings`, `search_knowledge_embeddings`, `get_conversation_context`

### Step 5: Test RAG
1. Open your chat interface
2. Send: "My name is John"
3. Wait for response
4. **Start a NEW conversation**
5. Send: "What's my name?"
6. ✅ AI should remember your name from the previous conversation!

## What This Does:
- Creates vector database tables to store conversation embeddings
- Enables semantic search over your chat history
- AI can recall information from past conversations
- Works across different conversation threads

## Troubleshooting:
If you see errors during migration:
- **"relation already exists"** → Safe to ignore, tables already created
- **"permission denied"** → Make sure you're logged in as project owner
- **"extension does not exist"** → Contact Supabase support to enable pgvector

## After Setup:
Once migrations are complete, restart your backend server:
```bash
# The server will auto-restart via nodemon when you save this file
# Or manually: Ctrl+C and run: PORT=5000 npm run dev
```

Check backend logs for:
```
[VectorStore] Stored embedding for message: <message-id>
[RAG] Retrieved 5 history items, 3 knowledge items
```

---

**Need Help?** 
- Check `RAG_IMPLEMENTATION_GUIDE.md` for detailed documentation
- View `FRONTEND_RAG_GUIDE.md` for frontend integration
