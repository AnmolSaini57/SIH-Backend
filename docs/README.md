# API Documentation Index

## 📚 Complete Documentation Overview

This folder contains comprehensive documentation for all 9 API collections in the SIH Mental Health Platform backend.

---

## 🔐 Authentication

**All APIs use: Supabase HTTP-only Cookie-based JWT Authentication**
- Cookies: `sb-access-token`, `sb-refresh-token`
- No Authorization headers required
- Frontend must use `credentials: 'include'` in all requests
- Automatic token refresh handled by backend

---

## 📖 API Documentation Files

### 1. [Authentication API](./AUTH_API_DOCUMENTATION.md)
**Endpoints**: Register, Login, Logout  
**Roles**: All  
**Features**:
- User registration with role-specific profiles
- Cookie-based login/logout
- Email validation
- Password security

### 2. [Profile Management API](./PROFILE_MANAGEMENT_API_DOCUMENTATION.md)
**Endpoints**: Get Profile, Update Profile  
**Roles**: Student, Counsellor, Admin  
**Features**:
- Role-specific profile fields
- Partial updates
- Available slots (counsellors)
- Read-only fields protection

### 3. [Appointment Management API](./APPOINTMENT_MANAGEMENT_API_DOCUMENTATION.md)
**Endpoints**: Book, List, Update, Cancel Appointments  
**Roles**: Student, Counsellor  
**Features**:
- Student-counsellor appointment booking
- Status workflow (pending → confirmed → completed)
- In-person & online modes
- Conflict detection

### 4. [Assessment API](./ASSESSMENT_API_DOCUMENTATION.md)
**Endpoints**: Submit Assessment, Get History, Get AI Guidance  
**Roles**: Student  
**Features**:
- 10 mental health assessment types (PHQ-9, GAD-7, PSS-10, etc.)
- Automatic scoring & risk level calculation
- AI-powered recommendations via Gemini
- Assessment history tracking

### 5. [Journaling API](./JOURNALING_IMPLEMENTATION_SUMMARY.md)
**Endpoints**: Create Entry, Get Entries, Get AI Insights  
**Roles**: Student  
**Features**:
- Three journal types: Daily, Weekly, Worries
- Date range queries
- AI positive reframing for worries
- Calendar integration support

### 6. [Messaging API](./MESSAGING_IMPLEMENTATION_SUMMARY.md)
**Endpoints**: REST + WebSocket  
**Roles**: Student, Counsellor  
**Features**:
- Real-time 1-on-1 messaging
- Typing indicators
- Read receipts
- Online status tracking
- Message pagination

### 7. [Community API](./COMMUNITY_API_QUICK_REFERENCE.md)
**Endpoints**: REST + WebSocket  
**Roles**: Student (join), Counsellor (view), Admin (manage)  
**Features**:
- Anonymous chatrooms
- Join/leave communities
- Real-time group messaging
- Category-based organization

### 8. [Resource Management API](./IMPLEMENTATION_SUMMARY_RESOURCES.md)
**Endpoints**: Upload, List, Update, Delete Resources  
**Roles**: Counsellor (create), Student (view)  
**Features**:
- File uploads (PDF, DOCX, PPTX, MP4, images)
- Resource metadata (title, description, category)
- Secure download URLs
- Statistics & analytics

### 9. [Admin User Management API](./ADMIN_USER_MANAGEMENT_SUMMARY.md)
**Endpoints**: CRUD Users, Change Password  
**Roles**: Admin  
**Features**:
- Create students & counsellors
- Update user details
- Delete users (with safety checks)
- Password management
- College-level isolation

### 10. [Realtime Voice Assistant API](./REALTIME_VOICE_API_DOCUMENTATION.md) 🆕
**Endpoints**: Create Voice Session  
**Roles**: Student  
**Features**:
- OpenAI Realtime WebRTC voice conversations
- Natural voice-to-voice AI interactions
- Secure ephemeral token generation
- Real-time transcription & audio streaming
- Low-latency responses (~300ms)

**Quick Start**: See [Setup Guide](./REALTIME_VOICE_SETUP.md)

---

## 🗂️ Additional Documentation

### Architecture & Diagrams
- [Community Architecture Diagrams](./COMMUNITY_ARCHITECTURE_DIAGRAMS.md) - Visual system architecture
- [Community Summary](./COMMUNITY_SUMMARY.md) - Community feature overview

