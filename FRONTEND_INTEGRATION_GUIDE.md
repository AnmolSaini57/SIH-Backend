# Frontend Integration Guide - SIH Mental Health Platform

## Project Overview
A multi-tenant mental health platform for educational institutions with role-based access control. Backend built with Node.js/Express + Supabase, providing REST APIs for student mental health support, counsellor management, journaling, assessments, messaging, and community features.

---

## Authentication Architecture

### Authentication Type
**Supabase HTTP-only Cookie-based JWT Authentication**

### Critical Implementation Details

**Frontend Does NOT Use Supabase Client**
- Frontend is a pure HTTP client - no Supabase SDK dependency
- All authentication is handled by backend API endpoints
- Cookies are managed entirely by the browser and backend

**How It Works:**
1. User logs in via backend API (`POST /api/auth/login`)
2. Backend authenticates with Supabase and sets HTTP-only cookies: `sb-access-token`, `sb-refresh-token`
3. Browser automatically sends these cookies with every subsequent request
4. Backend validates JWT from cookie on each request
5. No manual token management needed in frontend

**Required CORS Configuration:**
```javascript
// For fetch API
fetch('http://localhost:5000/api/endpoint', {
  method: 'POST',
  credentials: 'include',  // CRITICAL: Required to send/receive cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})

// For axios
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5000/api';
```

---

## API Configuration

### Base URLs
- **Development**: `http://localhost:5000/api`
- **Production**: Update with deployed backend URL

### Request Headers
- `Content-Type: application/json` (for POST/PUT requests)
- **NO Authorization header needed** - cookies handle auth automatically
- **NO x-college-id header** - college isolation is automatic from JWT

---

## Authentication Endpoints

### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@greenvalley.edu",
  "password": "Test@12345",
  "name": "John Doe",
  "role": "student",
  "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "uuid",
    "email": "student@greenvalley.edu",
    "name": "John Doe",
    "role": "student",
    "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "created_at": "2025-12-01T10:00:00Z"
  }
}
```

**Note**: Registration does NOT automatically log the user in. After successful registration, user must call `/api/auth/login` separately.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.student@greenvalley.edu",
  "password": "Test@12345"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "uuid",
    "email": "john.student@greenvalley.edu",
    "name": "John Doe",
    "role": "student",
    "college_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "college": {
      "id": "uuid",
      "name": "Green Valley College"
    },
    "avatar_url": null,
    "phone": "+91-9876543210",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

**Note**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`) are automatically set on successful login.

### Logout
```http
POST /api/auth/logout

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

---

## User Roles & Permissions

### Available Roles
1. **student** - Can access journaling, assessments, book appointments, messaging with counsellors, community
2. **counsellor** - Can manage appointments, messaging, upload resources, view student assessments (anonymized)
3. **admin** - College-level admin, can manage users within their college
4. **superadmin** - Platform-level admin, can manage colleges and all users

### Role-Based Routing
After login, store user data in frontend state/context:
```javascript
// Example: React Context
const [user, setUser] = useState(null);

// After successful login
setUser(response.data);

// Access role and college_id
const userRole = user.role;
const collegeId = user.college_id;

// Route based on role
if (userRole === 'student') navigate('/student/dashboard');
if (userRole === 'counsellor') navigate('/counsellor/dashboard');
if (userRole === 'admin') navigate('/admin/dashboard');
if (userRole === 'superadmin') navigate('/superadmin/dashboard');
```

---

## Multi-Tenant Architecture

### How Tenant Isolation Works
- Each college is a separate tenant with UUID (`college_id`)
- User's college_id is stored in JWT token and returned in login response
- Backend automatically extracts college_id from JWT
- **Frontend NEVER sends college_id in requests** - it's automatic

### Important
- Users can only see/interact with data from their own college
- Admins can only manage users within their college
- Superadmin can access all colleges

---

## Core Feature APIs

### 1. Profile Management

#### Get Profile (Role-Specific)
```http
GET /api/student/profile
GET /api/counsellor/profile
GET /api/admin/profile
```

#### Update Profile
```http
PUT /api/student/profile
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+91-9876543210",
  "department": "Computer Science",
  "year": 3
}
```

---

### 2. Journaling (Student Only)

#### Create Journal Entry
```http
POST /api/student/journal/daily
POST /api/student/journal/weekly
POST /api/student/journal/worries
Content-Type: application/json

