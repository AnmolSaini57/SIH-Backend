# Realtime Voice Assistant - Backend Setup Guide

## 🎯 Quick Start

### Prerequisites
- ✅ Node.js backend already running
- ✅ Supabase configured
- ✅ Student authentication working
- ⚠️ OpenAI API key required (new)

---

## 📋 Step-by-Step Setup

### Step 1: Get OpenAI API Key

1. **Visit OpenAI Platform**
   - Go to https://platform.openai.com/api-keys
   - Login or create an account

2. **Create New API Key**
   - Click "Create new secret key"
   - Name it: "SIH Voice Assistant"
   - Copy the key (starts with `sk-proj-...`)
   - ⚠️ **Save it immediately** - you can't view it again!

3. **Check API Access**
   - Ensure your account has:
     - ✅ Realtime API access (may need to request access)
     - ✅ Sufficient credits/billing configured

---

### Step 2: Add API Key to Environment

1. **Open `.env` file** in `SIH-Backend` folder:
   ```bash
   cd SIH-Backend
   nano .env
   # or use your preferred editor
   ```

2. **Add OpenAI API Key**:
   ```env
   # Existing variables...
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   GEMINI_API_KEY=your_gemini_key
   
   # Add this line (NEW):
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```

3. **Save and close** the file

4. **Verify** `.env` is in `.gitignore`:
   ```bash
   cat .gitignore | grep .env
   # Should show: .env
   ```

---

### Step 3: Restart Backend Server

```bash
# Stop current server (Ctrl+C)

# Restart with new environment variable
npm run dev
```

**Expected output:**
```
SIH Backend running on port 5000
Socket.io server ready for connections
```

---

### Step 4: Test Backend Endpoint

#### Option A: Using curl

```bash
# 1. Login to get cookies
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.student@greenvalley.edu","password":"Test@12345"}' \
  --cookie-jar cookies.txt

# 2. Test voice session endpoint
curl -X POST http://localhost:5000/api/student/realtime-session \
  -H "Content-Type: application/json" \
  --cookie cookies.txt
```

**Expected response:**
```json
{
  "success": true,
  "message": "Voice session created successfully",
  "data": {
    "client_secret": "eph_abc123...",
    "expires_at": "2025-12-06T10:31:00.000Z"
  }
}
```

#### Option B: Using Postman

1. **Import Collection**
   - File → Import
   - Select: `postman/Realtime_Voice_API.postman_collection.json`

2. **Login First**
   - Use existing Auth collection
   - POST to `/api/auth/login`
   - Cookies saved automatically

3. **Test Voice Session**
   - POST to `/api/student/realtime-session`
   - Should return `client_secret`

---

### Step 5: Verify Implementation

**Check files were updated:**

1. **Controller** - `src/controllers/student.controller.js`
   ```bash
   grep -n "createRealtimeSession" src/controllers/student.controller.js
   # Should show: export const createRealtimeSession = async (req, res) => {
   ```

2. **Route** - `src/routes/student.routes.js`
   ```bash
   grep -n "realtime-session" src/routes/student.routes.js
   # Should show: router.post('/realtime-session', createRealtimeSession);
   ```

3. **Environment** - `.env`
   ```bash
   grep "OPENAI_API_KEY" .env
   # Should show: OPENAI_API_KEY=sk-proj-...
   ```

---

## 🧪 Testing

### Test Case 1: Successful Session Creation

**Request:**
```bash
POST /api/student/realtime-session
Cookie: sb-access-token=<valid_token>
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Voice session created successfully",
  "data": {
    "client_secret": "eph_...",
    "expires_at": "..."
  }
}
```

✅ **Pass Criteria**: Returns 200 status with `client_secret`

---

### Test Case 2: Missing API Key

**Setup:**
```bash
# Remove OPENAI_API_KEY from .env temporarily
# Restart server
```

**Request:**
```bash
POST /api/student/realtime-session
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Voice assistant feature is not configured. Please contact administrator."
}
```

✅ **Pass Criteria**: Returns 503 status with helpful message

---

### Test Case 3: Invalid Authentication

**Request:**
```bash
POST /api/student/realtime-session
# No cookies
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

✅ **Pass Criteria**: Returns 401 status

---

### Test Case 4: Invalid API Key

**Setup:**
```bash
# Set OPENAI_API_KEY=sk-proj-invalid-key in .env
# Restart server
```

**Request:**
```bash
POST /api/student/realtime-session
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Failed to create voice session. Please try again later."
}
```

✅ **Pass Criteria**: Returns 502 status

---

## 🔍 Troubleshooting

### Issue: "Voice assistant feature is not configured"

**Cause**: `OPENAI_API_KEY` not in `.env` file

**Fix:**
```bash
# Add to .env
echo "OPENAI_API_KEY=sk-proj-your-key" >> .env

