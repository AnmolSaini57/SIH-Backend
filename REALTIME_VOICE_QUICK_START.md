# 🎤 Realtime Voice - Quick Reference Card

## 📍 Backend Endpoint

```
POST /api/student/realtime-session
```

**Authentication**: Required (Student role)  
**Response**: `{ client_secret: "eph_..." }`

---

## 🚀 Quick Setup (30 seconds)

```bash
# 1. Add API key
echo "OPENAI_API_KEY=sk-proj-your-key" >> .env

# 2. Restart server
npm run dev

# 3. Test
curl -X POST http://localhost:5000/api/student/realtime-session \
  --cookie cookies.txt
```

---

## 📂 Files Modified

✅ `src/controllers/student.controller.js` - Added `createRealtimeSession()`  
✅ `src/routes/student.routes.js` - Added POST route  
✅ `.env.example` - Added `OPENAI_API_KEY`  
✅ `docs/README.md` - Updated index  

---

## 📚 Documentation

📖 **API Docs**: `docs/REALTIME_VOICE_API_DOCUMENTATION.md`  
🔧 **Setup Guide**: `docs/REALTIME_VOICE_SETUP.md`  
📊 **Summary**: `REALTIME_VOICE_IMPLEMENTATION_SUMMARY.md`  
🧪 **Postman**: `postman/Realtime_Voice_API.postman_collection.json`

---

## 🔑 Get OpenAI API Key

1. Visit: https://platform.openai.com/api-keys
2. Create new key
3. Copy to `.env`: `OPENAI_API_KEY=sk-proj-...`

---

## 🧪 Test Commands

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.student@greenvalley.edu","password":"Test@12345"}' \
  --cookie-jar cookies.txt

# Get Voice Token
curl -X POST http://localhost:5000/api/student/realtime-session \
  --cookie cookies.txt

# Expected Response
{
  "success": true,
  "data": {
    "client_secret": "eph_...",
    "expires_at": "..."
  }
}
```

---

## ⚠️ Common Issues

| Error | Fix |
|-------|-----|
| 503 Service Unavailable | Add `OPENAI_API_KEY` to `.env` |
| 502 Bad Gateway | Check API key is valid |
| 401 Unauthorized | Login first (get cookies) |

---

## 💰 Cost Estimate

**Per 5-min conversation**: ~$1.50  
**100 students, 10 convos/month**: ~$1,500/month

---

## ✅ Verification

- [ ] `.env` has `OPENAI_API_KEY`
- [ ] Server restarts without errors
- [ ] Can login as student
- [ ] `/realtime-session` returns `client_secret`
- [ ] Server logs show "session created"

---

## 🎯 Next Steps

1. ✅ Backend complete
2. ⏳ Create `RealtimeVoice.jsx` component
3. ⏳ Update `StudentDashboard.jsx`
4. ⏳ Test end-to-end

---

## 📞 Need Help?

See full docs: `docs/REALTIME_VOICE_SETUP.md`

---

**Version**: 1.0.0 | **Date**: Dec 6, 2025
