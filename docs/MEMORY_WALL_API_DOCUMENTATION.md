# Memory Wall API Documentation

## Overview
The Memory Wall feature allows students to store and manage their personal memories with photos, titles, dates, and descriptions. This document provides comprehensive information about the backend implementation, database structure, and API endpoints.

## Table of Contents
- [Database Schema](#database-schema)
- [Storage Configuration](#storage-configuration)
- [API Endpoints](#api-endpoints)
- [Setup Instructions](#setup-instructions)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)

---

## Database Schema

### Table: `memory_wall`

```sql
CREATE TABLE public.memory_wall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  date date NOT NULL CHECK (date <= CURRENT_DATE),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Indexes
- `idx_memory_wall_student_id` - Fast lookups by student
- `idx_memory_wall_college_id` - Multi-tenant filtering
- `idx_memory_wall_date` - Date-based sorting
- `idx_memory_wall_created_at` - Creation time sorting
- `idx_memory_wall_student_college` - Composite index for common queries

### Constraints
- **Title**: Required, 1-200 characters
- **Date**: Required, cannot be in the future
- **Photo**: Required on creation
- **Student/College**: Required, must exist in respective tables

---

## Storage Configuration

### Bucket: `memory-wall`

**Settings:**
- **Public**: Yes (for photo URLs to work)
- **Max File Size**: 10MB
- **Allowed Formats**: JPG, JPEG, PNG, GIF, WebP, HEIC, HEIF

**File Path Structure:**
```
{college_id}/{student_id}/{timestamp}_{filename}
```

**Example:**
```
550e8400-e29b-41d4-a716-446655440000/
  123e4567-e89b-12d3-a456-426614174000/
    1702145678000_vacation_photo.jpg
    1702145679000_birthday_memory.png
```

---

## API Endpoints

All endpoints require authentication with `student` role. Base path: `/api/student/memory-wall`

### 1. Get All Memories

**Endpoint:** `GET /api/student/memory-wall`

**Description:** Retrieve all memories for the authenticated student.

**Query Parameters:**
- `search` (optional) - Search by title or description
- `startDate` (optional) - Filter from date (YYYY-MM-DD)
- `endDate` (optional) - Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "message": "Memories retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "student_id": "123e4567-e89b-12d3-a456-426614174000",
      "college_id": "789e0123-e89b-12d3-a456-426614174000",
      "photo_url": "https://your-project.supabase.co/storage/v1/object/public/memory-wall/...",
      "title": "Summer Vacation 2025",
      "date": "2025-07-15",
      "description": "Amazing trip to the mountains with friends",
      "created_at": "2025-07-16T10:30:00Z",
      "updated_at": "2025-07-16T10:30:00Z"
    }
  ]
}
```

---

### 2. Create Memory

**Endpoint:** `POST /api/student/memory-wall`

**Description:** Create a new memory with photo upload.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `photo` (required) - Image file (max 10MB)
- `title` (required) - Memory title (max 200 chars)
- `date` (required) - Memory date (YYYY-MM-DD, cannot be future)
- `description` (optional) - Memory description

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('photo', photoFile);
formData.append('title', 'My Birthday Celebration');
formData.append('date', '2025-12-08');
formData.append('description', 'Celebrated my 21st birthday with family');

const response = await fetch('/api/student/memory-wall', {
  method: 'POST',
  body: formData,
  credentials: 'include' // Important for httpOnly cookies
});
```

**Response:**
```json
{
  "success": true,
  "message": "Memory created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "123e4567-e89b-12d3-a456-426614174000",
    "college_id": "789e0123-e89b-12d3-a456-426614174000",
    "photo_url": "https://your-project.supabase.co/storage/v1/object/public/memory-wall/...",
    "title": "My Birthday Celebration",
    "date": "2025-12-08",
    "description": "Celebrated my 21st birthday with family",
    "created_at": "2025-12-09T10:30:00Z",
    "updated_at": "2025-12-09T10:30:00Z"
  }
}
```

---

### 3. Get Single Memory

**Endpoint:** `GET /api/student/memory-wall/:id`

**Description:** Retrieve a specific memory by ID.

**URL Parameters:**
- `id` (required) - Memory UUID

**Response:**
```json
{
  "success": true,
  "message": "Memory retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "123e4567-e89b-12d3-a456-426614174000",
    "college_id": "789e0123-e89b-12d3-a456-426614174000",
    "photo_url": "https://your-project.supabase.co/storage/v1/object/public/memory-wall/...",
    "title": "Summer Vacation 2025",
    "date": "2025-07-15",
    "description": "Amazing trip to the mountains with friends",
    "created_at": "2025-07-16T10:30:00Z",
    "updated_at": "2025-07-16T10:30:00Z"
  }
}
```

---

### 4. Update Memory

**Endpoint:** `PUT /api/student/memory-wall/:id`

**Description:** Update memory details (title, date, description). **Note: Photo cannot be updated.**

**URL Parameters:**
- `id` (required) - Memory UUID

**Request Body:**
```json
{
  "title": "Updated Memory Title",
  "date": "2025-07-16",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Memory updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "123e4567-e89b-12d3-a456-426614174000",
    "college_id": "789e0123-e89b-12d3-a456-426614174000",
    "photo_url": "https://your-project.supabase.co/storage/v1/object/public/memory-wall/...",
    "title": "Updated Memory Title",
    "date": "2025-07-16",
    "description": "Updated description",
    "created_at": "2025-07-16T10:30:00Z",
    "updated_at": "2025-12-09T11:45:00Z"
  }
}
```

---

### 5. Delete Memory

**Endpoint:** `DELETE /api/student/memory-wall/:id`

**Description:** Delete a memory and its associated photo from storage.

**URL Parameters:**
- `id` (required) - Memory UUID

**Response:**
```json
{
  "success": true,
  "message": "Memory deleted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "123e4567-e89b-12d3-a456-426614174000",
    "college_id": "789e0123-e89b-12d3-a456-426614174000",
    "photo_url": "https://your-project.supabase.co/storage/v1/object/public/memory-wall/...",
    "title": "Summer Vacation 2025",
    "date": "2025-07-15",
    "description": "Amazing trip to the mountains with friends",
    "created_at": "2025-07-16T10:30:00Z",
    "updated_at": "2025-07-16T10:30:00Z"
  }
}
```

---

### 6. Get Memory Statistics

**Endpoint:** `GET /api/student/memory-wall/stats`

**Description:** Retrieve statistics about the student's memories.

**Response:**
```json
{
  "success": true,
  "message": "Memory statistics retrieved successfully",
  "data": {
    "totalCount": 25,
    "recentCount": 5,
    "oldestMemoryDate": "2023-01-15",
    "newestMemoryDate": "2025-12-08"
  }
}
```

---

## Setup Instructions

### Step 1: Create Database Table

Execute the SQL to create the `memory_wall` table:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Copy and run the SQL from MEMORY_WALL_SETUP_GUIDE.md
```