# Restart server
npm run dev
```

---

### Issue: "Failed to create voice session" (502)

**Possible Causes:**
1. Invalid API key
2. OpenAI account has no credits
3. Realtime API access not enabled

**Fix:**
```bash
# 1. Verify API key is correct
grep OPENAI_API_KEY .env

# 2. Check OpenAI account:
#    - Visit https://platform.openai.com/account/billing
#    - Ensure credits are available
#    - Check usage limits

# 3. Request Realtime API access:
#    - Visit https://platform.openai.com/docs/guides/realtime
#    - Follow access request process
```

---

### Issue: Server logs show "ENOTFOUND" error

**Cause**: Cannot reach OpenAI servers (network issue)

**Fix:**
```bash
# Test network connectivity
curl https://api.openai.com/v1/models

# Check firewall/proxy settings
# Verify server has internet access
```

---

### Issue: Frontend can't connect

**Cause**: CORS or authentication issue

**Fix:**
```bash
# 1. Check CORS settings in .env
grep CORS_ORIGIN .env
# Should include: http://localhost:5173

# 2. Verify frontend is sending cookies
# In browser DevTools → Network → Request Headers
# Should show: Cookie: sb-access-token=...

# 3. Check frontend code uses credentials: 'include'
```

---

## 📊 Monitoring

### Check Server Logs

**Successful session creation:**
```
Realtime voice session created for user: <user_id>
```

**API key missing:**
```
OpenAI API key not configured in environment variables
```

**OpenAI API error:**
```
OpenAI Realtime API error: { status: 401, error: {...} }
```

### Monitor in Production

Consider adding:
```javascript
// Track usage
console.log('Voice sessions today:', count);

// Alert on errors
if (errorRate > 0.1) {
  sendAlert('High voice session error rate');
}
```

---

## 🔐 Security Checklist

- [x] OpenAI API key in `.env` (not hardcoded)
- [x] `.env` file in `.gitignore`
- [x] Never commit API key to Git
- [x] Authentication required for endpoint
- [x] College tenant isolation applied
- [x] Error messages don't leak sensitive info
- [x] Detailed logging server-side only

---

## 💰 Cost Estimation

**OpenAI Realtime API Pricing** (as of Dec 2025):
- Audio input: $0.06 per minute
- Audio output: $0.24 per minute
- Text tokens: Additional cost

**Example calculation:**
- 5-minute conversation
- Input: $0.06 × 5 = $0.30
- Output: $0.24 × 5 = $1.20
- **Total: ~$1.50 per conversation**

**Budget for 100 students:**
- 10 conversations/month each
- 100 × 10 × $1.50 = **$1,500/month**

**Cost control:**
- Set daily limits per user
- Monitor usage dashboard
- Set billing alerts

---

## 🚀 Deployment Checklist

### Development ✅
- [x] API key in `.env`
- [x] Endpoint tested locally
- [x] Error handling verified
- [x] Logs reviewed

### Staging
- [ ] Update `.env` on staging server
- [ ] Test with staging frontend
- [ ] Load test with multiple users
- [ ] Monitor error rates

### Production
- [ ] Use production OpenAI key
- [ ] Set usage limits
- [ ] Configure monitoring/alerts
- [ ] Set up billing alerts
- [ ] Document API key rotation process

---

## 📚 Next Steps

1. **Test Backend**: Verify endpoint works with Postman
2. **Frontend Integration**: Add `RealtimeVoice` component
3. **End-to-End Test**: Test complete voice conversation flow
4. **User Testing**: Get student feedback
5. **Monitor Usage**: Track costs and performance

---

## 📞 Support

**If you encounter issues:**

1. **Check server logs**: Look for detailed error messages
2. **Verify environment**: Ensure all variables are set
3. **Test with curl**: Isolate backend vs frontend issues
4. **Check OpenAI status**: https://status.openai.com

**Common issues and solutions:**
- See TROUBLESHOOTING section above
- Review API documentation: `docs/REALTIME_VOICE_API_DOCUMENTATION.md`
- Check Postman collection for working examples

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `.env` has `OPENAI_API_KEY`
- [ ] Server starts without errors
- [ ] Can login as student
- [ ] POST to `/realtime-session` returns `client_secret`
- [ ] Server logs show "session created" message
- [ ] No API key appears in browser DevTools
- [ ] Error cases handled gracefully

---

**Setup Complete! 🎉**

Your backend is now ready for Realtime Voice Assistant integration.

Next: Implement the frontend `RealtimeVoice` component.

---

**Last Updated**: December 6, 2025  
**Version**: 1.0.0