// Daily check-in
{
  "date": "2025-12-01",
  "positive_moments": ["Had a great lecture today"],
  "challenges_faced": ["Struggled with assignment"],
  "todays_reflection": "Overall productive day",
  "intentions_tomorrow": ["Complete assignment", "Exercise"],
  "feelings_space": "Feeling hopeful"
}

// Weekly check-in
{
  "date": "2025-12-01",  // Any date in the week
  "week_reflection": "Good progress this week",
  "next_week_intentions": ["Focus on exams"],
  "self_care_score": 7,  // 1-10
  "self_care_reflection": "Did well with sleep"
}

// Worries journal
{
  "date": "2025-12-01",
  "whats_on_mind": "Worried about exam preparation",
  "intensity": 7,  // 1-10
  "physical_sensations": "Tension in shoulders",
  "helpful_thoughts": "I have studied consistently"
}
```

#### Get Journal Entries
```http
GET /api/student/journal/daily/:date
GET /api/student/journal/weekly/:date
GET /api/student/journal/worries/:date
GET /api/student/journal/date/:date  // All journals for a specific date
GET /api/student/journal/range?start_date=2025-12-01&end_date=2025-12-31
GET /api/student/journal/stats  // Total counts
```

#### AI Positive Reframe (Worries)
```http
POST /api/student/journal/worries/reframe
Content-Type: application/json

{
  "whats_on_mind": "I'm worried I'll fail the exam",
  "intensity": 8,
  "physical_sensations": "Stomach ache, tension"
}

Response includes AI-generated positive reframe using Gemini
```

---

### 3. Mental Health Assessments (Student Only)

#### Submit Assessment
```http
POST /api/student/assessments
Content-Type: application/json

{
  "type": "phq9|gad7|pss10",
  "responses": {
    "q1": 2,
    "q2": 1,
    "q3": 3,
    // ... all questions
  }
}

Response includes score and risk_level (low|moderate|high|severe)
```

#### Get Assessment History
```http
GET /api/student/assessments?type=phq9&limit=10
```

---

### 4. Appointments

#### Student: Book Appointment
```http
POST /api/student/appointments
Content-Type: application/json

{
  "counsellor_id": "uuid",
  "appointment_date": "2025-12-15",
  "appointment_time": "14:00",
  "reason": "Feeling anxious about exams",
  "preferred_mode": "in-person|online"
}
```

#### Student: Get My Appointments
```http
GET /api/student/my-appointments
```

#### Student: Get Counsellors with Availability
```http
GET /api/student/college-counsellors?date=2025-12-15
```

#### Counsellor: Get Appointment Requests
```http
GET /api/counsellor/appointment-requests
```

#### Counsellor: Accept/Decline Appointment
```http
PUT /api/counsellor/appointment-requests/:appointment_id/accept
PUT /api/counsellor/appointment-requests/:appointment_id/decline
```

#### Counsellor: Get All Sessions
```http
GET /api/counsellor/sessions
GET /api/counsellor/sessions-summary  // Completed with notes
```

#### Counsellor: Update Session Notes
```http
PUT /api/counsellor/sessions-summary/:appointment_id
Content-Type: application/json

{
  "session_notes": "Patient showed improvement...",
  "goals_discussed": ["Manage stress", "Improve sleep"]
}
```

---

### 5. Messaging (Student ↔ Counsellor)

#### Create or Get Conversation
```http
POST /api/student/conversations
POST /api/counsellor/conversations
Content-Type: application/json

// Student creates conversation with counsellor
{
  "counsellor_id": "uuid"
}

// Counsellor creates conversation with student
{
  "student_id": "uuid"
}
```

#### Get All Conversations
```http
GET /api/student/conversations
GET /api/counsellor/conversations
```

#### Get Specific Conversation
```http
GET /api/student/conversations/:id
GET /api/counsellor/conversations/:id
```

#### Get Messages in Conversation
```http
GET /api/student/conversations/:id/messages?limit=50&offset=0
GET /api/counsellor/conversations/:id/messages?limit=50&offset=0
```

#### Mark Messages as Read
```http
PUT /api/student/conversations/:id/read
PUT /api/counsellor/conversations/:id/read
```

#### Get Unread Count
```http
GET /api/student/messages/unread-count
GET /api/counsellor/messages/unread-count
```

#### Delete Conversation
```http
DELETE /api/student/conversations/:id
DELETE /api/counsellor/conversations/:id
```

**Note**: Real-time messaging uses WebSocket events (see WebSocket section below)

---

### 6. Resources (Counsellor Only)

#### Counsellor: Upload Resource
```http
POST /api/counsellor/resources
Content-Type: multipart/form-data

