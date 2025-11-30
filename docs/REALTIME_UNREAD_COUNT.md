# Real-Time Unread Count System

## Overview
The messaging system now includes real-time unread count updates via Socket.io. The unread badge updates instantly without polling when:
- A new message is received
- Messages are marked as read (when joining a conversation or explicitly)
- User opens a conversation

---

## Backend Implementation

### Socket.io Events

#### **1. Automatic Updates (Server → Client)**

##### `unread_count_updated`
Sent to user when their unread count changes.

**Payload:**
```json
{
  "count": 5
}
```

**When it's emitted:**
- After receiving a new message (count increments)
- After marking messages as read (count decrements)
- After joining a conversation with unread messages (count decrements)

**Example:**
```javascript
// User receives new message
io.to(`user:${receiver_id}`).emit('unread_count_updated', {
  count: 5
});
```

---

#### **2. On-Demand Request (Client → Server)**

##### `get_unread_count`
Client requests current unread count.

**Emit from client:**
```javascript
socket.emit('get_unread_count');
```

**Server response:**
```javascript
socket.on('unread_count_updated', (data) => {
  console.log('Unread count:', data.count);
});
```

---

## Frontend Integration

### Setup Socket.io Connection

```javascript
import { io } from 'socket.io-client';

// Connect after login
const socket = io('http://localhost:5000', {
  auth: {
    token: supabaseAccessToken // Pass Supabase JWT token
  }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected to messaging server');
  
  // Request initial unread count
  socket.emit('get_unread_count');
});
```

---

### Listen for Real-Time Updates

```javascript
// React example
import { useState, useEffect } from 'react';

function MessagingApp() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Listen for unread count updates
    socket.on('unread_count_updated', (data) => {
      setUnreadCount(data.count);
    });

    // Request initial count on mount
    socket.emit('get_unread_count');

    // Cleanup
    return () => {
      socket.off('unread_count_updated');
    };
  }, []);

  return (
    <div>
      <h1>Messages</h1>
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </div>
  );
}
```

---

### Handle New Message Notifications

```javascript
useEffect(() => {
  // Listen for new message notifications
  socket.on('new_message_notification', (data) => {
    console.log('New message from:', data.sender.name);
    console.log('Message:', data.message.message_text);
    
    // Unread count is automatically updated via 'unread_count_updated' event
    // Show toast notification
    toast.info(`New message from ${data.sender.name}`);
  });

  return () => {
    socket.off('new_message_notification');
  };
}, []);
```

---

### Update Count When Opening Conversation

```javascript
function openConversation(conversationId) {
  // Join conversation
  socket.emit('join_conversation', { conversation_id: conversationId });
  
  // Listen for join confirmation
  socket.on('joined_conversation', (data) => {
    console.log('Joined conversation:', data.conversation_id);
    // Unread count automatically updated if messages were marked as read
  });
}
```

---

## Complete Flow Examples

### Flow 1: Receiving a New Message

1. **Counsellor sends message:**
   ```javascript
   socket.emit('send_message', {
     conversation_id: 'abc-123',
     receiver_id: 'student-uuid',
     message_text: 'Hello!'
   });
   ```

2. **Student receives two events:**
   ```javascript
   // Event 1: New message notification
   socket.on('new_message_notification', (data) => {
     // Show notification: "New message from Dr. Smith"
     showNotification(data.sender.name, data.message.message_text);
   });
   
   // Event 2: Unread count update
   socket.on('unread_count_updated', (data) => {
     // Update badge: 3 → 4
     setUnreadCount(data.count); // 4
   });
   ```

---

### Flow 2: Opening a Conversation with Unread Messages

1. **Student clicks on conversation:**
   ```javascript
   socket.emit('join_conversation', {
     conversation_id: 'abc-123'
   });
   ```

2. **Backend marks messages as read and emits:**
   ```javascript
   socket.on('joined_conversation', (data) => {
     console.log('Joined:', data.conversation_id);
   });
   
   socket.on('unread_count_updated', (data) => {
     // Badge updates: 4 → 0
     setUnreadCount(data.count); // 0
   });
   ```

