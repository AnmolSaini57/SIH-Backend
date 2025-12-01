# 🎓 Counsellor Resources Backend - Implementation Summary

## Authentication
- **Method**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- **Role**: Counsellor (for uploads), Student (for viewing)
- **CORS**: Requires `credentials: 'include'` in all requests

## ✅ What Was Implemented

A complete backend system for counsellors to upload and manage educational resources.

### Features Implemented:
- ✅ **File Upload** - Counsellors can upload files (PDF, DOCX, PPTX, MP4, images, etc.)
- ✅ **Resource Metadata** - Add name (required) and description (optional)
- ✅ **Resource Management** - View, update, and delete resources
- ✅ **Secure Downloads** - Generate time-limited signed URLs
- ✅ **Statistics** - View total resources, total size, file types breakdown
- ✅ **Multi-tenant Security** - College-based isolation via middleware
- ✅ **File Validation** - Type and size restrictions

---

## 📁 Files Created

### 1. Database Files
- `database/counsellor_resources_schema.sql` - Table schema with RLS policies
  (download count function removed as not needed)

### 2. Backend Code
- `src/controllers/resources.controller.js` - Request handlers (7 endpoints)
- `src/services/resources.service.js` - Business logic layer
- `src/routes/counsellor.routes.js` - Updated with resource routes

### 3. Documentation
- `docs/RESOURCES_IMPLEMENTATION_GUIDE.md` - Complete guide with examples
- `docs/STORAGE_SETUP.md` - Supabase storage configuration
- `docs/QUICK_START_RESOURCES.md` - Quick reference card
- `docs/DATABASE_SCHEMA_RESOURCES.md` - Database schema documentation

### 4. Configuration
- `package.json` - Added multer dependency

---

## 🔧 Setup Required (Your Action Items)

### Step 1: Install Dependencies
```bash
cd SIH-Backend
npm install
```
This installs `multer` for file handling.

### Step 2: Environment Variables
Add to `.env`:
```env
SUPABASE_STORAGE_BUCKET=counsellor-resources
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,mp4,jpg,jpeg,png,txt
```

### Step 3: Create Supabase Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `counsellor-resources`
4. Public: **Yes** (for easier access)
5. Click "Create"

### Step 4: Create Database Table
In Supabase SQL Editor:
- Copy entire content of `database/counsellor_resources_schema.sql`
- Paste and run

### Step 5: Restart Backend
```bash
npm run dev
```

---

## 📡 API Endpoints

### **POST** `/api/counsellor/resources`
Upload a new resource
- Body: `multipart/form-data`
- Fields: `resource_name` (required), `description` (optional), `file` (required)
- Returns: Resource object with metadata

### **GET** `/api/counsellor/resources`
Get all counsellor's resources
- Query params: `search`, `file_type`
- Returns: Array of resources

### **GET** `/api/counsellor/resources/stats`
Get resource statistics
- Returns: Total resources, downloads, size, breakdown by type

### **GET** `/api/counsellor/resources/:id`
Get single resource
- Returns: Resource details

### **PUT** `/api/counsellor/resources/:id`
Update resource metadata
- Body: `resource_name`, `description`
- Returns: Updated resource

### **DELETE** `/api/counsellor/resources/:id`
Delete resource
- Removes from both storage and database
- Returns: Success message

### **GET** `/api/counsellor/resources/:id/download`
Generate download URL
- Returns: Signed URL (expires in 1 hour)

---

## 🗄️ Database Schema

### Table: `counsellor_resources`
```sql
CREATE TABLE public.counsellor_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id uuid NOT NULL REFERENCES profiles(id),
  college_id uuid NOT NULL REFERENCES colleges(id),
  resource_name text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  original_filename text NOT NULL,
  download_count integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### Storage Structure
```
counsellor-resources/
  ├── {counsellor_id_1}/
  │   ├── 1701234567890_file1.pdf
  │   └── 1701234568901_file2.docx
  └── {counsellor_id_2}/
      └── 1701234569012_file3.pptx
