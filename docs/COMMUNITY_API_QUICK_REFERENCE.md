# Community API Quick Reference

## Authentication
- **Method**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- **CORS**: Requires `credentials: 'include'` in all requests
- **No Authorization headers needed**

## Base URLs
- Student: `/api/student/communities`
- Counsellor: `/api/counsellor/communities`
- Admin: `/api/admin/communities`

## Student Endpoints

### List All Communities
```http
GET /api/student/communities/all
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Stress Management",
      "description": "Share stress management tips",
      "total_members": 25,
      "is_joined": false,
      "created_at": "2025-11-30T10:00:00Z"
    }
  ]
}
```

### List Joined Communities
```http
GET /api/student/communities/joined
```

### List Available Communities
```http
GET /api/student/communities/available
```

### Join Community
```http
POST /api/student/communities/:communityId/join
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "community_id": "uuid",
    "user_id": "uuid",
    "role": "student",
    "joined_at": "2025-11-30T10:00:00Z"
  }
}
```

### Leave Community
```http
DELETE /api/student/communities/:communityId/leave
```

### Get Messages
```http
GET /api/student/communities/:communityId/messages?limit=50&before=messageId
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "message_text": "Hello everyone!",
      "sender_role": "student",
      "anonymous_username": "Anonymous_Cat_123",
      "created_at": "2025-11-30T10:00:00Z"
    },
    {
      "id": "uuid",
      "message_text": "Welcome to the group!",
      "sender_role": "counsellor",
      "username": "Dr. Sarah Johnson",
      "created_at": "2025-11-30T10:01:00Z"
    }
  ]
}
```

## Counsellor Endpoints

Same as student endpoints but with base path `/api/counsellor/communities`:
- `GET /all` - All communities
- `GET /joined` - Joined communities
- `GET /available` - Available communities
- `POST /:communityId/join` - Join
- `DELETE /:communityId/leave` - Leave
- `GET /:communityId/messages` - Messages

## Admin Endpoints

### Get Statistics
```http
GET /api/admin/communities/statistics
```
**Response:**
```json
{
  "success": true,
  "data": {
    "total_communities": 10,
    "total_members": 250,
    "avg_members_per_community": 25.0,
    "most_active_community": {
      "title": "Stress Management",
      "message_count": 1234
    }
  }
}
```

### List All Communities (Admin View)
```http
GET /api/admin/communities
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Stress Management",
      "description": "Share stress tips",
      "total_members": 25,
      "total_messages": 500,
      "last_message_at": "2025-11-30T10:00:00Z",
      "created_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

### Create Community
```http
POST /api/admin/communities
Content-Type: application/json

{
  "title": "New Community",
  "description": "Community description"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "New Community",
    "description": "Community description",
    "college_id": "uuid",
    "created_by": "uuid",
    "created_at": "2025-11-30T10:00:00Z"
  }
}
```

### Update Community
```http
PUT /api/admin/communities/:communityId
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### Delete Community
```http
DELETE /api/admin/communities/:communityId
```

### Get Community Details
```http
GET /api/admin/communities/:communityId
```

### Get Community Messages
```http
GET /api/admin/communities/:communityId/messages?limit=50
```

## Socket.IO Events

### Namespace
```
/community
```

### Authentication
```javascript
const socket = io('http://localhost:5000/community', {
  auth: {
    userId: 'user-uuid',
    userRole: 'student', // or 'counsellor', 'admin'
    collegeId: 'college-uuid'
  }
});
```

### Client → Server Events

#### Join Community
```javascript
socket.emit('join-community', {
  communityId: 'uuid'
});
```

#### Leave Community
```javascript
socket.emit('leave-community', {
  communityId: 'uuid'
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  communityId: 'uuid',
  messageText: 'Your message here'
});
```

#### Typing Indicator
```javascript
socket.emit('typing', {
  communityId: 'uuid'
});
```

#### Stop Typing
```javascript
socket.emit('stop-typing', {
  communityId: 'uuid'
});
```

#### Get Message History
```javascript
socket.emit('get-messages', {
  communityId: 'uuid',
  limit: 50,
  beforeMessageId: 'uuid' // optional
});
```

### Server → Client Events

#### Joined Community
```javascript
socket.on('joined-community', (data) => {
  // { communityId, message }
});
```

#### New Message
```javascript
socket.on('new-message', (message) => {
  /* {
    id,
    communityId,
    message_text,
    sender_role,
    username, // for counsellor/admin
    anonymous_username, // for student
    created_at
  } */
});
```

#### Messages History
```javascript
socket.on('messages-history', (data) => {
  /* {
    communityId,
    messages: [...],
    hasMore: boolean
  } */
});
```

#### User Typing
```javascript
socket.on('user-typing', (data) => {
  // { userId, role, communityId }
});
```

#### Error
```javascript
socket.on('error', (data) => {
  // { message }
});
```

## Message Display Format

### Student Message
```
Anonymous_Cat_123
Hello everyone! This is my first message.
10:30 AM
```

### Counsellor/Admin Message
```
Dr. Sarah Johnson (counsellor)
Welcome to the group! Feel free to share.
10:31 AM
```

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not a member, insufficient permissions)
- `404` - Not Found (community doesn't exist)
- `409` - Conflict (already a member)
- `500` - Internal Server Error

## Rate Limiting

API endpoints have standard rate limiting applied. Socket.IO connections are limited by authentication.

## Pagination

Messages support pagination using `limit` and `before` parameters:
```
GET /api/student/communities/:id/messages?limit=50&before=last-message-id
```
