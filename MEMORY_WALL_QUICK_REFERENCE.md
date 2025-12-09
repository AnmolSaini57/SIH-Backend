# Memory Wall - Quick Reference Card

## 🚀 API Endpoints Cheat Sheet

```
Base URL: /api/student/memory-wall
Auth: Required (Student role)
```

### GET `/api/student/memory-wall`
**Get all memories**
```
Query: ?search=keyword&startDate=2025-01-01&endDate=2025-12-31
Response: Array of memory objects
```

### POST `/api/student/memory-wall`
**Create new memory**
```
Content-Type: multipart/form-data
Body:
  - photo: File (required, max 10MB, images only)
  - title: String (required, max 200 chars)
  - date: YYYY-MM-DD (required, no future dates)
  - description: String (optional)
Response: Created memory object
```

### GET `/api/student/memory-wall/:id`
**Get single memory**
```
Response: Memory object
```

### PUT `/api/student/memory-wall/:id`
**Update memory**
```
Content-Type: application/json
Body: { title?, date?, description? }
Note: Photo cannot be updated
Response: Updated memory object
```

### DELETE `/api/student/memory-wall/:id`
**Delete memory**
```
Response: Deleted memory object
Note: Photo is automatically deleted from storage
```

### GET `/api/student/memory-wall/stats`
**Get statistics**
```
Response: { totalCount, recentCount, oldestMemoryDate, newestMemoryDate }
```

---

## 💾 Database Schema

```sql
memory_wall
  ├─ id: uuid (PK)
  ├─ student_id: uuid (FK → profiles)
  ├─ college_id: uuid (FK → colleges)
  ├─ photo_url: text (required)
  ├─ title: text (required, max 200)
  ├─ date: date (required, no future)
  ├─ description: text (optional)
  ├─ created_at: timestamp
  └─ updated_at: timestamp
```

---

## 📦 Storage

```
Bucket: memory-wall
Type: Public
Max Size: 10MB
Formats: JPG, PNG, GIF, WebP, HEIC, HEIF
Path: {college_id}/{student_id}/{timestamp}_{filename}
```

---

## 🔧 Setup Commands

```bash
# 1. Create table in Supabase SQL Editor
# Copy SQL from MEMORY_WALL_SETUP_GUIDE.md

# 2. Setup storage bucket
node scripts/setupMemoryWallBucket.js

# 3. Import Postman collection
# File: postman/Memory_Wall_API.postman_collection.json
```

---

## 📱 Frontend Code Snippets

### Fetch Memories
```javascript
const res = await fetch('/api/student/memory-wall', { credentials: 'include' });
const { data } = await res.json();
```

### Create Memory
```javascript
const formData = new FormData();
formData.append('photo', file);
formData.append('title', title);
formData.append('date', date);
formData.append('description', description);

const res = await fetch('/api/student/memory-wall', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});
```

### Update Memory
```javascript
const res = await fetch(`/api/student/memory-wall/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'New Title' }),
  credentials: 'include'
});
```

### Delete Memory
```javascript
const res = await fetch(`/api/student/memory-wall/${id}`, {
  method: 'DELETE',
  credentials: 'include'
});
```

---

## ⚠️ Validation Rules

| Field | Rules |
|-------|-------|
| photo | Required, max 10MB, images only |
| title | Required, 1-200 chars |
| date | Required, YYYY-MM-DD, no future |
| description | Optional, any length |

---

## 🔒 Security

- ✅ JWT auth required
- ✅ Student role only
- ✅ College isolation
- ✅ Ownership checks
- ✅ File validation
- ✅ Size limits

---

## 🚨 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Photo is required" | No file uploaded | Add photo to form |
| "Photo size exceeds limit" | File > 10MB | Compress photo |
| "Title is required" | Empty title | Add title text |
| "Memory date cannot be in the future" | Date > today | Use valid date |
| "Memory not found" | Wrong ID or not owner | Check ID and ownership |
| "File type not allowed" | Wrong file type | Use JPG/PNG/GIF |

---

## 📊 Response Structure

```javascript
{
  success: true,
  message: "Operation successful",
  data: {
    id: "uuid",
    student_id: "uuid",
    college_id: "uuid",
    photo_url: "https://...",
    title: "Memory Title",
    date: "2025-12-08",
    description: "Description",
    created_at: "2025-12-09T10:30:00Z",
    updated_at: "2025-12-09T10:30:00Z"
  }
}
```

---

## 🛠️ File Locations

| File | Path |
|------|------|
| Service | `src/services/memoryWall.service.js` |
| Controller | `src/controllers/memoryWall.controller.js` |
| Routes | `src/routes/memoryWall.routes.js` |
| Migration | `migrations/005_create_memory_wall_table.sql` |
| Setup Script | `scripts/setupMemoryWallBucket.js` |
| API Docs | `docs/MEMORY_WALL_API_DOCUMENTATION.md` |
| Setup Guide | `MEMORY_WALL_SETUP_GUIDE.md` |
| Postman | `postman/Memory_Wall_API.postman_collection.json` |

---

## 📞 Quick Troubleshooting

**Can't create memory?**
→ Check authentication, file size, file type

**Photos not showing?**
→ Verify bucket is public, check RLS policies

**Route not found?**
→ Restart server, check routes are imported

**Permission denied?**
→ Verify student role, check college_id

---

## 📚 Documentation

- **Full API Docs:** `docs/MEMORY_WALL_API_DOCUMENTATION.md`
- **Setup Guide:** `MEMORY_WALL_SETUP_GUIDE.md`
- **Overview:** `MEMORY_WALL_README.md`

---

**Print this card for quick reference during development!**