```

---

## 🔐 Security Features

1. **Backend Authorization**
   - Middleware enforces counsellor-only access
1. **Backend Authorization**
   - Middleware enforces counsellor-only access
   - Controller verifies ownership

2. **Signed URLs**
   - Download links expire after 1 hour
   - Prevents unauthorized sharing

3. **File Validation**
   - Type restrictions (only allowed extensions)
   - Size limits (50MB default)

4. **Multi-tenant Isolation**
   - Resources scoped by college_id
   - Cross-college access prevented

---

## 🧪 Testing

### Using Postman:

**1. Upload Resource**
```
POST http://localhost:5000/api/counsellor/resources
Headers:
  Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN
Body (form-data):
  resource_name: "Test Resource"
  description: "Test Description"
  file: [select file]
```

**2. Get All Resources**
```
GET http://localhost:5000/api/counsellor/resources
Headers:
  Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN
```

**3. Download Resource**
```
GET http://localhost:5000/api/counsellor/resources/{id}/download
Headers:
  Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN
```

**4. Delete Resource**
```
DELETE http://localhost:5000/api/counsellor/resources/{id}
Headers:
  Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN
```

---

## 💡 Frontend Integration Example

### Upload Component
```jsx
const handleUpload = async (formData) => {
  const data = new FormData();
  data.append('resource_name', formData.name);
  data.append('description', formData.description);
  data.append('file', formData.file);

  const response = await fetch('/api/counsellor/resources', {
    method: 'POST',
    credentials: 'include', // Sends cookies automatically
    body: data
  });

  const result = await response.json();
  if (result.success) {
    console.log('Uploaded:', result.data);
  }
};
```

### Download Handler
```jsx
const handleDownload = async (resourceId) => {
  const response = await fetch(
    `/api/counsellor/resources/${resourceId}/download`,
    {
      credentials: 'include' // Sends cookies automatically
    }
  );
  
  const { data } = await response.json();
  window.open(data.download_url, '_blank');
};
```

---

## 📊 Data Flow

### Upload Flow:
```
Frontend Form
    ↓
Controller (validate file)
    ↓
Service (upload to storage)
    ↓
Supabase Storage
    ↓
Service (save metadata)
    ↓
Database Table
    ↓
Return resource object
```

### Download Flow:
```
Frontend request
    ↓
Controller (verify access)
    ↓
Service (get file path)
    ↓
Generate signed URL
    ↓
Increment download count
    ↓
Return signed URL
    ↓
Frontend downloads file
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "multer not found" | Run `npm install` |
| "Bucket not found" | Create storage bucket in Supabase |
| "Table doesn't exist" | Run schema SQL in SQL Editor |
| "File too large" | Check MAX_FILE_SIZE in .env |
| "File type not allowed" | Check ALLOWED_FILE_TYPES in .env |

---

## ✅ Verification Checklist

Before testing, ensure:
- [ ] `npm install` completed successfully
- [ ] `.env` has 3 new variables
- [ ] Storage bucket `counsellor-resources` created
- [ ] `counsellor_resources` table created
- [ ] Backend server restarted
- [ ] Counsellor token available for testing

---

## 🎯 Next Steps (Optional Enhancements)

1. **Categories/Tags** - Add resource categorization
2. **Versioning** - Allow resource updates with version history
3. **Sharing Controls** - Fine-grained sharing permissions
4. **Analytics** - Track which resources are most popular
5. **Notifications** - Alert students of new resources
6. **Search** - Full-text search across resources
7. **Preview** - Generate thumbnails for PDFs/images
8. **Bulk Upload** - Upload multiple files at once

---

## 📚 Documentation Reference

- **Quick Start**: `docs/QUICK_START_RESOURCES.md`
- **Full Guide**: `docs/RESOURCES_IMPLEMENTATION_GUIDE.md`
- **Storage Setup**: `docs/STORAGE_SETUP.md`
- **Schema Details**: `docs/DATABASE_SCHEMA_RESOURCES.md`

---

## 🤝 Support

