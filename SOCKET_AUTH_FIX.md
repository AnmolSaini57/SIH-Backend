# Socket.IO Authentication Fix - Final Solution

## Problem Diagnosis

**Issue:** Socket.IO was returning "Invalid namespace" error because it couldn't authenticate the user.

**Root Cause:** HTTP-only cookies aren't automatically sent with WebSocket handshakes in the same way as regular HTTP requests, even with `withCredentials: true`.

---

## Solution Implemented

### 1. Added `/api/auth/token` Endpoint (Backend)

**Purpose:** Allow authenticated frontend to retrieve the access token for Socket.IO connection.

**Location:** `src/controllers/auth.controller.js` + `src/routes/auth.routes.js`

**How it works:**
```javascript
// Controller
export const getToken = async (req, res) => {
  const token = req.cookies['sb-access-token'];
  if (!token) {
    return errorResponse(res, 'No authentication token found', 401);
  }
  return successResponse(res, { token }, 'Access token retrieved successfully');
};

// Route
router.get('/token', auth, getToken);
```

- Requires authentication (user must be logged in)
- Reads `sb-access-token` from HTTP-only cookie
- Returns token in response body

---

### 2. Updated Frontend Socket Service

**Location:** `src/services/socketService.js`

**Changes:**
1. Made `getAccessToken()` async - fetches token from `/api/auth/token`
2. Made `connectSocket()` async - waits for token before connecting
3. Socket now connects with explicit token in auth object

**Flow:**
```javascript
const getAccessToken = async () => {
  const response = await fetch(`${BACKEND_URL}/api/auth/token`, {
    credentials: 'include'  // Send cookies
  });
  return data.data?.token;
};

export const connectSocket = async (user) => {
  const token = await getAccessToken();  // Get token first
  const authData = {
    userId: user?.id,
    userRole: user?.role,
    collegeId: user?.college_id,
    token: token  // Pass explicitly
  };
  socket = io(BACKEND_URL, { auth: authData, withCredentials: true });
};
```

---

### 3. Updated DirectMessages Component

**Location:** `src/components/community/DirectMessages.jsx`

**Change:** Made socket initialization async to wait for token fetch:

```javascript
useEffect(() => {
  if (user) {
    const initSocket = async () => {
      await connectSocket(user);  // Wait for token
      // Setup event listeners
    };
    initSocket();
  }
}, [user]);
```

---

### 4. Enhanced Socket.IO Auth Middleware

**Location:** `src/config/socket.js`

**Improvements:**
- Added detailed logging for debugging
- Checks multiple cookie name patterns
- Logs received cookies if authentication fails

```javascript
io.use(async (socket, next) => {
  let token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    const cookies = socket.handshake.headers.cookie;
    console.log('[Socket Auth] Received cookies:', cookies);
    // Parse cookies...
  }
  
  if (!token) {
    console.log('[Socket Auth] Available cookies:', socket.handshake.headers.cookie);
    return next(new Error('Authentication error: No token provided'));
  }
  
  // Verify with Supabase...
  console.log(`Socket authenticated: ${profile.name} (${profile.role})`);
});
```

---

## How It Works Now

### Authentication Flow:

1. **User logs in** → Backend sets `sb-access-token` HTTP-only cookie
2. **User opens Messages** → DirectMessages component mounts
3. **Socket initialization:**
   - Frontend calls `GET /api/auth/token` with credentials
   - Backend reads token from HTTP-only cookie
   - Backend returns token in response body
   - Frontend receives token and stores it
4. **Socket connection:**
   - Frontend connects to Socket.IO with token in `auth` object
   - Backend Socket.IO middleware reads token from `socket.handshake.auth.token`
   - Backend verifies token with Supabase
   - Backend attaches user profile to socket
   - Connection successful! ✅

---

## Testing Steps

1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Login** as student: `john.student@greenvalley.edu`
3. **Navigate to Messages**
4. **Check console logs:**
   ```
   ✅ [Socket] Got access token from backend
   ✅ [Socket] Connecting with explicit token
   ✅ Socket.IO connected: <socket-id>
   ```

5. **Backend logs should show:**
   ```
   ✅ Socket authenticated: John Student (student)
   ✅ User connected: John Student (<user-id>)
   ```

6. **Try creating a conversation:**
   - Click "New" button
   - Select counsellor
   - Should open without errors!

---

## Expected Console Output

### Frontend (Success):
```
DirectMessages - User: {id: "...", name: "John Student", ...}
[Socket] Got access token from backend
[Socket] Connecting with explicit token
Connecting socket with auth: {userId: "...", userRole: "student", collegeId: "...", token: "[PRESENT]"}
Socket.IO connected: abc123xyz
```

### Backend (Success):
```
[Socket Auth] Found token in cookie: sb-access-token
Socket authenticated: John Student (student)
User connected: John Student (7c936907-5289-4392-8a40-93f85c1c630a)
```

---

## If Still Getting Errors

### Error: "Failed to get token from backend"
**Cause:** Not logged in or cookies expired
**Solution:** Login again

### Error: "Authentication error: No token provided"
**Cause:** Token fetch failed or token not in cookie
**Solution:** Check backend logs, verify cookies are set after login

### Error: "Authentication error: Invalid token"
**Cause:** Token expired or invalid
**Solution:** Logout and login again

---

## Key Files Modified

**Backend:**
- `src/controllers/auth.controller.js` - Added `getToken` function
- `src/routes/auth.routes.js` - Added `GET /api/auth/token` route
- `src/config/socket.js` - Enhanced authentication logging

**Frontend:**
- `src/services/socketService.js` - Made async, fetch token from backend
- `src/components/community/DirectMessages.jsx` - Async socket initialization

---

## Why This Works

**Problem with HTTP-only cookies + WebSockets:**
- HTTP-only cookies protect tokens from XSS attacks
- But JavaScript (including Socket.IO client) can't read them
- WebSocket handshake doesn't always include cookies like HTTP requests do

**Our Solution:**
- Keep tokens in HTTP-only cookies for security
- Add `/api/auth/token` endpoint (protected, requires auth)
- Frontend makes HTTP request (cookies sent automatically)
- Backend reads token from cookie, returns it
- Frontend gets token, passes to Socket.IO explicitly
- Socket.IO middleware receives token in `auth` object
- Best of both worlds: Security + Compatibility! 🎉

---

## Security Notes

- `/api/auth/token` is protected by auth middleware
- Can only be called by logged-in users
- Token is only transmitted once during socket connection
- Still stored securely in HTTP-only cookies
- Socket.IO connection uses the token for authentication
- If token expires, user must re-authenticate