// File upload with metadata
FormData with file and fields
```

#### Counsellor: Get Own Resources
```http
GET /api/counsellor/resources
```

#### Counsellor: Get Resource Stats
```http
GET /api/counsellor/resources/stats
```

#### Counsellor: Get Single Resource
```http
GET /api/counsellor/resources/:id
```

#### Counsellor: Update Resource
```http
PUT /api/counsellor/resources/:id
```

#### Counsellor: Delete Resource
```http
DELETE /api/counsellor/resources/:id
```

#### Counsellor: Get Download URL
```http
GET /api/counsellor/resources/:id/download
```

---

### 7. Community (Anonymous Chat Rooms)

#### Get Communities
```http
GET /api/student/communities/all       // All communities
GET /api/student/communities/joined    // Only joined
GET /api/student/communities/available // Not joined

GET /api/counsellor/communities/all
GET /api/counsellor/communities/joined
GET /api/counsellor/communities/available
```

#### Student/Counsellor: Join Community
```http
POST /api/student/communities/:communityId/join
POST /api/counsellor/communities/:communityId/join
```

#### Student/Counsellor: Leave Community
```http
DELETE /api/student/communities/:communityId/leave
DELETE /api/counsellor/communities/:communityId/leave
```

#### Get Community Messages (REST)
```http
GET /api/student/communities/:communityId/messages
GET /api/counsellor/communities/:communityId/messages
```

#### Admin: Create Community
```http
POST /api/admin/communities
Content-Type: application/json

{
  "title": "Exam Stress Support",
  "description": "Share your exam anxiety and coping strategies",
  "category": "academic|social|mental-health|general",
  "is_anonymous": true,
  "max_members": 50
}
```

#### Admin: Get Communities
```http
GET /api/admin/communities
GET /api/admin/communities/statistics
GET /api/admin/communities/:communityId
GET /api/admin/communities/:communityId/messages
```

#### Admin: Update/Delete Community
```http
PUT /api/admin/communities/:communityId
DELETE /api/admin/communities/:communityId
```

#### Send Message (WebSocket)
```javascript
// After joining community via REST API
socket.emit('community:join', { communityId: 'uuid' });
socket.emit('community:message', {
  communityId: 'uuid',
  message: 'Hello everyone!'
});

socket.on('community:message', (data) => {
  // Handle incoming message
});
```

---

### 8. Admin User Management

#### Get Users
```http
GET /api/admin/users?role=student&page=1&limit=20&search=john
```

#### Get User Details
```http
GET /api/admin/users/:user_id
```

#### Create Student
```http
POST /api/admin/users/students
Content-Type: application/json

{
  "email": "newstudent@greenvalley.edu",
  "password": "Test@12345",
  "first_name": "Emma",
  "last_name": "Wilson",
  "roll_number": "GV-CSE-2024-056",
  "department": "Computer Science",
  "year": 1,
  "phone": "+91-9876543210"
}
```

#### Create Counsellor
```http
POST /api/admin/users/counsellors
Content-Type: application/json

{
  "email": "counsellor@greenvalley.edu",
  "password": "Test@12345",
  "first_name": "Dr. Lisa",
  "last_name": "Hope",
  "specialization": "Clinical Psychology",
  "qualifications": "PhD in Psychology",
  "phone": "+91-9876543210"
}
```

#### Delete User
```http
DELETE /api/admin/users/:user_id
```

#### Change User Password
```http
PUT /api/admin/users/:user_id/password
Content-Type: application/json

{
  "new_password": "NewPassword@123"
}
```

---

## WebSocket Integration (Real-time Features)

### Connection Setup

**IMPORTANT: WebSocket Authentication**
Unlike REST APIs that use HTTP-only cookies, WebSocket connections require **explicit token passing** because cookies don't work with WebSocket handshakes. You need to pass the Supabase access token directly.

```javascript
import io from 'socket.io-client';

// Get access token from Supabase session
const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Initialize Socket.IO with token
const token = await getAccessToken();

