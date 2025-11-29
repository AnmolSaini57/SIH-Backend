# Real-Time Messaging System Documentation

## Overview
This document provides complete documentation for the real-time messaging system between students and counsellors, including REST APIs and Socket.io events.

## Table of Contents
1. [Database Schema](#database-schema)
2. [REST API Endpoints](#rest-api-endpoints)
3. [Socket.io Events](#socketio-events)
4. [Frontend Integration Guide](#frontend-integration-guide)
5. [Security & Authentication](#security--authentication)

---

## Database Schema

### Tables

#### `conversations`
Stores conversation threads between students and counsellors.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  counsellor_id UUID NOT NULL REFERENCES profiles(id),
  college_id UUID NOT NULL REFERENCES colleges(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(student_id, counsellor_id)
);
```

#### `messages`
Stores individual messages within conversations.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## REST API Endpoints

### Student Endpoints

#### 1. Get Counsellors for Messaging
```http
GET /api/student/counsellors-for-messaging
```

**Description**: Get all counsellors from student's college to initiate chat.

**Response**:
```json
{
  "success": true,
  "message": "Counsellors retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Dr. John Doe",
      "email": "john@college.edu",
      "avatar_url": "https://...",
      "bio": "...",
      "phone": "+1234567890",
      "specialization": "Mental Health"
    }
  ]
}
```

#### 2. Create or Get Conversation
```http
POST /api/student/conversations
```

**Request Body**:
```json
{
  "counsellor_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": "conversation-uuid",
    "student_id": "uuid",
    "counsellor_id": "uuid",
    "college_id": "uuid",
    "last_message_at": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 3. Get All Conversations (Student)
```http
GET /api/student/conversations
```

**Description**: Get all conversations for the logged-in student, sorted by most recent.

**Response**:
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": [
    {
      "id": "conversation-uuid",
      "student_id": "uuid",
      "counsellor_id": "uuid",
      "college_id": "uuid",
      "last_message_at": "2024-01-15T10:30:00Z",
      "counsellor": {
        "id": "uuid",
        "name": "Dr. John Doe",
        "email": "john@college.edu",
        "avatar_url": "https://...",
        "specialization": "Mental Health"
      },
      "last_message": "Thank you for your help!",
      "last_message_time": "2024-01-15T10:30:00Z",
      "last_message_sender": "sender-uuid",
      "unread_count": 3
    }
  ]
}
```

#### 4. Get Conversation Messages
```http
GET /api/student/conversations/:id/messages?page=1&limit=50
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

**Response**:
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "conversation_id": "uuid",
        "sender_id": "uuid",
        "receiver_id": "uuid",
        "message_text": "Hello, I need some help",
        "is_read": true,
        "read_at": "2024-01-15T10:31:00Z",
        "created_at": "2024-01-15T10:30:00Z",
        "sender": {
          "id": "uuid",
          "name": "Student Name",
          "avatar_url": "https://..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

#### 5. Mark Messages as Read
```http
PUT /api/student/conversations/:id/read
```

**Description**: Mark all unread messages in a conversation as read.

**Response**:
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "marked_read": 3
  }
}
```

#### 6. Get Unread Message Count
```http
GET /api/student/messages/unread-count
```

**Response**:
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

#### 7. Delete Conversation
```http
DELETE /api/student/conversations/:id
```

**Response**:
```json
{
  "success": true,
  "message": "Conversation deleted successfully",
  "data": {
    "success": true
  }
}
```

### Counsellor Endpoints

#### 1. Get All Conversations (Counsellor)
```http
GET /api/counsellor/conversations
```

**Description**: Get all conversations for the logged-in counsellor, sorted by most recent.

**Response**:
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": [
    {
      "id": "conversation-uuid",
      "student_id": "uuid",
      "counsellor_id": "uuid",
      "college_id": "uuid",
      "last_message_at": "2024-01-15T10:30:00Z",
      "student": {
        "id": "uuid",
        "name": "Student Name",
        "email": "student@college.edu",
        "avatar_url": "https://..."
      },
      "last_message": "Thank you for your help!",
      "last_message_time": "2024-01-15T10:30:00Z",
      "last_message_sender": "sender-uuid",
      "unread_count": 2
    }
  ]
}
```

#### 2-7. Same as Student Endpoints
All other endpoints (messages, read, unread-count, delete) work the same way for counsellors.

---

## Socket.io Events

### Connection & Authentication

#### Client-Side Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events from Client to Server

#### 1. `join_conversation`
Join a conversation room to receive real-time updates.

**Emit**:
```javascript
socket.emit('join_conversation', {
  conversation_id: 'uuid'
});
```

**Response** (via `joined_conversation`):
```javascript
socket.on('joined_conversation', (data) => {
  console.log(data);
  // { conversation_id: 'uuid', message: 'Successfully joined conversation' }
});
```

#### 2. `leave_conversation`
Leave a conversation room.

**Emit**:
```javascript
socket.emit('leave_conversation', {
  conversation_id: 'uuid'
});
```

#### 3. `send_message`
Send a new message in a conversation.

**Emit**:
```javascript
socket.emit('send_message', {
  conversation_id: 'uuid',
  receiver_id: 'uuid',
  message_text: 'Hello, how are you?'
});
```

#### 4. `mark_as_read`
Mark messages as read in a conversation.

**Emit**:
```javascript
socket.emit('mark_as_read', {
  conversation_id: 'uuid'
});
```

#### 5. `typing`
Indicate that the user is typing.

**Emit**:
```javascript
socket.emit('typing', {
  conversation_id: 'uuid'
});
```

#### 6. `stop_typing`
Indicate that the user stopped typing.

**Emit**:
```javascript
socket.emit('stop_typing', {
  conversation_id: 'uuid'
});
```

#### 7. `check_online_status`
Check if a user is online.

**Emit**:
```javascript
socket.emit('check_online_status', {
  user_id: 'uuid'
});
```

### Events from Server to Client

#### 1. `new_message`
Receive a new message in the conversation.

**Listen**:
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
  // {
  //   conversation_id: 'uuid',
  //   message: {
  //     id: 'uuid',
  //     conversation_id: 'uuid',
  //     sender_id: 'uuid',
  //     receiver_id: 'uuid',
  //     message_text: 'Hello!',
  //     is_read: false,
  //     created_at: '2024-01-15T10:30:00Z',
  //     sender: { id, name, avatar_url }
  //   }
  // }
});
```

#### 2. `new_message_notification`
Receive notification for new message (even if not in conversation).

**Listen**:
```javascript
socket.on('new_message_notification', (data) => {
  console.log('New message notification:', data);
  // Show desktop notification or badge
});
```

#### 3. `messages_read`
Notification that messages were read by the receiver.

**Listen**:
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read:', data);
  // {
  //   conversation_id: 'uuid',
  //   reader_id: 'uuid',
  //   read_count: 3
  // }
});
```