3. **Counsellor sees read receipt:**
   ```javascript
   socket.on('messages_read', (data) => {
     console.log('Student read your messages');
     // Show blue ticks or "Read" status
   });
   ```

---

### Flow 3: Manual Mark as Read

If you want to mark messages as read without joining the conversation:

```javascript
// Client emits
socket.emit('mark_as_read', {
  conversation_id: 'abc-123'
});

// Client receives
socket.on('unread_count_updated', (data) => {
  setUnreadCount(data.count); // Updated count
});
```

---

## REST API Fallback

If Socket.io is not connected (offline mode), use REST API:

```javascript
async function getUnreadCount() {
  const response = await fetch('/api/student/messages/unread-count', {
    credentials: 'include'
  });
  const data = await response.json();
  return data.data.count;
}
```

**Use case:** Initial page load before Socket.io connection is established.

---

## Event Summary Table

| Event Name | Direction | Purpose | Payload |
|------------|-----------|---------|---------|
| `get_unread_count` | Client → Server | Request current unread count | None |
| `unread_count_updated` | Server → Client | Notify unread count change | `{ count: 5 }` |
| `new_message_notification` | Server → Client | Notify new message received | `{ conversation_id, message, sender }` |
| `join_conversation` | Client → Server | Join conversation (auto marks as read) | `{ conversation_id }` |
| `mark_as_read` | Client → Server | Manually mark messages as read | `{ conversation_id }` |
| `messages_read` | Server → Client | Notify sender messages were read | `{ conversation_id, reader_id }` |

---

## Performance Considerations

### Efficient Count Updates
- Only emits to affected users (via personal room: `user:${userId}`)
- Database query uses indexed fields (`receiver_id`, `is_read`)
- Count query uses `{ count: 'exact', head: true }` (no data fetched)

### Avoiding Race Conditions
- Unread count is always fetched from database (source of truth)
- No client-side increment/decrement (prevents sync issues)

---

## Testing

### Test Real-Time Updates

```javascript
// Terminal 1: Student
socket.emit('get_unread_count');
socket.on('unread_count_updated', console.log); // { count: 0 }

// Terminal 2: Counsellor sends message
socket.emit('send_message', {
  conversation_id: 'abc-123',
  receiver_id: 'student-uuid',
  message_text: 'Test'
});

// Terminal 1: Student receives
// new_message_notification: { ... }
// unread_count_updated: { count: 1 }
```

---

## Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
  
  // Fallback to REST API
  if (error.message.includes('unread count')) {
    fetchUnreadCountViaREST();
  }
});
```

---

## Migration from Polling

**Before (polling every 30 seconds):**
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const count = await fetchUnreadCount();
    setUnreadCount(count);
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

**After (real-time):**
```javascript
useEffect(() => {
  socket.on('unread_count_updated', (data) => {
    setUnreadCount(data.count);
  });
  
  socket.emit('get_unread_count'); // Initial fetch
  
  return () => socket.off('unread_count_updated');
}, []);
```

**Benefits:**
- Instant updates (no 30-second delay)
- Reduced server load (no polling)
- Lower bandwidth usage

---

## Security

- Socket.io connections require JWT authentication
- Unread counts are scoped to the authenticated user
- No user can request another user's unread count
- All count updates verified against database

---

## Troubleshooting

### Badge not updating?
1. Check Socket.io connection: `socket.connected`
2. Verify event listeners are registered
3. Check browser console for errors
4. Fallback to REST API

### Count mismatch?
1. Request fresh count: `socket.emit('get_unread_count')`
2. Check if multiple devices are connected (expected)
3. Verify database state directly

---

## Next Steps

Optional enhancements:
- Add per-conversation unread counts
- Group notifications by sender
- Add sound/vibration on new message
- Implement "Mark all as read" feature
- Add browser/mobile push notifications
