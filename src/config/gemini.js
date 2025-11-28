import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Missing Gemini API Key. Please add GEMINI_API_KEY to your .env file.');
}

// Initialize the Gemini API
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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
  if (!genAI) {
    throw new Error('Gemini API is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Strict, concise, and fast prompt
    const prompt = `
SYSTEM: You are a concise, supportive mental health assistant for college students using SensEase. ALWAYS keep responses short.

INPUT:
- Form: ${formType}
- Score: ${score}
- Severity: ${severityLevel}
- Responses JSON: ${JSON.stringify(responses)}

RESPONSE RULES (STRICT):
1. Personalized Guidance: 3–5 sentences, MAX 90 words. Warm tone. No long paragraphs.
2. Recommended Actions: 5–7 items. EACH item is ONE short sentence (≤15 words). No explanations.
3. Output JSON ONLY:
{
  "guidance": "<= 90 words",
  "recommendedActions": [ "<=15 words", "<=15 words", "<=15 words", "<=15 words", "<=15 words" ]
}
4. Do NOT add extra fields, titles, disclaimers, or markdown. No code fences.
`;

    const generationConfig = { maxOutputTokens: 256, temperature: 0.6 }; // cap length for speed and brevity
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }]}], generationConfig });
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedResponse = JSON.parse(cleanedText);

    // Defensive trimming to enforce constraints
    const guidance = String(parsedResponse.guidance || '').trim();
    const trimmedGuidance = guidance.split(/\s+/).slice(0, 90).join(' '); // approx 90 words cap

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
    console.error('Gemini API Error:', error);
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
      guidance: `Your ${formType} assessment shows minimal concerns. You're doing well in maintaining your mental health. Continue practicing self-care and healthy habits. Remember, it's normal to have ups and downs, and it's great that you're being proactive about your wellbeing.`,
      recommendedActions: [
        'Continue your current self-care routine',
        'Stay connected with friends and family',
        'Maintain a healthy sleep schedule',
        'Engage in regular physical activity',
        'Practice stress management techniques like deep breathing or meditation',
        'Keep track of your mood and wellbeing',
        'Don\'t hesitate to reach out for support if things change'
      ]
    },
    'mild': {
      guidance: `Your ${formType} assessment indicates mild concerns. This is common among college students, and there are many effective strategies to help you feel better. Taking this assessment is a positive first step. With some adjustments to your routine and support, you can improve your wellbeing.`,
      recommendedActions: [
        'Schedule an appointment with your campus counseling center',
        'Practice daily self-care activities (exercise, hobbies, relaxation)',
        'Establish a consistent sleep schedule (7-9 hours)',
        'Connect with friends or join a support group',
        'Limit caffeine and maintain a balanced diet',
        'Try mindfulness or meditation apps',
        'Talk to a trusted friend, family member, or counselor about how you\'re feeling',
        'Monitor your symptoms and retake the assessment in a few weeks'
      ]
    },
    'moderate': {
      guidance: `Your ${formType} assessment indicates moderate concerns that deserve attention. Many college students experience similar challenges, and there are effective treatments and support available. It's important to reach out for professional help. Your wellbeing matters, and you don't have to face this alone.`,
      recommendedActions: [
        'Contact your campus counseling center as soon as possible',
        'Talk to your academic advisor about support options',
        'Consider joining a support group or therapy sessions',
        'Practice stress-reduction techniques daily (meditation, yoga, deep breathing)',
        'Maintain regular social connections - don\'t isolate yourself',
        'Establish healthy routines (regular sleep, meals, exercise)',
        'Limit alcohol and avoid substance use',
        'Be open with trusted people in your life about what you\'re experiencing',
        'Consider speaking with your doctor about treatment options'
      ]
    },
    'severe': {
      guidance: `Your ${formType} assessment indicates significant concerns that require immediate professional attention. Please know that you are not alone, and effective help is available. Your college counseling center and other mental health professionals can provide the support you need. Taking action now is crucial for your wellbeing and recovery.`,
      recommendedActions: [
        '🚨 PRIORITY: Contact your campus counseling center immediately',
        'If you\'re in crisis, call the 988 Suicide & Crisis Lifeline (available 24/7)',
        'Reach out to a trusted friend or family member right away',
        'Visit your college health center or see a doctor',
        'Don\'t be alone - stay with someone you trust',
        'Consider taking a temporary break from academic pressures if needed',
        'Avoid making major life decisions right now',
        'Remove access to means of self-harm if you\'re having those thoughts',
        'Follow up with professional treatment consistently',
        'Remember: This is temporary, help is available, and recovery is possible'
      ]
    },
    'moderately severe': {
      guidance: `Your ${formType} assessment indicates moderately severe concerns that require immediate professional attention. Please know that you are not alone, and effective help is available. Your college counseling center and other mental health professionals can provide the support you need. Taking action now is crucial for your wellbeing and recovery.`,
      recommendedActions: [
        '🚨 PRIORITY: Contact your campus counseling center immediately',
        'If you\'re in crisis, call the 988 Suicide & Crisis Lifeline (available 24/7)',
        'Reach out to a trusted friend or family member right away',
        'Visit your college health center or see a doctor',
        'Don\'t be alone - stay with someone you trust',
        'Consider taking a temporary break from academic pressures if needed',
        'Avoid making major life decisions right now',
        'Remove access to means of self-harm if you\'re having those thoughts',
        'Follow up with professional treatment consistently',
        'Remember: This is temporary, help is available, and recovery is possible'
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
