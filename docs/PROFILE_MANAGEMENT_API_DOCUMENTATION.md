# Profile Management API Documentation

## Overview
The Profile Management API provides role-specific endpoints for users to view and update their profiles. Each role (student, counsellor, admin, superadmin) has dedicated endpoints with appropriate fields.

## Base URL
```
http://localhost:5000/api
```

## Authentication
- **Required**: Yes - User must be logged in
- **Method**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- **CORS**: Requires `credentials: 'include'` in all requests

---

## Student Profile Endpoints

### Get Student Profile

**Endpoint**: `GET /api/student/profile`

**Authorization**: Student role required

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.student@greenvalley.edu",
    "phone": "+91-9876543210",
    "roll_number": "GV-CSE-2024-055",
    "department": "Computer Science",
    "year": 2,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

### Update Student Profile

**Endpoint**: `PUT /api/student/profile`

**Authorization**: Student role required

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+91-9876543210",
  "department": "Computer Science",
  "year": 3
}
```

**Validation Rules**:
- First Name: Optional, max 100 characters
- Last Name: Optional, max 100 characters
- Phone: Optional, valid phone format
- Department: Optional
- Year: Optional, integer 1-5

**Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+91-9876543210",
    "department": "Computer Science",
    "year": 3,
    "updated_at": "2025-12-01T14:30:00Z"
  }
}
```

---

## Counsellor Profile Endpoints

### Get Counsellor Profile

**Endpoint**: `GET /api/counsellor/profile`

**Authorization**: Counsellor role required

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "first_name": "Dr. Robert",
    "last_name": "Mind",
    "email": "robert.mind@greenvalley.edu",
    "phone": "+91-9876543211",
    "specialization": "Clinical Psychology",
    "qualifications": "PhD in Clinical Psychology, Licensed Therapist",
    "license_number": "PSY-12345-2020",
    "available_slots": [
      {
        "day": "Monday",
        "start_time": "09:00",
        "end_time": "17:00"
      }
    ],
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-10T09:00:00Z"
  }
}
```

### Update Counsellor Profile

**Endpoint**: `PUT /api/counsellor/profile`

**Authorization**: Counsellor role required

**Request Body**:
```json
{
  "first_name": "Dr. Robert",
  "last_name": "Mind",
  "phone": "+91-9876543211",
  "specialization": "Clinical Psychology & Trauma",
  "qualifications": "PhD in Clinical Psychology, Licensed Therapist, EMDR Certified",
  "license_number": "PSY-12345-2020",
  "available_slots": [
    {
      "day": "Monday",
      "start_time": "09:00",
      "end_time": "17:00"
    },
    {
      "day": "Wednesday",
      "start_time": "10:00",
      "end_time": "16:00"
    }
  ]
}
```

**Validation Rules**:
- First Name: Optional, max 100 characters
- Last Name: Optional, max 100 characters
- Phone: Optional, valid phone format
- Specialization: Optional
- Qualifications: Optional
- License Number: Optional
- Available Slots: Optional, array of { day, start_time, end_time }

**Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": "uuid",
    "first_name": "Dr. Robert",
    "last_name": "Mind",
    "phone": "+91-9876543211",
    "specialization": "Clinical Psychology & Trauma",
    "qualifications": "PhD in Clinical Psychology, Licensed Therapist, EMDR Certified",
    "updated_at": "2025-12-01T14:30:00Z"
  }
}
```

---

## Admin Profile Endpoints

### Get Admin Profile

**Endpoint**: `GET /api/admin/profile`

**Authorization**: Admin role required

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "first_name": "Alice",
    "last_name": "Admin",
    "email": "alice.admin@greenvalley.edu",
    "phone": "+91-9876543212",
    "created_at": "2025-01-01T08:00:00Z",
    "updated_at": "2025-01-01T08:00:00Z"
  }
}
```

### Update Admin Profile

**Endpoint**: `PUT /api/admin/profile`

**Authorization**: Admin role required

**Request Body**:
```json
{
  "first_name": "Alice",
  "last_name": "Admin",
  "phone": "+91-9876543212"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": "uuid",
    "first_name": "Alice",
    "last_name": "Admin",
    "phone": "+91-9876543212",
    "updated_at": "2025-12-01T14:30:00Z"
  }
}
```

---

## Common Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "message": "Unauthorized - Please login"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "message": "Access denied - Insufficient permissions"
}
```

**400 Bad Request**:
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Invalid year value"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "Failed to update profile",
  "error": "Database error"
}
```

---

## Frontend Integration Example

```javascript
// Get profile
const getProfile = async (role) => {
  const response = await fetch(`http://localhost:5000/api/${role}/profile`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  
  const data = await response.json();
  return data.data;
};

// Update profile
const updateProfile = async (role, updates) => {
  const response = await fetch(`http://localhost:5000/api/${role}/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};

// Usage
const profile = await getProfile('student');
await updateProfile('student', { year: 3, phone: '+91-9876543210' });
```

---

## Notes

- **Tenant Isolation**: Users can only access their own profile - college_id is extracted from JWT automatically
- **Role-Based Fields**: Each role has specific fields - attempting to update non-existent fields will be ignored
- **Partial Updates**: Only send fields you want to update - other fields remain unchanged
- **Email Updates**: Email cannot be changed through profile endpoints (security restriction)
- **Read-Only Fields**: `user_id`, `college_id`, `created_at`, `email` cannot be modified

---

## Postman Collection
Import: `postman/Profile_Management_API.postman_collection.json`

All requests are pre-configured with proper cookie handling and test data.
