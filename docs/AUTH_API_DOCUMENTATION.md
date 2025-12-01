# Authentication API Documentation

## Overview
The Authentication API handles user registration, login, and logout using **Supabase HTTP-only Cookie-based JWT Authentication**. All endpoints use HTTP-only cookies for secure token management - no Authorization headers required.

## Base URL
```
http://localhost:5000/api/auth
```

## Authentication Method
- **Type**: HTTP-only Cookie-based JWT
- **Cookies**: `sb-access-token`, `sb-refresh-token`
- **CORS**: Requires `credentials: 'include'` in all requests
- **No Authorization headers needed** - cookies are sent automatically

---

## Endpoints

### 1. Register New User

Creates a new user account with role-based profile creation.

**Endpoint**: `POST /api/auth/register`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john.student@greenvalley.edu",
  "password": "Test@12345",
  "role": "student",
  "first_name": "John",
  "last_name": "Doe",
  "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  
  // Role-specific fields for student:
  "roll_number": "GV-CSE-2024-055",
  "department": "Computer Science",
  "year": 2,
  "phone": "+91-9876543210",
  
  // Role-specific fields for counsellor:
  "specialization": "Clinical Psychology",
  "qualifications": "PhD in Psychology",
  "license_number": "PSY-12345",
  "phone": "+91-9876543210"
}
```

**Validation Rules**:
- Email: Valid email format, unique
- Password: Minimum 8 characters
- Role: One of `student`, `counsellor`, `admin`, `superadmin`
- College ID: Valid UUID (except for superadmin)
- Roll Number (student): Required, unique within college
- Department (student): Required
- Year (student): Integer 1-5
- Specialization (counsellor): Required
- Qualifications (counsellor): Required

**Success Response** (201):
```json
{
  "success": true,
  "message": "Student registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john.student@greenvalley.edu",
      "user_metadata": {
        "role": "student",
        "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "first_name": "John",
        "last_name": "Doe"
      }
    },
    "profile": {
      "user_id": "uuid",
      "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "roll_number": "GV-CSE-2024-055",
      "department": "Computer Science",
      "year": 2,
      "phone": "+91-9876543210"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation error or email already exists
- `500 Internal Server Error`: Registration failed

**Notes**:
- HTTP-only cookies (`sb-access-token`, `sb-refresh-token`) are automatically set on successful registration
- User is immediately logged in after registration
- Role-specific profile is created in corresponding table (students/counsellors)

---

### 2. Login

Authenticates existing user and sets authentication cookies.

**Endpoint**: `POST /api/auth/login`

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john.student@greenvalley.edu",
  "password": "Test@12345"
}
```

**Validation Rules**:
- Email: Required, valid email format
- Password: Required

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john.student@greenvalley.edu",
      "user_metadata": {
        "role": "student",
        "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Login failed

**Notes**:
- HTTP-only cookies are automatically set on successful login
- User metadata includes role and college_id for frontend routing
- Cookies are valid until token expiration or logout

---

### 3. Logout

Clears authentication cookies and ends user session.

**Endpoint**: `POST /api/auth/logout`

**Request Headers**:
```
(No special headers required - cookies sent automatically)
```

**Request Body**: None

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses**:
- `500 Internal Server Error`: Logout failed

**Notes**:
- Clears both `sb-access-token` and `sb-refresh-token` cookies
- User must login again to access protected endpoints
- Safe to call even if user is not logged in

---

## Frontend Integration Examples

### Register (Fetch API)
```javascript
const register = async (userData) => {
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    credentials: 'include', // CRITICAL: Required for cookies
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};
```

### Login (Axios)
```javascript
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5000/api';

const login = async (email, password) => {
  try {
    const response = await axios.post('/auth/login', {
      email,
      password
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};
```

### Logout
```javascript
const logout = async () => {
  await fetch('http://localhost:5000/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  // Clear frontend state
  setUser(null);
  navigate('/login');
};
```

---

## Testing Credentials

All passwords: `Test@12345`

**Green Valley College** (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`):
- Student: `john.student@greenvalley.edu`
- Student: `meera.learner@greenvalley.edu`
- Counsellor: `robert.mind@greenvalley.edu`
- Admin: `alice.admin@greenvalley.edu`

**Horizon Institute** (`bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`):
- Student: `priya.horizon@horizon.edu`
- Counsellor: `dr.sharma@horizon.edu`
- Admin: `admin.horizon@horizon.edu`

**Platform**:
- Superadmin: `sara.root@platform.com`

---

## Postman Collection
Import: `postman/Auth_API.postman_collection.json`

All requests are pre-configured with proper cookie handling and test data matching the seeded database.
