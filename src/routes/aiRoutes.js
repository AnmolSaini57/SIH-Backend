// src/routes/aiRoutes.js
import { Router } from "express";
import { aiChatController } from "../controllers/aiChatController.js";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();


router.post("/chat", aiChatController.chat);
router.get("/conversations", aiChatController.listRecentConversations);
router.post("/conversations", aiChatController.createConversation);
router.delete("/conversations/:conversationId", aiChatController.deleteConversation);
router.get("/messages", aiChatController.getConversationMessages);
router.post("/voice", upload.single("file"), aiChatController.voice);

export default router;
