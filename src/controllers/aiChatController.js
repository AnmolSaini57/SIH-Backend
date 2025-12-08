import { supabaseAdmin } from "../utils/supabaseAdmin.js";
import { openai, OPENAI_MODEL } from "../utils/openaiClient.js";
import { isCrisisMessage } from "../utils/crisisDetect.js";
import { detectMood } from "../utils/moodDetector.js";
import {
  storeMessageEmbedding,
  searchUserHistory,
  searchKnowledge,
  formatRAGContext
} from "../utils/vectorStore.js";

const MAX_HISTORY_MESSAGES = 20;
const RAG_ENABLED = true; // Feature flag to enable/disable RAG

// Helper to get userId safely (from auth OR body/query)
function getUserIdFromRequest(req) {
  const authUserId =
    req.user?.id || req.user?.user_id || req.user?.userId || null;
  const clientUserId = req.body?.userId || req.query?.userId || null;

  if (authUserId && clientUserId && authUserId !== clientUserId) {
    return { error: "User mismatch between token and body/query" };
  }

  return { userId: authUserId || clientUserId || null };
}

// Build messages array for OpenAI, with mood context and optional RAG context
function buildOpenAIMessages(history, userMessage, mood, ragContext = null) {
  const moodText = mood
    ? `The user's emotional state detected by a separate classifier is: "${mood.label}" (confidence ~${Math.round(
        mood.score * 100
      )}%). Treat this as a soft hint only; always prioritise the user's actual words.`
    : `No external mood signal is available. Rely only on the user's words.`;

  const historyMessages = history.map((m) => ({
    role: m.sender === "user" ? "user" : "assistant", // map DB 'ai' -> 'assistant'
    content: m.message,
  }));

  const messages = [
    {
      role: "system",
      content:
        "You are SensEase AI, an empathetic mental health companion for college students.\n" +
        "- Provide emotional support, validation, and gentle coping strategies.\n" +
        "- You are NOT a doctor, do NOT diagnose, and do NOT prescribe medications.\n" +
        "- Encourage professional help for serious concerns.\n" +
        "- If the user mentions self-harm, suicide, or harming others, respond with empathy, " +
        "avoid giving instructions, and strongly encourage contacting trusted people or emergency/helpline.",
    },
    {
      role: "system",
      content: moodText,
    },
  ];

  // Add RAG context if available
  if (ragContext && ragContext.trim().length > 0) {
    console.log(`[RAG] Adding context to prompt (${ragContext.length} chars)`);
    console.log('[RAG] Full context being sent:');
    console.log('---START RAG CONTEXT---');
    console.log(ragContext);
    console.log('---END RAG CONTEXT---');
    messages.push({
      role: "system",
      content:
        "IMPORTANT: The context above contains information from the user's past conversations. " +
        "If the user asks about information they previously shared (like their name, experiences, etc.), " +
        "CAREFULLY READ THE CONTEXT to find where they told you this information. " +
        "Look for statements where the User (not Assistant) provided the information. " +
        "If you find it in the context, use it. If not found in context, politely explain you don't have access to that information:\n\n" +
        ragContext,
    });
  } else {
    console.log('[RAG] No context available for this request');
  }

  messages.push(...historyMessages);
  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

const aiChatController = {
  // POST /api/ai/conversations
  async createConversation(req, res) {
    try {
      const { error: idError, userId } = getUserIdFromRequest(req);
      if (idError) {
        return res
          .status(403)
          .json({ error: idError, status: 403 });
      }

      if (!userId) {
        return res
          .status(400)
          .json({ error: "Missing userId" });
      }

      const { title } = req.body;

      const { data, error } = await supabaseAdmin
        .from("ai_conversations")
        .insert({
          user_id: userId,
          title: title || "New Chat",
        })
        .select("id, title, created_at, updated_at")
        .single();

      if (error || !data) {
        console.error("Error creating conversation:", error);
        return res
          .status(500)
          .json({ error: "Failed to create conversation" });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error("createConversation error:", err);
      return res
        .status(500)
        .json({ error: "Server error" });
    }
  },

  // POST /api/ai/chat
  async chat(req, res) {
    try {
      const { error: idError, userId } = getUserIdFromRequest(req);
      if (idError) {
        return res
          .status(403)
          .json({ error: idError, status: 403 });
      }

      const { conversationId, message } = req.body;

      if (!userId || !message || typeof message !== "string") {
        return res
          .status(400)
          .json({ error: "Missing or invalid userId/message" });
      }

      // 1) Crisis detection
      if (isCrisisMessage(message)) {
        const crisisReply =
          "I'm really glad you reached out and shared this with me. " +
          "Your feelings are important and you do not have to face this alone.\n\n" +
          "I'm just an AI and I can't provide emergency help, but it's very important to talk to someone who can. " +
          "If you are in immediate danger, please contact your local emergency number or a crisis helpline in your area. " +
          "You can also reach out to a trusted friend, family member, or a counsellor on your campus.\n\n" +
          "If you'd like, we can also talk a bit more about what you're feeling and small steps to stay safe right now.";

        return res.json({
          reply: crisisReply,
          conversationId: conversationId || null,
          isCrisisHandledLocally: true,
        });
      }

      // 2) Mood detection with j-hartmann model
      const mood = await detectMood(message); // {label, score} or null

      // 3) Ensure conversation exists / user owns it
      let convId = conversationId || null;
      let isNewConversation = false;

      if (!convId) {
        // Generate title from first message (first 50 chars)
        const generatedTitle = message.length > 50 
          ? message.substring(0, 50) + '...' 
          : message;

        const { data: newConv, error: convError } = await supabaseAdmin
          .from("ai_conversations")
          .insert({
            user_id: userId,
            title: generatedTitle,
          })
          .select("id")
          .single();

        if (convError || !newConv) {
          console.error("Error creating ai_conversation:", convError);
          return res
            .status(500)
            .json({ error: "Failed to create conversation. Please try again." });
        }
        convId = newConv.id;
        isNewConversation = true;
        console.log(`[Chat] Created new conversation ${convId} with title: "${generatedTitle}"`);
      } else {
        // verify ownership
        const { data: conv, error: convCheckError } = await supabaseAdmin
          .from("ai_conversations")
          .select("id, user_id")
          .eq("id", convId)
          .single();

        if (convCheckError || !conv) {
          return res
            .status(404)
            .json({ error: "Conversation not found" });
        }
        if (conv.user_id !== userId) {
          return res
            .status(403)
            .json({ error: "User does not own this conversation", status: 403 });
        }
      }

      // 4) Store user message
      const { data: userMsgData, error: insertUserMsgError } = await supabaseAdmin
        .from("ai_messages")
        .insert({
          conversation_id: convId,
          sender: "user",
          message,
        })
        .select("id")
        .single();

      if (insertUserMsgError) {
        console.error("Error inserting user message:", insertUserMsgError);
        return res.status(500).json({ 
          error: "Failed to save your message. Please try again.",
          details: insertUserMsgError.message 
        });
      }

      if (!userMsgData || !userMsgData.id) {
        console.error("User message saved but no ID returned");
        return res.status(500).json({ 
          error: "Failed to save your message properly. Please try again." 
        });
      }

      // 4a) Asynchronously store embedding for user message (best-effort, non-blocking)
      if (userMsgData?.id && RAG_ENABLED) {
        storeMessageEmbedding({
          messageId: userMsgData.id,
          userId,
          conversationId: convId,
          content: message
        }).catch(err => {
          console.error("[RAG] Failed to store user message embedding:", err.message);
        });
      }

      // 5) Load recent history
      const { data: historyData, error: historyError } = await supabaseAdmin
        .from("ai_messages")
        .select("sender, message, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY_MESSAGES);

      const history = historyError || !historyData ? [] : historyData;

      // 5a) RAG: Retrieve relevant past conversations and knowledge
      let ragContext = null;
      if (RAG_ENABLED) {
        try {
          const startTime = Date.now();
          const [historyItems, knowledgeItems] = await Promise.all([
            searchUserHistory({
              userId,
              query: message,
              topK: 3, // Reduced from 5 to 3 for faster performance
              currentConversationId: convId
            }),
            searchKnowledge({
              userId,
              query: message,
              topK: 3, // Reduced from 5 to 3 for faster performance
              sourceTypes: ['resource', 'faq', 'psychoeducation']
            })
          ]);

          ragContext = formatRAGContext(historyItems, knowledgeItems);
          const ragTime = Date.now() - startTime;
          console.log(`[RAG] Retrieved ${historyItems.length} history items, ${knowledgeItems.length} knowledge items in ${ragTime}ms`);
          if (historyItems.length > 0) {
            console.log(`[RAG] Sample history item: "${historyItems[0].content.substring(0, 100)}..."`);
          }
        } catch (ragError) {
          console.error("[RAG] Error retrieving context:", ragError.message);
          // Continue without RAG context
        }
      }

      // 6) Build OpenAI messages with mood and RAG context
      const messagesForOpenAI = buildOpenAIMessages(history, message, mood, ragContext);

      // 7) Call OpenAI
      let assistantReply =
        "I'm having trouble responding right now. Please try again in a moment.";
      try {
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: messagesForOpenAI,
        });

        assistantReply =
          completion.choices?.[0]?.message?.content?.trim() || assistantReply;
      } catch (err) {
        console.error("OpenAI API error:", err);
      }

      // 8) Save AI reply (sender='ai' for DB, but we'll map to 'assistant' on read)
      const { data: aiMsgData, error: insertAiMsgError } = await supabaseAdmin
        .from("ai_messages")
        .insert({
          conversation_id: convId,
          sender: "ai",
          message: assistantReply,
        })
        .select("id")
        .single();

      if (insertAiMsgError) {
        console.error("Error inserting AI message:", insertAiMsgError);
        return res.status(500).json({ 
          error: "Failed to save AI response. Please try again.",
          details: insertAiMsgError.message,
          reply: assistantReply // Still return the reply even if save failed
        });
      }

      if (!aiMsgData || !aiMsgData.id) {
        console.error("AI message saved but no ID returned");
      }

      console.log(`[Chat] User ${userId} - Conversation ${convId} - Reply sent successfully`);

      // 8a) Asynchronously store embedding for AI response (best-effort, non-blocking)
      if (aiMsgData?.id && RAG_ENABLED) {
        storeMessageEmbedding({
          messageId: aiMsgData.id,
          userId,
          conversationId: convId,
          content: assistantReply
        }).catch(err => {
          console.error("[RAG] Failed to store AI message embedding:", err.message);
        });
      }

      // 9) Return
      return res.json({
        reply: assistantReply,
        conversationId: convId,
        mood,
        ragUsed: RAG_ENABLED && ragContext !== null
      });
    } catch (err) {
      console.error("Unhandled AI chat error:", err);
      return res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  },

  // GET /api/ai/conversations?userId=...
  async listRecentConversations(req, res) {
    try {
      const { error: idError, userId } = getUserIdFromRequest(req);
      if (idError) {
        return res
          .status(403)
          .json({ error: idError, status: 403 });
      }

      if (!userId || typeof userId !== "string") {
        return res
          .status(400)
          .json({ error: "Missing or invalid userId" });
      }

      // last 10 days
      const tenDaysAgoIso = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabaseAdmin
        .from("ai_conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .gte("updated_at", tenDaysAgoIso)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching conversations:", error);
        return res
          .status(500)
          .json({ error: "Failed to load recent conversations.", details: error.message });
      }

      console.log(`[Conversations] User ${userId} - Found ${data?.length || 0} conversations`);

      // For each conversation, get the first user message for title generation
      const conversationsWithTitles = await Promise.all(
        (data || []).map(async (conv) => {
          let finalTitle = conv.title;
          
          // If title is null, empty, or generic, get first message
          const genericTitles = ['New Chat', 'New Conversation', 'Chat', 'Untitled Chat'];
          const needsTitle = !finalTitle || 
                            finalTitle.trim() === '' || 
                            genericTitles.includes(finalTitle.trim());
          
          if (needsTitle) {
            const { data: firstMsg } = await supabaseAdmin
              .from("ai_messages")
              .select("message")
              .eq("conversation_id", conv.id)
              .eq("sender", "user")
              .order("created_at", { ascending: true })
              .limit(1)
              .single();

            if (firstMsg?.message) {
              // Generate title from first message
              finalTitle = firstMsg.message.length > 50 
                ? firstMsg.message.substring(0, 50) + '...' 
                : firstMsg.message;
              
              // Update in database for next time
              await supabaseAdmin
                .from("ai_conversations")
                .update({ title: finalTitle })
                .eq("id", conv.id);
            } else {
              // No messages yet - skip this conversation
              return null;
            }
          }

          return {
            ...conv,
            title: finalTitle
          };
        })
      );

      // Filter out null entries (conversations with no messages)
      const validConversations = conversationsWithTitles.filter(conv => conv !== null);
      
      console.log(`[Conversations] Returning ${validConversations.length} conversations (filtered out ${conversationsWithTitles.length - validConversations.length} empty ones)`);

      return res.json({ conversations: validConversations });
    } catch (err) {
      console.error("Unhandled listRecentConversations error:", err);
      return res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  },

  // GET /api/ai/messages?conversationId=...
  async getConversationMessages(req, res) {
    try {
      const { error: idError, userId } = getUserIdFromRequest(req);
      if (idError) {
        return res
          .status(403)
          .json({ error: idError, status: 403 });
      }

      const { conversationId } = req.query;
      if (!conversationId || typeof conversationId !== "string") {
        return res
          .status(400)
          .json({ error: "Missing or invalid conversationId" });
      }

      // verify ownership
      const { data: conv, error: convError } = await supabaseAdmin
        .from("ai_conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      }
      if (userId && conv.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "User does not own this conversation", status: 403 });
      }

      // fetch messages, map sender 'ai' -> 'assistant'
      const { data, error } = await supabaseAdmin
        .from("ai_messages")
        .select("id, sender, message, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching conversation messages:", error);
        return res
          .status(500)
          .json({ error: "Failed to load conversation messages.", details: error.message });
      }

      const messages =
        (data || []).map((m) => ({
          ...m,
          sender: m.sender === "ai" ? "assistant" : m.sender,
        })) || [];

      console.log(`[Messages] Conversation ${conversationId} - Found ${messages.length} messages`);
      
      // Check for blank messages
      const blankMessages = messages.filter(m => !m.message || m.message.trim() === '');
      if (blankMessages.length > 0) {
        console.warn(`[Messages] Warning: ${blankMessages.length} blank messages found in conversation ${conversationId}`);
      }

      return res.json({ messages });
    } catch (err) {
      console.error("Unhandled getConversationMessages error:", err);
      return res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  },

  // DELETE /api/ai/conversations/:conversationId
  async deleteConversation(req, res) {
    try {
      const { error: idError, userId } = getUserIdFromRequest(req);
      if (idError) {
        return res
          .status(403)
          .json({ error: idError, status: 403 });
      }

      const { conversationId } = req.params;
      if (!conversationId || !userId) {
        return res
          .status(400)
          .json({ error: "Missing conversationId or userId" });
      }

      // Verify ownership
      const { data: conv, error: convError } = await supabaseAdmin
        .from("ai_conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      }

      if (conv.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "User does not own this conversation", status: 403 });
      }

      // Delete messages
      await supabaseAdmin
        .from("ai_messages")
        .delete()
        .eq("conversation_id", conversationId);

      // Delete conversation
      await supabaseAdmin
        .from("ai_conversations")
        .delete()
        .eq("id", conversationId);

      return res.json({ success: true });
    } catch (err) {
      console.error("deleteConversation error:", err);
      return res
        .status(500)
        .json({ error: "Server error" });
    }
  },

  // POST /api/ai/voice  (optional voice endpoint, using transcription)
  async voice(req, res) {
    try {
      const { error: idError, userId } = getUserIdFromRequest(req);
      if (idError) {
        return res
          .status(403)
          .json({ error: idError, status: 403 });
      }

      const { conversationId } = req.body;
      if (!req.file || !userId || !conversationId) {
        return res
          .status(400)
          .json({ error: "Missing file, userId, or conversationId" });
      }

      // Verify conversation ownership
      const { data: conv, error: convError } = await supabaseAdmin
        .from("ai_conversations")
        .select("id, user_id")
        .eq("id", conversationId)
        .single();

      if (convError || !conv) {
        return res
          .status(404)
          .json({ error: "Conversation not found" });
      }
      if (conv.user_id !== userId) {
        return res
          .status(403)
          .json({ error: "User does not own this conversation", status: 403 });
      }

      // Transcribe audio with Whisper
      let transcribedText = "";
      try {
        const audioFile = new File(
          [req.file.buffer],
          req.file.originalname || "audio.webm",
          { type: req.file.mimetype || "audio/webm" }
        );

        const transcription = await openai.audio.transcriptions.create({
          model: "whisper-1",
          file: audioFile,
        });

        transcribedText = transcription.text || "";
      } catch (err) {
        console.error("Transcription failed:", err);
        return res
          .status(500)
          .json({ error: "Transcription failed" });
      }

      if (!transcribedText.trim()) {
        return res
          .status(400)
          .json({ error: "No text detected in audio" });
      }

      // Crisis detection for voice
      if (isCrisisMessage(transcribedText)) {
        const crisisReply =
          "I'm really glad you reached out and shared this with me. " +
          "Your feelings are important and you do not have to face this alone.\n\n" +
          "I'm just an AI and I can't provide emergency help, but it's very important to talk to someone who can. " +
          "If you are in immediate danger, please contact your local emergency number or a crisis helpline in your area. " +
          "You can also reach out to a trusted friend, family member, or a counsellor on your campus.\n\n" +
          "If you'd like, we can also talk a bit more about what you're feeling and small steps to stay safe right now.";

        return res.json({
          transcribedText,
          botResponse: crisisReply,
          conversationId,
          isCrisisHandledLocally: true,
        });
      }

      // Save user message (text from voice)
      const { data: userMsgData, error: userInsertError } = await supabaseAdmin
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          sender: "user",
          message: transcribedText,
        })
        .select("id")
        .single();

      if (userInsertError) {
        console.error("Error inserting user voice message:", userInsertError);
      }

      // Asynchronously store embedding for user voice message
      if (userMsgData?.id && RAG_ENABLED) {
        storeMessageEmbedding({
          messageId: userMsgData.id,
          userId,
          conversationId,
          content: transcribedText
        }).catch(err => {
          console.error("[RAG] Failed to store voice message embedding:", err.message);
        });
      }

      // Mood detection for voice text
      const mood = await detectMood(transcribedText);

      // Load history
      const { data: historyData } = await supabaseAdmin
        .from("ai_messages")
        .select("sender, message, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(MAX_HISTORY_MESSAGES);

      const history = historyData || [];

      // RAG: Retrieve relevant context for voice message
      let ragContext = null;
      if (RAG_ENABLED) {
        try {
          const startTime = Date.now();
          const [historyItems, knowledgeItems] = await Promise.all([
            searchUserHistory({
              userId,
              query: transcribedText,
              topK: 3, // Reduced from 5 to 3 for faster performance
              currentConversationId: conversationId
            }),
            searchKnowledge({
              userId,
              query: transcribedText,
              topK: 3, // Reduced from 5 to 3 for faster performance
              sourceTypes: ['resource', 'faq', 'psychoeducation']
            })
          ]);

          ragContext = formatRAGContext(historyItems, knowledgeItems);
          const ragTime = Date.now() - startTime;
          console.log(`[RAG Voice] Retrieved ${historyItems.length} history items, ${knowledgeItems.length} knowledge items in ${ragTime}ms`);
        } catch (ragError) {
          console.error("[RAG Voice] Error retrieving context:", ragError.message);
        }
      }

      const messagesForOpenAI = buildOpenAIMessages(
        history,
        transcribedText,
        mood,
        ragContext
      );

      // Call OpenAI for response
      let botResponse = "I'm here with you. Tell me more about how you're feeling.";
      try {
        const completion = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: messagesForOpenAI,
        });
        botResponse =
          completion.choices?.[0]?.message?.content?.trim() || botResponse;
      } catch (err) {
        console.error("OpenAI error in /voice:", err);
      }

      // Save AI message
      const { data: aiMsgData, error: aiInsertError } = await supabaseAdmin
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          sender: "ai",
          message: botResponse,
        })
        .select("id")
        .single();

      if (aiInsertError) {
        console.error("Error inserting AI voice response:", aiInsertError);
      }

      // Asynchronously store embedding for AI voice response
      if (aiMsgData?.id && RAG_ENABLED) {
        storeMessageEmbedding({
          messageId: aiMsgData.id,
          userId,
          conversationId,
          content: botResponse
        }).catch(err => {
          console.error("[RAG] Failed to store AI voice response embedding:", err.message);
        });
      }

      return res.json({
        transcribedText,
        botResponse,
        conversationId,
        ragUsed: RAG_ENABLED && ragContext !== null
      });
    } catch (err) {
      console.error("voice endpoint error:", err);
      return res
        .status(500)
        .json({ error: "Server error" });
    }
  },
};

export { aiChatController };
