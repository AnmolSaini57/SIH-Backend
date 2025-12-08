import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  console.error('Missing OpenAI API Key. Please add OPENAI_API_KEY to your .env file.');
}

// Initialize the OpenAI API
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

/**
 * Get AI-powered guidance and recommendations for mental health assessments
 * @param {Object} params - Assessment parameters
 * @param {string} params.formType - Type of assessment form
 * @param {Object} params.responses - Student's responses to assessment questions
 * @param {number} params.score - Calculated assessment score
 * @param {string} params.severityLevel - Severity level based on score
 * @returns {Promise<Object>} - AI-generated guidance and recommendations
 */
export const getAssessmentGuidance = async ({ formType, responses, score, severityLevel }) => {
  if (!openai) {
    throw new Error('OpenAI API is not configured');
  }

  try {
    const prompt = `You are a supportive mental health assistant for a college student wellbeing platform.
Your job is to provide compassionate, brief, and practical guidance based on a mental health assessment.

Assessment Details:
- Form Type: ${formType}
- Score: ${score}
- Severity Level: ${severityLevel}
- Responses: ${JSON.stringify(responses)}

By the responses,formType, you can get what answer is given by the student for each question.So use that to understand their situation better and give more personalized guidance.
The student is looking for advice on how to manage their mental health based on these results.

GUIDELINES:
I. Keep everything SHORT:
   - Guidance: 5–7 crisp sentences (maximum 100 words)
   - Actions: 5–7 items, each a single short sentence (maximum 15 words)
II. Tone should be warm, supportive, and non-judgmental.
III. Do NOT mention:
   - Alcohol, drugs, medication, substance use
   - Diagnoses or medical instructions
   - Anything that could be interpreted as clinical treatment
IV. Focus only on safe, practical wellbeing strategies.
V. Suitable for college students: consider academic stress, lifestyle, and campus support.
VI. Encourage reaching out for help, but do NOT give crisis hotlines unless severity is "Severe".
VII. Never create long paragraphs. Keep everything direct and skimmable.
VIII. Platform features: journaling, habit trackers, grounding tools, guided meditation, calming audios/videos, anonymous community rooms, productivity tools (Pomodoro, Eisenhower matrix), counselor session booking. Include 1–3 relevant app features in actions.

OUTPUT FORMAT (STRICT JSON):
{
  "guidance": "5–7 short supportive sentences (max 100 words).",
  "recommendedActions": [
    "Short action 1.",
    "Short action 2.",
    "Short action 3.",
    "Short action 4.",
    "Short action 5."
  ]
}
Return ONLY valid JSON. Do not include markdown or explanations.`;

    const result = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 256
    });

    const text = result.choices[0].message.content;

    // Parse the JSON response
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Defensive trimming to enforce constraints
    const guidance = String(parsedResponse.guidance || '').trim();
    const trimmedGuidance = guidance.split(/\s+/).slice(0, 100).join(' '); // approx 100 words cap

    const actions = Array.isArray(parsedResponse.recommendedActions) ? parsedResponse.recommendedActions : [];
    const trimmedActions = actions
      .filter(Boolean)
      .slice(0, 7)
      .map(a => String(a).trim().split(/\s+/).slice(0, 15).join(' '));

    return {
      guidance: trimmedGuidance,
      recommendedActions: trimmedActions
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    // Return fallback guidance if API fails
    return getFallbackGuidance(formType, severityLevel);
  }
};

/**
 * Fallback guidance when API is unavailable
 */
const getFallbackGuidance = (formType, severityLevel) => {
  const guidanceMap = {
    'minimal': {
      guidance: "Your results show minimal concerns, which is great. You're managing well and being proactive about your mental health is important. Keep up the healthy habits you have in place. It's normal to have ups and downs, so continue checking in with yourself. Stay connected with supportive people around you.",
      recommendedActions: [
        'Maintain your current routines.',
        'Stay connected with supportive people.',
        'Get regular sleep and rest.',
        'Engage in activities you enjoy.',
        'Use journaling to track your mood.',
        'Monitor changes in mood or stress.'
      ]
    },
    'mild': {
      guidance: "Your results show mild concerns, which are very common among college students. Taking this assessment is a positive first step. Small adjustments in your routine and reaching out for support can make a real difference. Many students navigate similar feelings, and there are effective strategies to help you feel better. You're not alone in this experience.",
      recommendedActions: [
        'Practice a simple self-care activity daily.',
        'Maintain consistent sleep and meal routines.',
        'Talk with a friend or mentor.',
        'Try guided meditation or grounding tools.',
        'Use habit trackers to build healthy routines.',
        'Reach out for campus support if symptoms persist.'
      ]
    },
    'moderate': {
      guidance: "Your results suggest moderate concerns that deserve attention. Many college students experience similar challenges, especially with academic and social pressures. The good news is that support and self-care strategies can really help. You're taking an important step by checking in. Consider reaching out to your campus counseling center—they're there to support you. You don't have to face this alone.",
      recommendedActions: [
        'Reach out to your campus counseling center.',
        'Talk to someone you trust about how you feel.',
        'Use stress-reduction practices like deep breathing.',
        'Try calming audios or meditation from the app.',
        'Follow a stable routine for sleep and meals.',
        'Connect socially instead of isolating.',
        'Book a counselor session if available.'
      ]
    },
    'severe': {
      guidance: "Your results suggest significant concerns, and it's really important to reach out for support right away. You don't have to handle this alone—professional help is available and can make a real difference. Please contact your campus counseling center or a trusted person today. Many students have been where you are and found their way through with the right support. Taking action now is a crucial step toward feeling better.",
      recommendedActions: [
        'Contact your campus counseling services immediately.',
        'Talk to a trusted friend or family member.',
        'Avoid being alone—stay around supportive people.',
        'Take a break from overwhelming tasks if needed.',
        'Use grounding tools for calming.',
        'Seek professional help as soon as possible.',
        'Call 988 Suicide & Crisis Lifeline if in crisis.'
      ]
    },
    'moderately severe': {
      guidance: "Your results suggest significant concerns, and it's really important to reach out for support right away. You don't have to handle this alone—professional help is available and can make a real difference. Please contact your campus counseling center or a trusted person today. Many students have been where you are and found their way through with the right support. Taking action now is a crucial step toward feeling better.",
      recommendedActions: [
        'Contact your campus counseling services immediately.',
        'Talk to a trusted friend or family member.',
        'Avoid being alone—stay around supportive people.',
        'Take a break from overwhelming tasks if needed.',
        'Use grounding tools for calming.',
        'Seek professional help as soon as possible.',
        'Call 988 Suicide & Crisis Lifeline if in crisis.'
      ]
    }
  };

  const severity = severityLevel.toLowerCase();
  return guidanceMap[severity] || guidanceMap['mild'];
};

export default {
  getAssessmentGuidance,
  getFallbackGuidance
};
