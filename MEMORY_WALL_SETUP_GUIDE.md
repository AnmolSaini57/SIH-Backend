# Memory Wall Setup Guide

## Quick Start

This guide will walk you through setting up the Memory Wall feature from scratch.

## Prerequisites

- ✅ Node.js backend is running
- ✅ Supabase project is configured
- ✅ Database connection is working
- ✅ Authentication is implemented

---

## Step-by-Step Setup

### 1️⃣ Create Database Table

Navigate to your Supabase Dashboard:

1. Go to **SQL Editor**
2. Click **New query**
3. Copy and paste the SQL below
4. Click **Run** or press `Ctrl+Enter`

**SQL to Execute:**
```sql
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
CREATE INDEX IF NOT EXISTS idx_memory_wall_student_college ON public.memory_wall(student_id, college_id);
```

**Verify:** Check that the `memory_wall` table appears in **Table Editor**

---

### 2️⃣ Setup Storage Bucket

#### Option A: Using Script (Recommended)

Run the automated setup script:

```bash
cd SIH-Backend
node scripts/setupMemoryWallBucket.js
```

That's it! The script creates the bucket with the correct settings.

#### Option B: Manual Setup

1. Go to **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Configure:
   - Name: `memory-wall`
   - Public: ✅ Yes
   - File size limit: `10485760` (10MB)
   - Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp, image/heic, image/heif`
4. Click **Create bucket**

**Note:** No RLS policies needed! The backend uses `SUPABASE_SERVICE_KEY` which bypasses RLS. Authorization is handled by your auth middleware + httpOnly cookies.

**Verify:** Go to **Storage** and check that `memory-wall` bucket exists.

---

### 3️⃣ Test Backend Endpoints

#### Using Postman

1. **Import Collection:**
   - Open Postman
   - Click **Import**
   - Select `postman/Memory_Wall_API.postman_collection.json`

2. **Set Variables:**
   - Click on the collection
   - Go to **Variables** tab
   - Set `baseUrl` to your backend URL (e.g., `http://localhost:5000`)

3. **Login First:**
   - Use your existing Auth API collection
   - Login as a student
   - The cookie will be stored automatically

4. **Test Endpoints:**
   - Try **Create Memory** (upload a photo)
   - Try **Get All Memories**
   - Copy a memory ID
   - Set `memoryId` variable
   - Try **Get Memory By ID**
   - Try **Update Memory**
   - Try **Delete Memory**

#### Using cURL

**Create Memory:**
```bash
curl -X POST http://localhost:5000/api/student/memory-wall \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -F "photo=@/path/to/photo.jpg" \
  -F "title=Test Memory" \
  -F "date=2025-12-08" \
  -F "description=This is a test memory"
```