All code is fully commented and follows your existing patterns:
- ES6 modules (import/export)
- Async/await
- Error handling
- Response helpers
- Authentication middleware
- Multi-tenant filtering

**Happy Coding! 🚀**

---

**Implementation Date**: November 26, 2025  
**Status**: ✅ Complete - Ready for Testing  
**Dependencies**: Supabase Storage, PostgreSQL, Multer











## 📡 API Endpoints

### **Upload Resource**
```http
POST /api/counsellor/resources
Content-Type: multipart/form-data
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>

Body (form-data):
- resource_name: "Introduction to CBT" (required)
- description: "Cognitive Behavioral Therapy basics" (optional)
- file: <file> (required)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "resource_name": "Introduction to CBT",
    "description": "Cognitive Behavioral Therapy basics",
    "file_url": "https://...",
    "file_type": "pdf",
    "file_size": 1048576,
    "original_filename": "cbt-intro.pdf",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Resource uploaded successfully"
}
```

---

### **Get All Resources**
```http
GET /api/counsellor/resources?search=therapy&file_type=pdf
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "resource_name": "Introduction to CBT",
      "description": "Cognitive Behavioral Therapy basics",
      "file_type": "pdf",
      "file_size": 1048576,
      "download_count": 25,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Resources retrieved successfully"
}
```

---

### **Get Single Resource**
```http
GET /api/counsellor/resources/:id
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>
```

---

### **Update Resource Metadata**
```http
PUT /api/counsellor/resources/:id
Content-Type: application/json
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>

{
  "resource_name": "Updated Resource Name",
  "description": "Updated description"
}
```

---

### **Delete Resource**
```http
DELETE /api/counsellor/resources/:id
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Resource deleted successfully"
  },
  "message": "Resource deleted successfully"
}
```

---

### **Get Download URL**
```http
GET /api/counsellor/resources/:id/download
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "https://supabase-storage-url/signed-url",
    "resource_name": "Introduction to CBT",
    "original_filename": "cbt-intro.pdf"
  },
  "message": "Download URL generated successfully"
}
```

---

### **Get Resource Statistics**
```http
GET /api/counsellor/resources/stats
Cookie: sb-access-token=<token>; sb-refresh-token=<refresh>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_resources": 15,
    "total_size_bytes": 52428800,
    "total_size_formatted": "50 MB",
    "by_type": {
      "pdf": 8,
      "docx": 4,
      "pptx": 2,
      "mp4": 1
    }
  },
  "message": "Resource statistics retrieved successfully"
}
```

---

## 🔐 Security Features

1. **Backend Authorization:** Middleware enforces counsellor-only access
2. **Signed URLs:** Download URLs expire after 1 hour
3. **File Type Validation:** Only allowed file types can be uploaded
4. **File Size Limits:** Maximum 50MB per file (configurable)
5. **Tenant Isolation:** Resources scoped by college_id

---

## 🧪 Testing the API

### Using cURL:

**Upload Resource:**
```bash
curl -X POST http://localhost:5000/api/counsellor/resources \
  -H "Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN" \
  -F "resource_name=Test Resource" \
  -F "description=Test Description" \
  -F "file=@/path/to/file.pdf"
```

**Get Resources:**
```bash
curl -X GET http://localhost:5000/api/counsellor/resources \
  -H "Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN"
```

**Delete Resource:**
```bash
curl -X DELETE http://localhost:5000/api/counsellor/resources/RESOURCE_ID \
  -H "Cookie: sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN"
```

### Using Postman:

1. Create a new request
2. Set method to POST
3. URL: `http://localhost:5000/api/counsellor/resources`
4. Headers → Add:
   - Key: `Cookie`
   - Value: `sb-access-token=YOUR_ACCESS_TOKEN; sb-refresh-token=YOUR_REFRESH_TOKEN`
5. Body → form-data:
   - `resource_name`: "Test Resource"
   - `description`: "Test Description"
   - `file`: (select file)

**Note:** Get tokens from browser cookies after logging in through frontend.

---