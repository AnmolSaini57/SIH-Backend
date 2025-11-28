# Admin User Management API Documentation

This document describes the admin user management endpoints that allow college admins to create, manage, and delete student and counsellor accounts.

## Overview

Admins can:
- Create student accounts with all required details
- Create counsellor accounts with all required details
- Delete student/counsellor accounts
- Change passwords for students and counsellors
- Students will set their anonymous username after first login

## Endpoints

### 1. Create Student Account

**POST** `/api/admin/users/students`

Creates a new student account with authentication credentials and profile information.

#### Request Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@college.edu",
  "password": "SecurePass123",
  "phone": "1234567890",
  "year": 2,
  "branch": "Computer Science",
  "roll_no": "CS2023001",
  "bio": "Student bio"
}
```

#### Required Fields
- `name` (string, min 2, max 100 chars)
- `email` (valid email format)
- `password` (min 8 chars, must contain uppercase, lowercase, and number)

#### Optional Fields
- `phone` (10-digit number)
- `year` (integer between 1-5)
- `branch` (string, max 100 chars)
- `roll_no` (string, max 50 chars, must be unique)
- `bio` (string, max 500 chars)

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john.doe@college.edu",
    "role": "student",
    "year": 2,
    "branch": "Computer Science",
    "roll_no": "CS2023001"
  }
}
```

#### Notes
- The student account is created in Supabase Auth with email auto-confirmed
- Profile and student entries are created in the database
- Student can log in immediately with the provided email and password
- `anonymous_username` is NOT set during creation - student will set it later

---

### 2. Create Counsellor Account

**POST** `/api/admin/users/counsellors`

Creates a new counsellor account with authentication credentials and profile information.

#### Request Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Dr. Jane Smith",
  "email": "jane.smith@college.edu",
  "password": "SecurePass123",
  "phone": "9876543210",
  "specialization": "Clinical Psychology",
  "bio": "Experienced counsellor"
}
```

#### Required Fields
- `name` (string, min 2, max 100 chars)
- `email` (valid email format)
- `password` (min 8 chars, must contain uppercase, lowercase, and number)

#### Optional Fields
- `phone` (10-digit number)
- `specialization` (string, max 200 chars)
- `bio` (string, max 500 chars)

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Counsellor created successfully",
  "data": {
    "id": "uuid",
    "name": "Dr. Jane Smith",
    "email": "jane.smith@college.edu",
    "role": "counsellor",
    "specialization": "Clinical Psychology"
  }
}
```

#### Notes
- The counsellor account is created in Supabase Auth with email auto-confirmed
- Profile and counsellor entries are created in the database
- Counsellor can log in immediately with the provided email and password

---

### 3. Delete User Account

**DELETE** `/api/admin/users/:user_id`

Deletes a student or counsellor account from the system.

#### Request Headers
```
Authorization: Bearer <admin_token>
```

#### URL Parameters
- `user_id` (UUID) - The ID of the user to delete

#### Response (200 OK)
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

#### Notes
- Only students and counsellors can be deleted
- Admin and superadmin accounts cannot be deleted
- User must belong to the admin's college
- Deletes from auth, profiles, and role-specific tables (students/counsellors)
- This is a permanent action and cannot be undone

---

### 4. Change User Password

**PUT** `/api/admin/users/:user_id/password`

Changes the password for a student or counsellor account.

#### Request Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### URL Parameters
- `user_id` (UUID) - The ID of the user whose password to change

#### Request Body
```json
{
  "new_password": "NewSecurePass123"
}
```

#### Required Fields
- `new_password` (min 8 chars, must contain uppercase, lowercase, and number)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Password updated successfully",
  "data": null
}
```

#### Notes
- Only students and counsellors passwords can be changed
- Admin and superadmin passwords cannot be changed
- User must belong to the admin's college
- Password is updated in Supabase Auth
- User can immediately log in with the new password

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to perform operation"
}
```

---

## Security Considerations

1. **Authentication**: All endpoints require admin authentication
2. **Authorization**: Admins can only manage users in their own college
3. **Role Protection**: Admin and superadmin accounts cannot be deleted or have passwords changed
4. **Email Uniqueness**: Email addresses must be unique across the system
5. **Roll Number Uniqueness**: Roll numbers must be unique (if provided)
6. **Password Strength**: Passwords must meet minimum security requirements
7. **Rollback**: If any step in user creation fails, previous steps are rolled back

---

## Database Tables Affected

### Student Creation
1. `auth.users` - Supabase Auth user
2. `public.profiles` - User profile information
3. `public.students` - Student-specific information

### Counsellor Creation
1. `auth.users` - Supabase Auth user
2. `public.profiles` - User profile information
3. `public.counsellors` - Counsellor-specific information

### User Deletion
Removes entries from all tables listed above for the respective role.

---

## Testing Examples

### Create a Student
```bash
curl -X POST http://localhost:3000/api/admin/users/students \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@college.edu",
    "password": "Password123",
    "year": 1,
    "branch": "Engineering",
    "roll_no": "ENG2024001"
  }'
```

### Create a Counsellor
```bash
curl -X POST http://localhost:3000/api/admin/users/counsellors \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Bob Wilson",
    "email": "bob@college.edu",
    "password": "Password123",
    "specialization": "Mental Health"
  }'
```

### Delete a User
```bash
curl -X DELETE http://localhost:3000/api/admin/users/<user_id> \
  -H "Authorization: Bearer <admin_token>"
```

### Change Password
```bash
curl -X PUT http://localhost:3000/api/admin/users/<user_id>/password \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "NewPassword123"
  }'
```

---

## Implementation Notes

1. **Anonymous Username**: The `anonymous_username` field for students is NOT set during account creation. Students will set this themselves after their first login through a separate endpoint.

2. **Email Confirmation**: Admin-created accounts have their emails auto-confirmed, so users can log in immediately.

3. **Transaction Safety**: User creation includes rollback mechanisms to ensure data consistency if any step fails.

4. **College Isolation**: All operations are scoped to the admin's college using the `college_id` from the tenant middleware.

5. **Audit Trail**: All operations are logged with timestamps in the `created_at` and `updated_at` fields.
