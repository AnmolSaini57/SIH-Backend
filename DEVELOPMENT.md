# SIH Backend Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account and project created
- Git installed

### 1. Environment Setup

```bash
# Clone or navigate to backend directory
cd sih-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your Supabase credentials
```

### 2. Supabase Setup

1. **Create a new Supabase project** at https://supabase.com
2. **Get your credentials** from Settings > API
3. **Update .env file** with your credentials:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key  
   SUPABASE_SERVICE_KEY=your_service_key
   SUPABASE_JWT_SECRET=your_jwt_secret
   ```

### 3. Database Schema Setup

Run the SQL commands from `src/models/index.md` in your Supabase SQL editor:

```sql
-- Run each section in order:
-- 1. Create tables
-- 2. Create indexes
-- 3. Set up Row Level Security policies
-- 4. Create functions and triggers
-- 5. Insert initial data
```

### 4. Start Development

```bash
# Start development server with auto-reload
npm run dev

# Or start production server
npm start
```

The server will start on http://localhost:5000

## 🏗️ Project Structure

```
sih-backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── models/          # Database schema docs
│   └── logs/            # Application logs
├── package.json
└── README.md
```

## 🔧 Development Workflow

### Adding New Features

1. **Create controller** in `src/controllers/`
2. **Add routes** in `src/routes/`
3. **Add validation** in `src/utils/validators.js`
4. **Update middleware** if needed
5. **Test endpoints** using Postman/curl

### Database Changes

1. **Update schema** in Supabase dashboard
2. **Document changes** in `src/models/index.md`
3. **Update controllers** to use new schema
4. **Test with sample data**

## 📊 API Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### Authentication
```bash
# Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "name": "Test Student",
    "role": "student",
    "college_id": "your-college-uuid"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com", 
    "password": "password123"
  }'
```

### Protected Routes
```bash
# Get profile (requires cookies from login)
curl http://localhost:5000/api/student/profile \
  -H "Cookie: sb-access-token=your-token; sb-refresh-token=your-refresh-token"
```

## 🛡️ Security Features

### Authentication
- JWT-based authentication with automatic refresh
- Secure HTTP-only cookies
- Password hashing with bcrypt

### Authorization  
- Role-based access control (Student, Counsellor, Admin, SuperAdmin)
- Multi-tenant isolation by college
- Row Level Security (RLS) in database

### Security Middleware
- Helmet for security headers
- CORS protection
- Rate limiting
- Input validation with Joi

## 🏢 Multi-Tenancy

Each college operates as an isolated tenant:

- **Students**: Can only access their college data
- **Counsellors**: Can access assigned students in their college
- **Admins**: Can manage their specific college
- **SuperAdmins**: Have cross-college access

All database queries are automatically filtered by college_id (except for SuperAdmins).

## 📈 Monitoring & Logging

### Application Logs
- **Access logs**: HTTP requests and responses
- **Error logs**: Application errors and exceptions  
- **Debug logs**: Development debugging information

### Health Monitoring
- Memory usage tracking
- Database connection monitoring
- Uptime tracking

## 🧪 Testing Strategy

### Manual Testing
1. Test all authentication flows
2. Verify role-based access controls
3. Test multi-tenant isolation
4. Validate input sanitization

### Automated Testing (Future)
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=your_production_url
SUPABASE_SERVICE_KEY=your_production_service_key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Deployment Platforms
- **Railway**: Connect GitHub repo for automatic deployments
- **Render**: Free tier available with PostgreSQL
- **Vercel**: Serverless functions
- **AWS/GCP/Azure**: Traditional cloud hosting

### Pre-deployment Checklist
- [ ] Update environment variables
- [ ] Set up database with production data
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Test all critical user flows

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify Supabase credentials in .env
- Check if Supabase project is active
- Ensure service key has correct permissions

**CORS Errors** 
- Add frontend URL to CORS_ORIGIN in .env
- Verify frontend is sending credentials: true

**Authentication Issues**
- Check JWT secret matches Supabase project
- Verify cookies are being sent from frontend
- Check if user exists in profiles table

**Permission Denied**
- Verify user has correct role
- Check Row Level Security policies
- Ensure college_id is properly set

### Debugging
```bash
# Enable debug logging
NODE_ENV=development npm run dev

# Check application logs
tail -f src/logs/combined.log

# Monitor database queries in Supabase dashboard
```

## 📞 Support

For technical issues:
1. Check the troubleshooting section above
2. Review application logs
3. Check Supabase dashboard for errors
4. Consult the database schema documentation

## 🔄 Integration with Frontend

### Environment Setup
Update your frontend `.env` file:
```env
VITE_BACKEND_URL=http://localhost:5000
```

### Authentication Flow
1. Frontend sends credentials to `/api/auth/login`
2. Backend sets HTTP-only cookies
3. Frontend makes authenticated requests
4. Backend automatically refreshes tokens when needed

### Error Handling
All API responses follow this format:
```json
{
  "success": true/false,
  "message": "Description",
  "data": {}, // For success responses
  "error": {} // For error responses
}
```

---

**Happy coding! 🎉**