---

## 🧪 Testing Resources

### Postman Collections
All 10 API collections are available in the `postman/` folder:
1. `Auth_API.postman_collection.json`
2. `Profile_Management_API.postman_collection.json`
3. `Appointment_Management_API.postman_collection.json`
4. `Assessment_API.postman_collection.json`
5. `Journaling_API.postman_collection.json`
6. `Messaging_API.postman_collection.json`
7. `Community_API.postman_collection.json`
8. `Resource_Management_API.postman_collection.json`
9. `Admin_User_Management_API.postman_collection.json`
10. `Realtime_Voice_API.postman_collection.json` 🆕
4. `Assessment_API.postman_collection.json`
5. `Journaling_API.postman_collection.json`
6. `Messaging_API.postman_collection.json`
7. `Community_API.postman_collection.json`
8. `Resource_Management_API.postman_collection.json`
9. `Admin_User_Management_API.postman_collection.json`

**Features**:
- Pre-configured with cookie-based auth
- Test data matching seeded database
- All ID variables cleared with descriptions
- No redundant headers or variables

### Test Credentials
All passwords: `Test@12345`

**Green Valley College** (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`):
- Student: `john.student@greenvalley.edu`
- Student: `meera.learner@greenvalley.edu`
- Counsellor: `robert.mind@greenvalley.edu` (Dr. Robert Mind)
- Admin: `alice.admin@greenvalley.edu`

**Horizon Institute** (`bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`):
- Student: `priya.horizon@horizon.edu`
- Counsellor: `dr.sharma@horizon.edu`
- Admin: `admin.horizon@horizon.edu`

**Platform**:
- Superadmin: `sara.root@platform.com`

---

## 🚀 Frontend Integration

**Main Integration Guide**: [`../FRONTEND_INTEGRATION_GUIDE.md`](../FRONTEND_INTEGRATION_GUIDE.md)

This comprehensive guide includes:
- Complete authentication flow
- All API endpoints with request/response examples
- CORS configuration requirements (`credentials: 'include'`)
- WebSocket setup for real-time features
- Role-based routing patterns
- Multi-tenant architecture explanation
- Error handling patterns
- React code examples (Context, Protected Routes)
- Quick start checklist

**Perfect for sharing with frontend developers or AI assistants!**

---

## 📋 Quick Reference Tables

### Roles & Permissions

| Role | Can Access |
|------|------------|
| **Student** | Profile, Appointments, Assessments, Journaling, Messaging (with counsellors), Communities, Resources (view) |
| **Counsellor** | Profile, Appointments, Messaging (with students), Resources (upload/manage), Communities (view) |
| **Admin** | Profile, User Management (CRUD), Communities (manage), College-level data |
| **Superadmin** | All features, College management, Cross-college analytics |

### Multi-Tenant Architecture

- **Tenant Isolation**: Automatic via JWT `college_id`
- **Cross-Tenant Access**: Blocked by middleware
- **No Headers Required**: `x-college-id` NOT needed (extracted from token)
- **Database RLS**: Enforces tenant boundaries at DB level

### Authentication Flow

1. **Login** → POST `/api/auth/login` → Backend sets HTTP-only cookies
2. **Authenticated Request** → Browser sends cookies automatically
3. **Backend** → Validates JWT, extracts user/college data
4. **Response** → Returns data scoped to user's college
5. **Logout** → POST `/api/auth/logout` → Backend clears cookies

---

## 🛠️ Implementation Notes

### DO's ✅
- Always use `credentials: 'include'` in fetch/axios
- Store user data in frontend state after login
- Implement role-based routing
- Handle 401 errors with redirect to login
- Use WebSocket for real-time features
- Validate forms before sending to backend

### DON'Ts ❌
- Don't use Supabase client in frontend
- Don't send Authorization headers
- Don't send `x-college-id` headers
- Don't store tokens manually
- Don't make requests without `credentials: 'include'`

---

## 📞 Support

For questions about the API documentation:
1. Check the specific feature documentation file
2. Review the Postman collection examples
3. Refer to the Frontend Integration Guide
4. Check backend source code in `src/` folder

---

**Last Updated**: December 1, 2025  
**Backend Version**: 1.0.0  
**API Base URL**: `http://localhost:5000/api`
