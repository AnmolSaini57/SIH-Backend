# Messaging System - Quick Start Guide

## What Was Created

A complete real-time messaging system for students and counsellors with:
- ✅ Database schema (conversations & messages tables)
- ✅ REST APIs for conversation management
- ✅ Socket.io for real-time messaging
- ✅ Typing indicators & read receipts
- ✅ Online/offline status tracking
- ✅ Unread message counts
- ✅ Complete documentation

## Files Created/Modified

### Database
- `src/database/messaging_schema.sql` - Complete database schema with triggers and RLS policies

### Backend Services
- `src/services/messaging.service.js` - Database operations for messaging
- `src/controllers/messaging.controller.js` - HTTP request handlers
- `src/config/socket.js` - Socket.io configuration and helpers
- `src/sockets/messaging.socket.js` - Real-time event handlers

### Routes
- `src/routes/student.routes.js` - Student messaging endpoints
- `src/routes/counsellor.routes.js` - Counsellor messaging endpoints

### Server Configuration
- `src/server.js` - Updated to integrate Socket.io
- `package.json` - Added socket.io dependency

### Documentation
- `docs/MESSAGING_SYSTEM_COMPLETE.md` - Complete documentation

## Setup Instructions

### 1. Run Database Schema
```bash
# Connect to your Supabase database and run the schema
# You can do this via Supabase dashboard SQL editor
```
Copy and paste the contents of `src/database/messaging_schema.sql` into Supabase SQL editor and run it.

### 2. Environment Variables
Ensure these are in your `.env` file:
```
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key
```

### 3. Install Dependencies (Already Done)
```bash
npm install socket.io
```

### 4. Start the Server
```bash
npm run dev
```

The server will start on port 5000 with Socket.io ready.

## API Endpoints

### Student Routes
- `GET /api/student/counsellors-for-messaging` - Get counsellors to start chat
- `GET /api/student/conversations` - Get all conversations
- `POST /api/student/conversations` - Create conversation with counsellor
- `GET /api/student/conversations/:id/messages` - Get messages
- `PUT /api/student/conversations/:id/read` - Mark messages as read
- `GET /api/student/messages/unread-count` - Get unread count
- `DELETE /api/student/conversations/:id` - Delete conversation

### Counsellor Routes
- `GET /api/counsellor/conversations` - Get all conversations
- `GET /api/counsellor/conversations/:id/messages` - Get messages
- `PUT /api/counsellor/conversations/:id/read` - Mark messages as read
- `GET /api/counsellor/messages/unread-count` - Get unread count
- `DELETE /api/counsellor/conversations/:id` - Delete conversation

## Socket.io Events

### Client → Server
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message
- `mark_as_read` - Mark messages as read
- `typing` - User is typing
- `stop_typing` - User stopped typing
- `check_online_status` - Check if user is online

### Server → Client
- `new_message` - Receive new message
- `new_message_notification` - Notification for new message
- `messages_read` - Messages were read
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `user_online_status` - User online status
- `user_offline` - User went offline
- `error` - Error occurred

## Frontend Integration

### Install Socket.io Client
```bash
npm install socket.io-client
```

### Connect to Socket.io
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: yourJwtToken
  }
});
```

### Join a Conversation
```javascript
socket.emit('join_conversation', {
  conversation_id: conversationId
});
```

### Send a Message
```javascript
socket.emit('send_message', {
  conversation_id: conversationId,
  receiver_id: receiverId,
  message_text: 'Hello!'
});
```

### Listen for New Messages
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
  // Add message to UI
});
```

## Flow Diagram

### Student Flow
1. Student logs in → JWT token issued
2. Student navigates to Messages section
3. Frontend calls `GET /api/student/conversations` → Shows list with unread counts
4. Student clicks "New" button → Frontend calls `GET /api/student/counsellors-for-messaging`
5. Student selects counsellor → Frontend calls `POST /api/student/conversations`
6. Frontend connects to Socket.io and emits `join_conversation`
7. Student types message → Socket.io emits `send_message`
8. Real-time updates via Socket.io events

### Counsellor Flow
1. Counsellor logs in → JWT token issued
2. Counsellor navigates to Messages section
3. Frontend calls `GET /api/counsellor/conversations` → Shows list with unread counts
4. Counsellor clicks on a student conversation
5. Frontend connects to Socket.io and emits `join_conversation`
6. Counsellor types message → Socket.io emits `send_message`
7. Real-time updates via Socket.io events

## Features Implemented

✅ **Real-time Messaging**
- Instant message delivery via Socket.io
- No page refresh needed

✅ **Conversation Management**
- One conversation per student-counsellor pair
- Sorted by most recent message

✅ **Read Receipts**
- Track when messages are read
- Double checkmark (✓✓) indicator

✅ **Typing Indicators**
- Show when other user is typing
- Auto-hide after 3 seconds of inactivity

✅ **Online Status**
- Track who is online/offline
- Show online indicator in UI

✅ **Unread Counts**
- Badge showing unread messages per conversation
- Total unread count across all conversations

✅ **Message History**
- Pagination support (50 messages per page)
- Scrollable message history with timestamps

✅ **Security**
- JWT authentication for REST APIs
- Socket.io authentication middleware
- RLS policies on database
- Tenant isolation by college_id

## Next Steps for Frontend

1. **Create Conversation List Component**
   - Display conversations sorted by recent
   - Show unread badges
   - Show last message preview

2. **Create Chat Component**
   - Display messages with timestamps
   - Send message input
   - Typing indicators
   - Online status

3. **Create "New Chat" Modal**
   - List of counsellors
   - Search/filter capability
   - Click to start conversation

4. **Add Notifications**
   - Desktop notifications for new messages
   - Sound alerts (optional)
   - Badge on navbar

## Testing

Test the REST APIs using tools like Postman or curl:

```bash
# Get conversations
curl -X GET http://localhost:5000/api/student/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "college-id: YOUR_COLLEGE_ID"

# Create conversation
curl -X POST http://localhost:5000/api/student/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "college-id: YOUR_COLLEGE_ID" \
  -H "Content-Type: application/json" \
  -d '{"counsellor_id": "COUNSELLOR_UUID"}'
```

Test Socket.io using browser console or a Socket.io client.

## Support

For complete documentation, see: `docs/MESSAGING_SYSTEM_COMPLETE.md`

For database schema details, see: `src/database/messaging_schema.sql`