#### 4. `user_typing`
Another user is typing in the conversation.

**Listen**:
```javascript
socket.on('user_typing', (data) => {
  console.log(`${data.user_name} is typing...`);
  // {
  //   conversation_id: 'uuid',
  //   user_id: 'uuid',
  //   user_name: 'John Doe'
  // }
});
```

#### 5. `user_stopped_typing`
User stopped typing.

**Listen**:
```javascript
socket.on('user_stopped_typing', (data) => {
  // Hide typing indicator
});
```

#### 6. `user_online_status`
Get online status of a user.

**Listen**:
```javascript
socket.on('user_online_status', (data) => {
  console.log(`User ${data.user_id} is ${data.online ? 'online' : 'offline'}`);
});
```

#### 7. `user_offline`
Notification when a user goes offline.

**Listen**:
```javascript
socket.on('user_offline', (data) => {
  console.log(`User ${data.user_id} went offline`);
});
```

#### 8. `error`
Error from server.

**Listen**:
```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

---

## Frontend Integration Guide

### Complete React Example

```javascript
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

function MessagingComponent({ conversationId, currentUserId, receiverId, authToken }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:5000', {
      auth: { token: authToken }
    });

    // Join conversation
    socketRef.current.emit('join_conversation', { conversation_id: conversationId });

    // Listen for new messages
    socketRef.current.on('new_message', (data) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => [...prev, data.message]);
        
        // Mark as read if not sender
        if (data.message.sender_id !== currentUserId) {
          socketRef.current.emit('mark_as_read', { conversation_id: conversationId });
        }
      }
    });

    // Listen for typing indicators
    socketRef.current.on('user_typing', (data) => {
      if (data.conversation_id === conversationId && data.user_id !== currentUserId) {
        setTyping(true);
      }
    });

    socketRef.current.on('user_stopped_typing', (data) => {
      if (data.conversation_id === conversationId) {
        setTyping(false);
      }
    });

    // Listen for online status
    socketRef.current.on('user_online_status', (data) => {
      setIsOnline(data.online);
    });

    // Cleanup
    return () => {
      socketRef.current.emit('leave_conversation', { conversation_id: conversationId });
      socketRef.current.disconnect();
    };
  }, [conversationId, authToken, currentUserId]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    socketRef.current.emit('send_message', {
      conversation_id: conversationId,
      receiver_id: receiverId,
      message_text: newMessage
    });

    setNewMessage('');
  };

  const handleTyping = () => {
    socketRef.current.emit('typing', { conversation_id: conversationId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('stop_typing', { conversation_id: conversationId });
    }, 3000);
  };

  return (
    <div>
      <div className="header">
        {isOnline && <span className="online-indicator">● Online</span>}
      </div>
      
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.sender_id === currentUserId ? 'sent' : 'received'}>
            <p>{msg.message_text}</p>
            <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
            {msg.sender_id === currentUserId && msg.is_read && <span>✓✓</span>}
          </div>
        ))}
        {typing && <div className="typing-indicator">Typing...</div>}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}

