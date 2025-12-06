# Realtime Voice Assistant API Documentation

## Overview
The Realtime Voice API enables students to have natural voice conversations with an AI companion using OpenAI's Realtime WebRTC API. The backend acts as a secure proxy to generate ephemeral session tokens, preventing API key exposure in the frontend.

---

## Authentication
All endpoints require:
- **Authentication**: Valid JWT token (cookie-based)
- **Role**: Student
- **Tenant**: College isolation applied automatically

---

## Endpoint

### Create Realtime Voice Session

**POST** `/api/student/realtime-session`

Creates an ephemeral session token for establishing a WebRTC connection with OpenAI's Realtime Voice API.

#### Request

**Headers:**
```
Cookie: sb-access-token=<jwt_token>; sb-refresh-token=<refresh_token>
Content-Type: application/json
```

**Body:** None required

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Voice session created successfully",
  "timestamp": "2025-12-06T10:30:00.000Z",
  "data": {
    "client_secret": "eph_abc123xyz...",
    "expires_at": "2025-12-06T10:31:00.000Z"
  }
}
```

**Error Responses:**

**503 Service Unavailable** - API key not configured:
```json
{
  "success": false,
  "message": "Voice assistant feature is not configured. Please contact administrator.",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

**502 Bad Gateway** - OpenAI API error:
```json
{
  "success": false,
  "message": "Failed to create voice session. Please try again later.",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

**500 Internal Server Error** - Invalid response:
```json
{
  "success": false,
  "message": "Invalid session response. Please try again.",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

**401 Unauthorized** - No authentication:
```json
{
  "success": false,
  "message": "Authentication required",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

---

## Security Features

### 1. API Key Protection
- **Permanent API key** stored securely in backend `.env` file
- **Never exposed** to frontend code or network requests
- Backend acts as secure proxy

### 2. Ephemeral Tokens
- Session tokens expire after ~60 seconds
- Single-use tokens for one WebRTC session
- Cannot be reused or shared

### 3. Authentication Required
- Only authenticated students can create sessions
- College tenant isolation applied
- Rate limiting prevents abuse

### 4. Error Handling
- Detailed server-side logging
- Generic error messages to clients (no sensitive info)
- Network error handling

---

## Environment Variables

Add to your `.env` file:

```env
# OpenAI Configuration (for Realtime Voice Assistant)
OPENAI_API_KEY=sk-proj-your-actual-openai-api-key
```

**To get an API key:**
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env` file
4. **Never commit** `.env` to version control

---

## Rate Limiting

Currently using the global auth rate limiter. Consider adding a specific limiter for voice sessions:

```javascript
const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 sessions per 15 minutes per user
  message: {
    error: "Too many voice sessions. Please try again later."
  }
});

router.post('/realtime-session', voiceLimiter, createRealtimeSession);
```

---

## Frontend Integration

### Step 1: Request Session Token

```javascript
const response = await fetch('http://localhost:5000/api/student/realtime-session', {
  method: 'POST',
  credentials: 'include', // Required for cookie auth
  headers: {
    'Content-Type': 'application/json'
  }
});

const { data } = await response.json();
const { client_secret } = data;
```

### Step 2: Use Token for WebRTC

```javascript
const pc = new RTCPeerConnection();

// Add microphone track
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
pc.addTrack(stream.getTracks()[0]);

// Create offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// Send to OpenAI with ephemeral token
const sdpResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${client_secret}`,
    'Content-Type': 'application/sdp'
  },
  body: offer.sdp
});

const answerSdp = await sdpResponse.text();
await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
```

---

## Testing

### Using curl

```bash
# Login first to get cookies
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.student@greenvalley.edu","password":"Test@12345"}' \
  --cookie-jar cookies.txt

# Create voice session
curl -X POST http://localhost:5000/api/student/realtime-session \
  -H "Content-Type: application/json" \
  --cookie cookies.txt
