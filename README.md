# SIH Mental Health Platform Backend

## 🚀 Overview
Enterprise-grade Node.js/Express backend for the SIH Mental Health Platform with Supabase integration, multi-tenant architecture, and comprehensive security.

## 🔐 Authentication
**Supabase HTTP-only Cookie-based JWT Authentication**
- HTTP-only cookies (`sb-access-token`, `sb-refresh-token`) for secure token storage
- Automatic token refresh handling
- No Authorization headers required
- Frontend requires `credentials: 'include'` in all requests

## 🏗️ Architecture Features
- **Multi-tenant college isolation**
- **Role-based access control** (Student, Counsellor, Admin, SuperAdmin)
- **Cookie-based JWT authentication** with automatic refresh
- **HttpOnly cookie security**
- **Comprehensive logging** with Winston
- **Rate limiting** and security middleware
- **Real-time features** with Socket.IO (messaging, community)
- **Clean separation of concerns**

## 🔐 Security Features
- HttpOnly cookies for token storage
- Automatic token refresh handling
- Helmet security headers
- CORS configuration
- Rate limiting
- Input validation with Joi
- SQL injection protection via Supabase RLS

## 🏢 Multi-Tenancy
Each college operates as an isolated tenant with complete data separation:
- Students can only access their college data
- Admins manage their specific college
- SuperAdmins have cross-college access
- Automatic tenant filtering in middleware

## 📁 Project Structure
```
sih-backend/
├── package.json
├── .env
├── .gitignore
├── README.md
└── src/
    ├── server.js                 # Application entry point
    ├── app.js                    # Express app configuration
    ├── config/
    │   ├── supabase.js          # Supabase client setup
    │   └── corsOptions.js       # CORS configuration
    ├── middleware/
    │   ├── auth.js              # JWT authentication & refresh
    │   ├── role.js              # Role-based access control
    │   └── tenant.js            # Multi-tenant isolation
    ├── controllers/
    │   ├── auth.controller.js   # Authentication logic
    │   ├── student.controller.js
    │   ├── counsellor.controller.js
    │   ├── admin.controller.js
    │   └── superadmin.controller.js
    ├── routes/
    │   ├── auth.routes.js       # Authentication routes
    │   ├── student.routes.js    # Student-specific routes
    │   ├── counsellor.routes.js
    │   ├── admin.routes.js
    │   └── superadmin.routes.js
    ├── services/
    │   ├── user.service.js      # User business logic
    │   ├── college.service.js   # College management
    │   └── analytics.service.js # Analytics & reporting
    ├── models/
    │   └── index.md             # Database schema documentation
    ├── utils/
    │   ├── response.js          # Standardized API responses
    │   └── validators.js        # Input validation helpers
    └── logs/
        └── access.log           # Application logs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase project setup
- Environment variables configured

### Installation
```bash
cd sih-backend
npm install
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=development
```

### Database Setup
1. Create Supabase project
2. Run the SQL schemas from `src/models/schema.sql`
3. Configure Row Level Security (RLS) policies
4. Set up authentication providers

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📊 API Endpoints

### 📚 Complete API Documentation

**Frontend Integration Guide**: [`FRONTEND_INTEGRATION_GUIDE.md`](./FRONTEND_INTEGRATION_GUIDE.md)
- Complete authentication flow
- All API endpoints with examples
- WebSocket setup
- Role-based routing patterns
- Error handling
- Testing credentials

**Feature-Specific Documentation** (in `docs/` folder):
1. [`AUTH_API_DOCUMENTATION.md`](./docs/AUTH_API_DOCUMENTATION.md) - Login, Register, Logout
2. [`PROFILE_MANAGEMENT_API_DOCUMENTATION.md`](./docs/PROFILE_MANAGEMENT_API_DOCUMENTATION.md) - User profile management
3. [`APPOINTMENT_MANAGEMENT_API_DOCUMENTATION.md`](./docs/APPOINTMENT_MANAGEMENT_API_DOCUMENTATION.md) - Appointment booking system
4. [`ASSESSMENT_API_DOCUMENTATION.md`](./docs/ASSESSMENT_API_DOCUMENTATION.md) - Mental health assessments (PHQ-9, GAD-7, etc.)
5. [`JOURNALING_IMPLEMENTATION_SUMMARY.md`](./docs/JOURNALING_IMPLEMENTATION_SUMMARY.md) - Student journaling with AI insights
6. [`MESSAGING_IMPLEMENTATION_SUMMARY.md`](./docs/MESSAGING_IMPLEMENTATION_SUMMARY.md) - Real-time messaging
7. [`COMMUNITY_API_QUICK_REFERENCE.md`](./docs/COMMUNITY_API_QUICK_REFERENCE.md) - Anonymous community chatrooms
8. [`IMPLEMENTATION_SUMMARY_RESOURCES.md`](./docs/IMPLEMENTATION_SUMMARY_RESOURCES.md) - Counsellor resource management
9. [`ADMIN_USER_MANAGEMENT_SUMMARY.md`](./docs/ADMIN_USER_MANAGEMENT_SUMMARY.md) - Admin user CRUD operations

**Postman Collections** (in `postman/` folder):
- `Auth_API.postman_collection.json`
- `Profile_Management_API.postman_collection.json`
- `Appointment_Management_API.postman_collection.json`
- `Assessment_API.postman_collection.json`
- `Journaling_API.postman_collection.json`
- `Messaging_API.postman_collection.json`
- `Community_API.postman_collection.json`
- `Resource_Management_API.postman_collection.json`
- `Admin_User_Management_API.postman_collection.json`

All collections use cookie-based auth and include test data matching the seeded database.

---

### Quick Endpoint Overview

### Authentication (`/api/auth`)
- `POST /register` - User registration (student, counsellor, admin)
- `POST /login` - User login (sets HTTP-only cookies)
- `POST /logout` - User logout (clears cookies)

### Student Routes (`/api/student`)
- `GET /profile` - Get student profile
- `PUT /profile` - Update student profile
- `GET /counsellors` - Get available counsellors
- `POST /appointments` - Book appointment
- `GET /appointments` - Get appointment history
- `POST /assessments` - Submit mental health assessment
- `GET /assessments` - Get assessment history
- `POST /journaling/entries` - Create journal entry (daily/weekly/worries)
- `GET /journaling/entries` - Get journal entries
- `GET /journaling/insights/:id` - Get AI insights for entry
- `GET /communities` - Get communities
- `POST /communities/:id/join` - Join community
- `GET /resources` - View counsellor resources

### Counsellor Routes (`/api/counsellor`)
- `GET /profile` - Get counsellor profile
- `PUT /profile` - Update profile with available slots
- `GET /appointments` - View appointment requests
- `PUT /appointments/:id` - Confirm/cancel/complete appointments
- `POST /resources` - Upload educational resources
- `GET /resources` - View own resources
- `DELETE /resources/:id` - Delete resource
- `GET /communities` - View communities

### Admin Routes (`/api/admin`)
- `GET /profile` - Get admin profile
- `GET /users` - List users in college
- `POST /users` - Create student or counsellor
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /users/:id/password` - Change user password
- `POST /communities` - Create community
- `PUT /communities/:id` - Update community
- `DELETE /communities/:id` - Delete community