export default MessagingComponent;
```

### Conversation List Component

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

function ConversationList({ role, authToken, collegeId }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const endpoint = role === 'student' 
        ? '/api/student/conversations'
        : '/api/counsellor/conversations';
      
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'college-id': collegeId
        }
      });

      setConversations(response.data.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  return (
    <div className="conversation-list">
      {conversations.map((conv) => {
        const otherUser = role === 'student' ? conv.counsellor : conv.student;
        
        return (
          <div key={conv.id} className="conversation-item">
            <img src={otherUser.avatar_url} alt={otherUser.name} />
            <div>
              <h4>{otherUser.name}</h4>
              <p>{conv.last_message}</p>
              <span>{new Date(conv.last_message_time).toLocaleTimeString()}</span>
            </div>
            {conv.unread_count > 0 && (
              <span className="unread-badge">{conv.unread_count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ConversationList;
```

---

## Security & Authentication

### Authentication Flow
1. Client obtains JWT token via `/api/auth/login`
2. Client connects to Socket.io with token in auth handshake
3. Server verifies token and attaches user data to socket
4. All socket events are authenticated automatically

### Tenant Isolation
- All queries filter by `college_id` (tenant)
- Users can only see conversations within their college
- Enforced at both REST API and Socket.io levels

### RLS Policies
Row Level Security policies are enabled on:
- `conversations` table: Users can only access their own conversations
- `messages` table: Users can only access messages they sent or received

### Best Practices
1. Always validate conversation access before performing operations
2. Sanitize message text on the server
3. Rate limit message sending to prevent spam
4. Store tokens securely (httpOnly cookies or secure storage)
5. Use HTTPS/WSS in production

---

## Setup Instructions

1. **Run the database schema**:
   ```bash
   psql -h your-db-host -U your-user -d your-database -f src/database/messaging_schema.sql
   ```

2. **Install dependencies** (already done):
   ```bash
   npm install socket.io
   ```

3. **Environment variables** - Add to `.env`:
   ```
   FRONTEND_URL=http://localhost:5173
   JWT_SECRET=your-secret-key
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

---

## Testing

### Using Postman for REST APIs
Test the REST endpoints with proper authentication headers.

### Testing Socket.io
Use Socket.io client or browser console:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => console.log('Connected!'));
socket.emit('join_conversation', { conversation_id: 'uuid' });
```

---

## Troubleshooting

### Common Issues

1. **Socket not connecting**
   - Check JWT token validity
   - Verify CORS settings
   - Check network/firewall

2. **Messages not appearing**
   - Ensure user joined conversation room
   - Check console for errors
   - Verify conversation_id is correct

3. **Typing indicators not working**
   - Make sure both users are in the same conversation room
   - Check event names match exactly

4. **Unread count not updating**
   - Call `mark_as_read` when viewing messages
   - Refresh conversation list after reading