```

### Using Postman

1. **Login** via `/api/auth/login`
2. Cookies are stored automatically
3. **POST** to `/api/student/realtime-session`
4. Copy `client_secret` from response
5. Use in frontend WebRTC connection

---

## Error Scenarios

### 1. Missing API Key
```bash
# .env file missing OPENAI_API_KEY
Response: 503 Service Unavailable
```

### 2. Invalid API Key
```bash
# OpenAI rejects the key
Response: 502 Bad Gateway
Server logs: "OpenAI Realtime API error: 401"
```

### 3. Network Issues
```bash
# Cannot reach OpenAI servers
Response: 503 Service Unavailable
Message: "Unable to reach voice service. Please check your connection."
```

### 4. Unauthenticated Request
```bash
# No cookies sent
Response: 401 Unauthorized
```

---

## Logging

Server logs include:
```
✅ Realtime voice session created for user: <user_id>
❌ OpenAI API key not configured in environment variables
❌ OpenAI Realtime API error: { status: 401, error: {...} }
❌ Create realtime session error: <error_details>
```

---

## Implementation Files

### Backend Files Modified:
1. **`src/controllers/student.controller.js`** - Added `createRealtimeSession` function
2. **`src/routes/student.routes.js`** - Added POST `/realtime-session` route
3. **`.env.example`** - Added `OPENAI_API_KEY` variable

### Lines of Code:
- **Controller**: ~100 lines (with comments & error handling)
- **Route**: ~2 lines
- **Env**: ~1 line

---

## API Flow Diagram

```
┌─────────────┐
│   Student   │
│  Frontend   │
└──────┬──────┘
       │ 1. POST /api/student/realtime-session
       │    (with cookie auth)
       ↓
┌──────────────┐
│   Backend    │
│   Express    │
└──────┬───────┘
       │ 2. Verify JWT token
       │ 3. Check API key exists
       │ 4. POST to OpenAI API
       ↓
┌──────────────┐
│   OpenAI     │
│   Servers    │
└──────┬───────┘
       │ 5. Returns ephemeral token
       ↓
┌──────────────┐
│   Backend    │
│   Express    │
└──────┬───────┘
       │ 6. Forwards token to frontend
       ↓
┌─────────────┐
│   Student   │
│  Frontend   │
└──────┬──────┘
       │ 7. Establishes WebRTC with token
       ↓
┌──────────────┐
│   OpenAI     │
│   Realtime   │
│   Voice API  │
└──────────────┘
```

---

## Best Practices

### 1. Security
- ✅ Never expose `OPENAI_API_KEY` in frontend
- ✅ Use ephemeral tokens for WebRTC
- ✅ Validate all responses from OpenAI
- ✅ Log security events

### 2. Error Handling
- ✅ Return generic errors to clients
- ✅ Log detailed errors server-side
- ✅ Handle network failures gracefully
- ✅ Validate API key configuration on startup

### 3. Performance
- ✅ Sessions expire automatically (no cleanup needed)
- ✅ Stateless endpoint (no session storage)
- ✅ Fast response time (~200-500ms)
- ✅ Consider rate limiting for production

### 4. Monitoring
- ✅ Log session creation events
- ✅ Track API errors
- ✅ Monitor OpenAI API usage
- ✅ Alert on high error rates

---

## Production Considerations

### 1. API Key Rotation
```javascript
// Support multiple keys for zero-downtime rotation
const OPENAI_KEYS = [
  process.env.OPENAI_API_KEY_PRIMARY,
  process.env.OPENAI_API_KEY_BACKUP
];
```

### 2. Usage Tracking
```javascript
// Track sessions per user for billing/limits
await supabase.from('voice_sessions').insert({
  user_id: req.user.user_id,
  created_at: new Date(),
  college_id: req.tenant
});
```

### 3. Cost Control
```javascript
// Implement daily limits per user
const sessionsToday = await getSessionCount(userId, today);
if (sessionsToday >= 10) {
  return errorResponse(res, 'Daily voice session limit reached', 429);
}
```

---

## Troubleshooting

### Issue: "Voice assistant feature is not configured"
**Solution**: Add `OPENAI_API_KEY` to `.env` file

### Issue: "Failed to create voice session" (502)
**Solutions**:
- Check API key is valid
- Verify OpenAI account has credits
- Check API key permissions

### Issue: Frontend can't connect
**Solutions**:
- Verify cookies are being sent (`credentials: 'include'`)
- Check CORS settings in backend
- Verify user is authenticated

### Issue: High latency
**Solutions**:
- Check server location (closer to OpenAI servers = faster)
- Monitor network bandwidth
- Check for rate limiting

---

## Version History

**v1.0.0** - December 6, 2025
- Initial implementation
- Basic session creation
- Error handling
- Security features

---

## Support

For issues or questions:
1. Check server logs for detailed errors
2. Verify environment variables are set
3. Test with curl/Postman first
4. Check OpenAI API status: https://status.openai.com

---

## Related Documentation

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/api-reference/realtime)
- [WebRTC API Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [SIH Authentication Guide](./AUTH_API_DOCUMENTATION.md)
- [Frontend Integration Guide](../FRONTEND_INTEGRATION_GUIDE.md)

---

**Last Updated**: December 6, 2025  
**Backend Version**: 1.0.0  
**API Base URL**: `http://localhost:5000/api`