const socket = io('http://localhost:5000', {
  auth: {
    token: token  // CRITICAL: Pass Supabase access token for WebSocket auth
  },
  transports: ['websocket', 'polling']
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

**Note**: Even though REST APIs use HTTP-only cookies (no Supabase client needed), **WebSocket requires the access token** which means:
- You'll need Supabase client ONLY for WebSocket features (messaging, community)
- OR extract the token from the cookie (if possible) and pass it to Socket.IO
- OR implement a backend endpoint to exchange cookie for token for WebSocket use

### Messaging Events
```javascript
// Join conversation room
socket.emit('join_conversation', { conversation_id: 'uuid' });

// Listen for successful join
socket.on('joined_conversation', (data) => {
  // { conversation_id, message }
});

// Send message
socket.emit('send_message', {
  conversation_id: 'uuid',
  receiver_id: 'uuid',
  message_text: 'Hello!'
});

// Receive new messages
socket.on('new_message', (data) => {
  // { conversation_id, message: {...} }
});

// Receive message notifications (for unread)
socket.on('new_message_notification', (data) => {
  // { conversation_id, message, sender: {...} }
});

// Typing indicator
socket.emit('typing', { conversation_id: 'uuid' });
socket.emit('stop_typing', { conversation_id: 'uuid' });

socket.on('user_typing', (data) => {
  // { conversation_id, user_id, user_name }
});

socket.on('user_stopped_typing', (data) => {
  // { conversation_id, user_id }
});

// Mark messages as read
socket.emit('mark_as_read', { conversation_id: 'uuid' });

socket.on('messages_read', (data) => {
  // { conversation_id, reader_id, read_count }
});

// Unread count updates
socket.on('unread_count_updated', (data) => {
  // { count: number }
});

// Online status
socket.on('online_status', (data) => {
  // { userId, online: boolean }
});

socket.on('user_online_status', (data) => {
  // { conversation_id, user_id, online: boolean }
});

// Leave conversation
socket.emit('leave_conversation', { conversation_id: 'uuid' });
```

### Community Events

**Note**: Community uses a separate namespace `/community`

```javascript
// Connect to community namespace
const socket = io('http://localhost:5000/community', {
  auth: {
    token: accessToken,  // Supabase access token
    userId: user.id,
    userRole: user.role,
    collegeId: user.college_id
  }
});

// Join community room
socket.emit('join-community', { communityId: 'uuid' });

socket.on('joined-community', (data) => {
  // { communityId, message }
});

// Leave community room
socket.emit('leave-community', { communityId: 'uuid' });

socket.on('left-community', (data) => {
  // { communityId, message }
});

// Send message
socket.emit('send-message', {
  communityId: 'uuid',
  messageText: 'Hi everyone!'
});

// Receive messages
socket.on('new-message', (data) => {
  // {
  //   id, communityId, message_text, sender_id, sender_role,
  //   username, anonymous_username, created_at
  // }
});

// Typing indicators
socket.emit('typing', { communityId: 'uuid' });
socket.emit('stop-typing', { communityId: 'uuid' });

socket.on('user-typing', (data) => {
  // { communityId, displayName, userId }
});

socket.on('user-stopped-typing', (data) => {
  // { communityId, userId }
});

// User joined/left notifications
socket.on('user-joined', (data) => {
  // { userId, role, timestamp }
});

socket.on('user-left', (data) => {
  // { userId, role, timestamp }
});

// Error handling
socket.on('error', (data) => {
  // { message: string }
});
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Frontend Error Handling Pattern
```javascript
try {
  const response = await fetch(url, {
    credentials: 'include',
    // ... other options
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Handle error based on status
    if (response.status === 401) {
      // Redirect to login
      navigate('/login');
    } else {
      // Show error message
      showError(data.message || 'Something went wrong');
    }
    return;
  }
  
  // Success
  return data;
} catch (error) {
  console.error('Request failed:', error);
  showError('Network error. Please try again.');
}
```

---

## Testing Credentials

### Seeded Users (Password: `Test@12345` for all)

**Green Valley College** (ID: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`)
- **Student**: `john.student@greenvalley.edu`
- **Student**: `meera.learner@greenvalley.edu`
- **Counsellor**: `robert.mind@greenvalley.edu` (Dr. Robert Mind)
- **Admin**: `alice.admin@greenvalley.edu`

**Horizon Institute** (ID: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`)
- **Student**: `priya.horizon@horizon.edu`
- **Counsellor**: `dr.sharma@horizon.edu`
- **Admin**: `admin.horizon@horizon.edu`

**Platform**
- **Superadmin**: `sara.root@platform.com`

---

## State Management Recommendations

### User Context (React Example)
```javascript
// contexts/AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    setUser(data.data.user);
    return data;
  };

  const logout = async () => {
    await fetch('http://localhost:5000/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Protected Routes
```javascript
// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Usage in routes
<Route path="/student/dashboard" element={
  <ProtectedRoute allowedRoles={['student']}>
    <StudentDashboard />
  </ProtectedRoute>
} />
```

---

## Important Implementation Notes

### DO's ✅
- Always use `credentials: 'include'` in fetch/axios requests
- Store user data in state/context after login for UI decisions
- Implement role-based routing and component rendering
- Handle 401 errors by redirecting to login
- Use WebSocket for real-time messaging and community features
- Validate forms on frontend before sending to backend
- Show loading states during API calls
- Display user-friendly error messages

### DON'Ts ❌
- Don't use Supabase client in frontend
- Don't send Authorization headers
- Don't send college_id or x-college-id headers
- Don't store tokens manually (cookies handle this)
- Don't make requests without `credentials: 'include'`
- Don't expose sensitive data in frontend
- Don't allow access to routes without proper role checks

---

## API Documentation Reference

**Complete Documentation Index**: [`docs/README.md`](./docs/README.md) - Master index with all API docs, quick reference tables, and testing resources

### Detailed Endpoint Documentation:
1. [`docs/AUTH_API_DOCUMENTATION.md`](./docs/AUTH_API_DOCUMENTATION.md) - Authentication (Register, Login, Logout)
2. [`docs/PROFILE_MANAGEMENT_API_DOCUMENTATION.md`](./docs/PROFILE_MANAGEMENT_API_DOCUMENTATION.md) - Profile Management (All Roles)
3. [`docs/APPOINTMENT_MANAGEMENT_API_DOCUMENTATION.md`](./docs/APPOINTMENT_MANAGEMENT_API_DOCUMENTATION.md) - Appointment Booking & Management
4. [`docs/ASSESSMENT_API_DOCUMENTATION.md`](./docs/ASSESSMENT_API_DOCUMENTATION.md) - Mental Health Assessments (PHQ-9, GAD-7, PSS-10, etc.)
5. [`docs/JOURNALING_IMPLEMENTATION_SUMMARY.md`](./docs/JOURNALING_IMPLEMENTATION_SUMMARY.md) - Student Journaling with AI Insights
6. [`docs/MESSAGING_IMPLEMENTATION_SUMMARY.md`](./docs/MESSAGING_IMPLEMENTATION_SUMMARY.md) - Real-time Messaging (REST + WebSocket)
7. [`docs/COMMUNITY_API_QUICK_REFERENCE.md`](./docs/COMMUNITY_API_QUICK_REFERENCE.md) - Anonymous Community Chatrooms (REST + WebSocket)
8. [`docs/IMPLEMENTATION_SUMMARY_RESOURCES.md`](./docs/IMPLEMENTATION_SUMMARY_RESOURCES.md) - Counsellor Resource Management
9. [`docs/ADMIN_USER_MANAGEMENT_SUMMARY.md`](./docs/ADMIN_USER_MANAGEMENT_SUMMARY.md) - Admin User CRUD Operations

### Postman Collections (Pre-configured with Cookie Auth):
All collections in `postman/` folder with test data matching seeded database:
- `Auth_API.postman_collection.json`
- `Profile_Management_API.postman_collection.json`
- `Appointment_Management_API.postman_collection.json`
- `Assessment_API.postman_collection.json`
- `Journaling_API.postman_collection.json`
- `Messaging_API.postman_collection.json`
- `Community_API.postman_collection.json`
- `Resource_Management_API.postman_collection.json`
- `Admin_User_Management_API.postman_collection.json`

---

## Quick Start Checklist

1. ✅ Install axios or use fetch API
2. ✅ Configure CORS with `credentials: 'include'`
3. ✅ Set backend base URL
4. ✅ Create AuthContext for user state management
5. ✅ Implement login/register/logout flows
6. ✅ Set up protected routes with role checks
7. ✅ Initialize Socket.IO client for real-time features
8. ✅ Test with seeded user credentials
9. ✅ Implement error handling for all API calls
10. ✅ Build role-specific dashboards (student, counsellor, admin, superadmin)

---

**Need More Details?**
- Check the [Complete Documentation Index](./docs/README.md) for all API references
- Import Postman collections from `postman/` folder for interactive testing
- Review backend source code in `src/` folder for implementation details
- All documentation files include cookie-based auth examples and testing credentials