**Get All Memories:**
```bash
curl http://localhost:5000/api/student/memory-wall \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

---

### 5️⃣ Environment Variables (Optional)

Add to your `.env` file:

```env
# Memory Wall Configuration
MAX_IMAGE_SIZE=10485760  # 10MB (optional, defaults to 10MB)
```

---

## Verification Checklist

- [ ] ✅ `memory_wall` table exists in database
- [ ] ✅ Table has correct columns and indexes
- [ ] ✅ `memory-wall` storage bucket exists
- [ ] ✅ Storage bucket is set to public
- [ ] ✅ Can create a memory via API
- [ ] ✅ Can retrieve memories via API
- [ ] ✅ Can update a memory via API
- [ ] ✅ Can delete a memory via API
- [ ] ✅ Photos are accessible via public URL
- [ ] ✅ Photos are deleted when memory is deleted

---

## Troubleshooting

### Issue: "Photo upload failed: File upload failed"

**Solution:**
- Check that the `memory-wall` bucket exists in Supabase Storage
- Verify bucket is set to public
- Ensure `SUPABASE_SERVICE_KEY` is set in `.env`

### Issue: "College ID not found"

**Solution:**
- Make sure the student's profile has a `college_id` set
- Check that the auth middleware is correctly passing user data

### Issue: "Memory date cannot be in the future"

**Solution:**
- Ensure the date is in YYYY-MM-DD format
- Date must be today or earlier

### Issue: "Photo size exceeds the limit"

**Solution:**
- Compress the photo to under 10MB
- Or increase `MAX_IMAGE_SIZE` in `.env`

### Issue: Photos not displaying

**Solution:**
- Check that the bucket is set to **public**
- Verify the `photo_url` in the database contains a valid URL
- Test the URL directly in a browser

### Issue: "Route not found"

**Solution:**
- Restart the backend server
- Verify routes are imported in `student.routes.js`
- Check that `memoryWall.routes.js` exists

---

## Database Queries for Manual Testing

### View all memories:
```sql
SELECT * FROM memory_wall ORDER BY created_at DESC;
```

### View memories for a specific student:
```sql
SELECT * FROM memory_wall 
WHERE student_id = 'your-student-id' 
ORDER BY date DESC;
```

### Count memories by student:
```sql
SELECT student_id, COUNT(*) as memory_count 
FROM memory_wall 
GROUP BY student_id;
```

### Find memories without descriptions:
```sql
SELECT * FROM memory_wall WHERE description IS NULL;
```

### Delete all test memories (careful!):
```sql
DELETE FROM memory_wall 
WHERE title LIKE '%test%' OR title LIKE '%Test%';
```

---

## Performance Testing

### Test Large Photo Upload

```javascript
// Test with a 9MB photo (near the limit)
const testLargePhoto = async () => {
  const formData = new FormData();
  formData.append('photo', largePhotoFile); // 9-10MB
  formData.append('title', 'Large Photo Test');
  formData.append('date', '2025-12-08');
  
  const start = Date.now();
  const response = await fetch('/api/student/memory-wall', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  const duration = Date.now() - start;
  
  console.log(`Upload took ${duration}ms`);
};
```

### Test Concurrent Requests

```javascript
// Test fetching memories 10 times concurrently
const testConcurrency = async () => {
  const promises = Array(10).fill().map(() => 
    fetch('/api/student/memory-wall', { credentials: 'include' })
  );
  
  const start = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  
  console.log(`10 concurrent requests took ${duration}ms`);
};
```

---

## Security Testing

### ✅ Test Cross-Student Access (Should Fail)

1. Login as Student A
2. Create a memory, note the ID
3. Logout
4. Login as Student B
5. Try to access Student A's memory
6. **Expected:** 404 Not Found

### ✅ Test Counsellor Access (Should Fail)

1. Login as a Counsellor
2. Try to access `/api/student/memory-wall`
3. **Expected:** 403 Forbidden

### ✅ Test Unauthenticated Access (Should Fail)

1. Logout
2. Try to access `/api/student/memory-wall`
3. **Expected:** 401 Unauthorized

---

## Migration Rollback (If Needed)

If you need to remove the Memory Wall feature:

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_memory_wall_student_college;
DROP INDEX IF EXISTS idx_memory_wall_created_at;
DROP INDEX IF EXISTS idx_memory_wall_date;
DROP INDEX IF EXISTS idx_memory_wall_college_id;
DROP INDEX IF EXISTS idx_memory_wall_student_id;

-- Drop table
DROP TABLE IF EXISTS public.memory_wall;

-- Delete storage bucket (do this in Supabase Dashboard)
-- Storage → memory-wall → Settings → Delete bucket
```

---

## Next Steps

1. **Frontend Integration:**
   - See `docs/MEMORY_WALL_API_DOCUMENTATION.md` for React examples
   - Implement photo upload with preview
   - Add loading states and error handling

2. **Enhancements:**
   - Add pagination for large memory collections
   - Implement photo editing/filters before upload
   - Add sharing functionality
   - Enable comments on memories
   - Add tags/categories

3. **Monitoring:**
   - Track upload success rate
   - Monitor storage usage
   - Set up alerts for errors

---

## Support

If you encounter issues:

1. Check backend logs: `src/logs/`
2. Check Supabase logs: Dashboard → Logs
3. Review this setup guide
4. Consult the API documentation

---

**Setup Complete! 🎉**

Your Memory Wall feature is now ready to use. Students can start creating and managing their memories through the API.