Or directly:
```sql
CREATE TABLE IF NOT EXISTS public.memory_wall (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  title text NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  date date NOT NULL CHECK (date <= CURRENT_DATE),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT memory_wall_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_memory_wall_student_id ON public.memory_wall(student_id);
CREATE INDEX idx_memory_wall_college_id ON public.memory_wall(college_id);
CREATE INDEX idx_memory_wall_date ON public.memory_wall(date DESC);
CREATE INDEX idx_memory_wall_created_at ON public.memory_wall(created_at DESC);
CREATE INDEX idx_memory_wall_student_college ON public.memory_wall(student_id, college_id);
```

### Step 2: Setup Storage Bucket

Run the storage bucket setup script:

```bash
node scripts/setupMemoryWallBucket.js
```

That's it! The bucket is created and ready to use. No RLS policies needed since the backend uses the service role key.

### Step 3: Verify Routes

The Memory Wall routes are automatically available at `/api/student/memory-wall` once the server is running.

**Test the endpoint:**
```bash
# Check if routes are registered
curl http://localhost:5000/api/student/memory-wall
```

### Step 4: Environment Variables

Ensure your `.env` file includes:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# File Upload Limits
MAX_IMAGE_SIZE=10485760  # 10MB in bytes (optional, defaults to 10MB)
```

---

## Usage Examples

### Frontend Integration (React)

#### 1. Fetch All Memories

```javascript
const fetchMemories = async () => {
  try {
    const response = await fetch('/api/student/memory-wall', {
      credentials: 'include' // Important for httpOnly cookies
    });
    
    const result = await response.json();
    
    if (result.success) {
      setMemories(result.data);
    }
  } catch (error) {
    console.error('Error fetching memories:', error);
  }
};
```

#### 2. Create New Memory

```javascript
const createMemory = async (photoFile, title, date, description) => {
  try {
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('title', title);
    formData.append('date', date);
    if (description) formData.append('description', description);
    
    const response = await fetch('/api/student/memory-wall', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Memory created:', result.data);
      // Refresh memories list
      fetchMemories();
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Error creating memory:', error);
  }
};
```

#### 3. Update Memory

```javascript
const updateMemory = async (memoryId, updates) => {
  try {
    const response = await fetch(`/api/student/memory-wall/${memoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Memory updated:', result.data);
    }
  } catch (error) {
    console.error('Error updating memory:', error);
  }
};
```

#### 4. Delete Memory

```javascript
const deleteMemory = async (memoryId) => {
  try {
    const response = await fetch(`/api/student/memory-wall/${memoryId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Memory deleted');
      // Refresh memories list
      fetchMemories();
    }
  } catch (error) {
    console.error('Error deleting memory:', error);
  }
};
```

#### 5. Complete Memory Wall Component Example

```jsx
import React, { useState, useEffect } from 'react';

const MemoryWall = () => {
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [photo, setPhoto] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/student/memory-wall', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setMemories(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    
    if (!photo || !title || !date) {
      alert('Please fill in all required fields');
      return;
    }

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('title', title);
    formData.append('date', date);
    if (description) formData.append('description', description);

    try {
      const response = await fetch('/api/student/memory-wall', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        alert('Memory added successfully!');
        setShowAddForm(false);
        // Reset form
        setPhoto(null);
        setTitle('');
        setDate('');
        setDescription('');
        // Refresh list
        fetchMemories();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to add memory');
    }
  };

  return (
    <div className="memory-wall">
      <div className="header">
        <h1>Memory Wall</h1>
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Memory'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMemory} className="add-memory-form">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            required
          />
          <input
            type="text"
            placeholder="Memory Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit">Add Memory</button>
        </form>
      )}

      {isLoading ? (
        <p>Loading memories...</p>
      ) : (
        <div className="memories-grid">
          {memories.map((memory) => (
            <div key={memory.id} className="memory-card">
              <img src={memory.photo_url} alt={memory.title} />
              <h3>{memory.title}</h3>
              <p className="date">{memory.date}</p>
              {memory.description && <p>{memory.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryWall;
```

---

## Error Handling

### Common Error Responses

#### 1. Missing Photo
```json
{
  "success": false,
  "message": "Photo is required. Please choose a photo."
}
```

#### 2. File Size Exceeded
```json
{
  "success": false,
  "message": "Photo size exceeds the limit (10MB)"
}
```

#### 3. Invalid File Type
```json
{
  "success": false,
  "message": "File type not allowed. Allowed image types: jpg, jpeg, png, gif, webp, heic, heif"
}
```

#### 4. Future Date
```json
{
  "success": false,
  "message": "Memory date cannot be in the future"
}
```

#### 5. Title Too Long
```json
{
  "success": false,
  "message": "Title must not exceed 200 characters"
}
```

#### 6. Memory Not Found
```json
{
  "success": false,
  "message": "Memory not found"
}
```

#### 7. Unauthorized Access
```json
{
  "success": false,
  "message": "Memory not found or you do not have permission to update it"
}
```

### Error Handling Best Practices

1. **Always check response status**
   ```javascript
   if (!response.ok) {
     const error = await response.json();
     throw new Error(error.message);
   }
   ```

2. **Display user-friendly messages**
   ```javascript
   try {
     // API call
   } catch (error) {
     alert(`Failed to create memory: ${error.message}`);
   }
   ```

3. **Handle network errors**
   ```javascript
   try {
     // API call
   } catch (error) {
     if (error.name === 'NetworkError') {
       alert('Network error. Please check your connection.');
     } else {
       alert(error.message);
     }
   }
   ```

---

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token in httpOnly cookie
2. **Role-Based Access**: Only students can access Memory Wall endpoints
3. **Multi-Tenancy**: Students can only access memories from their own college
4. **Ownership Verification**: Students can only view/edit/delete their own memories
5. **File Upload Validation**:
   - File type restriction (images only)
   - File size limit (10MB)
   - Secure file naming (timestamps + sanitization)
6. **SQL Injection Protection**: Parameterized queries via Supabase
7. **XSS Prevention**: Input sanitization (trim, length validation)

---

## Testing

### Using Postman

1. **Import Collection**: Create a Postman collection with the endpoints above
2. **Set Authentication**: 
   - Login via `/api/auth/login` first
   - Cookie will be stored automatically
3. **Test Create Memory**:
   - Set method to POST
   - Set body to form-data
   - Add fields: photo (file), title, date, description
4. **Test Other Endpoints**: Use the returned memory ID for GET/PUT/DELETE

### Manual Testing Checklist

- [ ] Create memory with valid photo and data
- [ ] Create memory with future date (should fail)
- [ ] Create memory without photo (should fail)
- [ ] Create memory with oversized photo (should fail)
- [ ] Fetch all memories
- [ ] Fetch single memory by ID
- [ ] Update memory title
- [ ] Update memory date
- [ ] Delete memory (verify photo is deleted from storage)
- [ ] Try to access another student's memory (should fail)

---

## Performance Considerations

1. **Database Indexes**: All queries use indexed columns for optimal performance
2. **Photo Optimization**: Consider implementing image compression on frontend before upload
3. **Pagination**: For large memory collections, implement pagination in frontend
4. **Caching**: Consider caching memory lists in frontend state/localStorage
5. **Lazy Loading**: Implement lazy loading for images in the memory grid

---

## Maintenance

### Cleanup Old Photos

If a database deletion fails but storage deletion succeeds (rare edge case), you may have orphaned photos. Run this cleanup script periodically:

```javascript
// scripts/cleanupOrphanedPhotos.js
import { supabaseAdmin } from '../src/config/supabase.js';

async function cleanupOrphanedPhotos() {
  // Get all photos from storage
  const { data: files } = await supabaseAdmin.storage
    .from('memory-wall')
    .list();

  // Get all photo_urls from database
  const { data: memories } = await supabaseAdmin
    .from('memory_wall')
    .select('photo_url');

  // Find orphaned photos and delete them
  // Implementation left as an exercise
}
```

### Database Backup

Regular backups are handled by Supabase automatically. For additional safety:

```bash
# Export memory_wall table
pg_dump -h your-db-host -U postgres -t memory_wall > memory_wall_backup.sql
```

---

## Support

For issues or questions:
1. Check error logs: `src/logs/`
2. Review Supabase Dashboard for storage/database issues
3. Verify authentication cookies are being sent
4. Check browser console for frontend errors

---

## Changelog

### Version 1.0.0 (December 9, 2025)
- Initial implementation
- Complete CRUD operations
- Photo upload to Supabase storage
- Multi-tenant support
- Statistics endpoint
- Comprehensive error handling

---

**End of Documentation**
