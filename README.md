# SIH Mental Health Platform Backend

## 🚀 Overview
Enterprise-grade Node.js/Express backend for the SIH Mental Health Platform with Supabase integration, multi-tenant architecture, and comprehensive security.

## 🏗️ Architecture Features
- **Multi-tenant college isolation**
- **Role-based access control** (Student, Counsellor, Admin, SuperAdmin)
- **JWT-based authentication** with automatic refresh
- **HttpOnly cookie security**
- **Comprehensive logging** with Winston
- **Rate limiting** and security middleware
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

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh JWT token

### Student Routes (`/student`)
- `GET /profile` - Get student profile
- `PUT /profile` - Update student profile
- `GET /assessments` - Get assessment history
- `POST /assessments` - Submit assessment
- `GET /communities` - Get joined communities
- `GET /appointments` - Get appointments

### Counsellor Routes (`/counsellor`)
- `GET /profile` - Get counsellor profile
- `GET /students` - Get assigned students
- `GET /appointments` - Manage appointments
- `POST /notes` - Add session notes
- `GET /resources` - Access counsellor resources

### Admin Routes (`/admin`)
- `GET /dashboard` - Admin dashboard data
- `GET /users` - Manage college users
- `GET /analytics` - College analytics
- `POST /announcements` - Create announcements
- `GET /reports` - Generate reports

### SuperAdmin Routes (`/superadmin`)
- `GET /colleges` - Manage all colleges
- `GET /global-analytics` - Cross-college analytics
- `POST /colleges` - Create new college
- `GET /system-health` - System monitoring

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
npm test                 # Run all tests
npm run test:unit       # Unit tests
npm run test:integration # Integration tests
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