### SuperAdmin Routes (`/api/superadmin`)
- `GET /colleges` - List all colleges
- `POST /colleges` - Create new college
- `PUT /colleges/:id` - Update college
- `DELETE /colleges/:id` - Delete college

### WebSocket Events (Real-time)

**Messaging** (`socket.io`):
- `messaging:join` - Join conversation room
- `messaging:message` - Send message
- `messaging:typing` - Typing indicator
- Events: Real-time message delivery, read receipts

**Community** (`socket.io`):
- `community:join` - Join community room
- `community:message` - Send message to community
- Events: Real-time community messages (anonymous mode supported)

---

## 🧪 Testing Credentials

All passwords: `Test@12345`

**Green Valley College** (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`):
- Student: `john.student@greenvalley.edu`
- Counsellor: `robert.mind@greenvalley.edu` (Dr. Robert Mind)
- Admin: `alice.admin@greenvalley.edu`

**Horizon Institute** (`bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`):
- Student: `priya.horizon@horizon.edu`
- Counsellor: `dr.sharma@horizon.edu`
- Admin: `admin.horizon@horizon.edu`

**Platform**:
- Superadmin: `sara.root@platform.com`

Run seed script: `node scripts/seedUsers.js`

## 🛡️ Security Implementation

### JWT Token Management
```javascript
// Automatic token refresh in auth middleware
if (tokenExpired) {
  const newSession = await refreshToken(refreshToken);
  setSecureCookies(res, newSession);
}
```

### Role-Based Access
```javascript
// Middleware chain example
app.use('/admin', auth, role('admin'), tenant, adminRoutes);
```

### Multi-Tenant Isolation
```javascript
// Automatic tenant filtering
const data = await supabase
  .from('students')
  .select('*')
  .eq('college_id', req.tenant);
```

## 🔧 Development Guidelines

### Error Handling
All endpoints use standardized error responses:
```javascript
import { errorResponse, successResponse } from '../utils/response.js';
```

### Input Validation
Joi schemas for request validation:
```javascript
import { validateLogin } from '../utils/validators.js';
```

### Logging
Winston for comprehensive logging:
```javascript
import logger from '../config/logger.js';
logger.info('User logged in', { userId, college_id });
```

## 📈 Performance Features
- Compression middleware
- Request rate limiting
- Optimized Supabase queries
- Connection pooling
- Response caching strategies

## 🧪 Testing
```bash
# Import Postman collections from postman/ folder
# All collections pre-configured with cookie auth and test data

# Or use curl with cookies:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.student@greenvalley.edu","password":"Test@12345"}' \
  --cookie-jar cookies.txt

curl http://localhost:5000/api/student/profile \
  --cookie cookies.txt
```

## 📝 Contributing
1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Follow ESLint configuration
5. Test multi-tenant scenarios

## 🚀 Deployment
Ready for deployment on:
- Railway
- Vercel
- Render
- AWS/GCP/Azure
- Docker containers

## 📞 Support
For technical support and questions about this backend implementation, please contact the development team.

---

**Built with ❤️ for SIH 2024**