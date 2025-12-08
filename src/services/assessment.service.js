import { supabase } from '../config/supabase.js';
import { getAssessmentGuidance } from '../config/gemini.js';

/**
 * Assessment Service
 * Handles all assessment-related business logic including scoring and AI guidance
 */

// ==================== SCORING FUNCTIONS ====================

/**
 * PHQ-9 (Patient Health Questionnaire-9) - Depression Assessment
 * Scoring: Each question scored 0-3
 * Total Score: 0-27
 * Interpretation: 0-4 (Minimal), 5-9 (Mild), 10-14 (Moderate), 15-19 (Moderately Severe), 20-27 (Severe)
 */
const scorePHQ9 = (responses) => {
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 4) severity = 'Minimal';
  else if (score <= 9) severity = 'Mild';
  else if (score <= 14) severity = 'Moderate';
  else if (score <= 19) severity = 'Moderately Severe';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * GAD-7 (Generalized Anxiety Disorder-7) - Anxiety Assessment
 * Scoring: Each question scored 0-3
 * Total Score: 0-21
 * Interpretation: 0-4 (Minimal), 5-9 (Mild), 10-14 (Moderate), 15-21 (Severe)
 */
const scoreGAD7 = (responses) => {
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 4) severity = 'Minimal';
  else if (score <= 9) severity = 'Mild';
  else if (score <= 14) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * GHQ-12 (General Health Questionnaire-12) - General Mental Health
 * Scoring: Each question scored 0-3 (Likert scoring)
 * Total Score: 0-36
 * Interpretation: 0-11 (Good Mental Health), 12-15 (Mild), 16-20 (Moderate), 21+ (Severe)
 */
const scoreGHQ12 = (responses) => {
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 11) severity = 'Minimal';
  else if (score <= 15) severity = 'Mild';
  else if (score <= 20) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * PSS-10 (Perceived Stress Scale-10) - Stress Assessment
 * Scoring: Questions 4, 5, 7, 8 are reverse scored (0=4, 1=3, 2=2, 3=1, 4=0)
 * Total Score: 0-40
 * Interpretation: 0-13 (Low Stress), 14-26 (Moderate Stress), 27-40 (High Stress)
 */
const scorePSS10 = (responses) => {
  const reverseItems = ['q4', 'q5', 'q7', 'q8'];
  let score = 0;
  
  Object.entries(responses).forEach(([key, val]) => {
    const value = parseInt(val);
    if (reverseItems.includes(key)) {
      score += (4 - value); // Reverse scoring
    } else {
      score += value;
    }
  });
  
  let severity;
  if (score <= 13) severity = 'Minimal';
  else if (score <= 26) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * WHO-5 (WHO Well-Being Index) - Well-being Assessment
 * Scoring: Each question scored 0-5
 * Raw Score: 0-25 (sum of all 5 questions)
 * Interpretation: 0-7 (Poor), 8-14 (Low), 15-19 (Fair), 20-25 (Good)
 */
const scoreWHO5 = (responses) => {
  const rawScore = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (rawScore <= 7) severity = 'Severe'; // Poor wellbeing
  else if (rawScore <= 14) severity = 'Moderate'; // Low wellbeing
  else if (rawScore <= 19) severity = 'Mild'; // Fair wellbeing
  else severity = 'Minimal'; // Good wellbeing
  
  return { score: rawScore, severity };
};

/**
 * IAT (Internet Addiction Test) - Internet Addiction Assessment
 * Scoring: Each question scored 1-5
 * Total Score: 20-100
 * Interpretation: 20-49 (Normal), 50-79 (Mild), 80-100 (Severe)
 */
const scoreIAT = (responses) => {
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 49) severity = 'Minimal';
  else if (score <= 79) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * PSQI (Pittsburgh Sleep Quality Index) - Sleep Quality Assessment
 * Scoring: Complex scoring with 7 components, each scored 0-3
 * Total Score: 0-21
 * Interpretation: 0-5 (Good), 6-10 (Mild), 11-15 (Moderate), 16-21 (Severe)
 */
const scorePSQI = (responses) => {
  // Simplified scoring - each component scored 0-3
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 5) severity = 'Minimal';
  else if (score <= 10) severity = 'Mild';
  else if (score <= 15) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * BHI-10 (Brief Health Index-10) - Overall Health Assessment
 * Scoring: Each question scored 0-4
 * Total Score: 0-40
 * Interpretation: 0-10 (Good), 11-20 (Mild), 21-30 (Moderate), 31-40 (Severe)
 */
const scoreBHI10 = (responses) => {
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 10) severity = 'Minimal';
  else if (score <= 20) severity = 'Mild';
  else if (score <= 30) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * DERS-18 (Difficulties in Emotion Regulation Scale-18) - Emotion Regulation
 * Scoring: Each question scored 1-5
 * Total Score: 18-90
 * Interpretation: 18-35 (Good), 36-54 (Mild), 55-72 (Moderate), 73-90 (Severe)
 */
const scoreDERS18 = (responses) => {
  const score = Object.values(responses).reduce((sum, val) => sum + parseInt(val), 0);
  let severity;
  
  if (score <= 35) severity = 'Minimal';
  else if (score <= 54) severity = 'Mild';
  else if (score <= 72) severity = 'Moderate';
  else severity = 'Severe';
  
  return { score, severity };
};

/**
 * CSSRS (Columbia-Suicide Severity Rating Scale) - Suicide Risk Assessment
 * Scoring: Complex screener with yes/no questions
 * Severity based on positive responses to specific questions
 * CRITICAL: This requires immediate intervention if high risk
 */
const scoreCSSRS = (responses) => {
  // Check for presence of suicidal ideation or behavior
  const hasIdeation = responses.q1 === 'yes' || responses.q2 === 'yes';
  const hasIntent = responses.q3 === 'yes' || responses.q4 === 'yes';
  const hasPlan = responses.q5 === 'yes';
  const hasBehavior = responses.q6 === 'yes';
  
  let severity;
  let score;
  
  if (hasBehavior || (hasIntent && hasPlan)) {
    severity = 'Severe'; // High risk - immediate intervention needed
    score = 4;
  } else if (hasIntent || hasPlan) {
    severity = 'Moderate'; // Moderate risk - urgent attention needed
    score = 3;
  } else if (hasIdeation) {
    severity = 'Mild'; // Low risk - close monitoring needed
    score = 2;
  } else {
    severity = 'Minimal'; // No current risk
    score = 1;
  }
  
  return { score, severity };
};

// ==================== SCORING DISPATCHER ====================

/**
 * Calculate score based on assessment type
 */
const calculateScore = (formType, responses) => {
  const scoringFunctions = {
    'PHQ-9': scorePHQ9,
    'GAD-7': scoreGAD7,
    'GHQ-12': scoreGHQ12,
    'PSS-10': scorePSS10,
    'WHO-5': scoreWHO5,
    'IAT': scoreIAT,
    'PSQI': scorePSQI,
    'BHI-10': scoreBHI10,
    'DERS-18': scoreDERS18,
    'CSSRS': scoreCSSRS,
    'C-SSRS': scoreCSSRS
  };
  
  const scoringFunction = scoringFunctions[formType];
  if (!scoringFunction) {
    throw new Error(`Unknown assessment type: ${formType}`);
  }
  
  return scoringFunction(responses);
};

// ==================== ASSESSMENT SUBMISSION ====================

/**
 * Submit a new assessment
 * @param {string} studentId - Student's user ID
 * @param {string} collegeId - Student's college ID
 * @param {string} formType - Type of assessment form
 * @param {Object} responses - Student's responses
 * @returns {Object} Assessment result with guidance
 */
export const submitAssessment = async (studentId, collegeId, formType, responses) => {
  try {
    // Step 1: Calculate score and severity
    const { score, severity } = calculateScore(formType, responses);
    
    // Step 2: Get AI-powered guidance and recommendations
    const { guidance, recommendedActions } = await getAssessmentGuidance({
      formType,
      responses,
      score,
      severityLevel: severity
    });
    
    // Step 3: Save to database
    const { data, error } = await supabase
      .from('assessments')
      .insert({
        student_id: studentId,
        college_id: collegeId,
        form_type: formType,
        responses: responses,
        score: score,
        severity_level: severity,
        guidance: guidance,
        recommended_actions: Array.isArray(recommendedActions) 
          ? recommendedActions.join('||') 
          : recommendedActions
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    // Step 4: Return formatted result
    return {
      id: data.id,
      formType: data.form_type,
      score: data.score,
      severityLevel: data.severity_level,
      guidance: data.guidance,
      recommendedActions: typeof data.recommended_actions === 'string' 
        ? data.recommended_actions.split('||') 
        : data.recommended_actions,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Submit assessment error:', error);
    throw error;
  }
};

// ==================== ASSESSMENT RETRIEVAL ====================

/**
 * Get assessment history for a student
 * @param {string} studentId - Student's user ID
 * @param {string} collegeId - Student's college ID
 * @param {Object} filters - Optional filters (formType, limit, offset)
 * @returns {Array} List of assessments
 */
export const getAssessmentHistory = async (studentId, collegeId, filters = {}) => {
  try {
    let query = supabase
      .from('assessments')
      .select('id, form_type, score, severity_level, responses, created_at')
      .eq('student_id', studentId)
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });
    
    // Apply optional filters
    if (filters.formType) {
      query = query.eq('form_type', filters.formType);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get assessment history error:', error);
      throw error;
    }
    
    // Format the response
    return data.map(assessment => ({
      id: assessment.id,
      assessmentName: assessment.form_type,
      date: new Date(assessment.created_at).toLocaleDateString(),
      time: new Date(assessment.created_at).toLocaleTimeString(),
      score: assessment.score,
      severity: assessment.severity_level,
      responses: assessment.responses
    }));
  } catch (error) {
    console.error('Get assessment history error:', error);
    throw error;
  }
};

/**
 * Get a single assessment by ID
 * @param {string} assessmentId - Assessment ID
 * @param {string} studentId - Student's user ID
 * @param {string} collegeId - Student's college ID
 * @returns {Object} Full assessment details
 */
export const getAssessmentById = async (assessmentId, studentId, collegeId) => {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('student_id', studentId)
      .eq('college_id', collegeId)
      .single();
    
    if (error) {
      console.error('Get assessment by ID error:', error);
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    // Format the response
    return {
      id: data.id,
      assessmentName: data.form_type,
      date: new Date(data.created_at).toLocaleDateString(),
      time: new Date(data.created_at).toLocaleTimeString(),
      score: data.score,
      severity: data.severity_level,
      responses: data.responses,
      guidance: data.guidance,
      recommendedActions: typeof data.recommended_actions === 'string' 
        ? data.recommended_actions.split('||') 
        : data.recommended_actions
    };
  } catch (error) {
    console.error('Get assessment by ID error:', error);
    throw error;
  }
};

/**
 * Get assessment statistics for a student
 * @param {string} studentId - Student's user ID
 * @param {string} collegeId - Student's college ID
 * @returns {Object} Statistics
 */
export const getAssessmentStats = async (studentId, collegeId) => {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('form_type, score, severity_level, created_at')
      .eq('student_id', studentId)
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Calculate statistics
    const totalAssessments = data.length;
    const assessmentsByType = {};
    const recentAssessments = data.slice(0, 5);
    
    data.forEach(assessment => {
      if (!assessmentsByType[assessment.form_type]) {
        assessmentsByType[assessment.form_type] = {
          count: 0,
          latestScore: null,
          latestSeverity: null,
          latestDate: null
        };
      }
      
      const typeStats = assessmentsByType[assessment.form_type];
      typeStats.count++;
      
      if (!typeStats.latestDate || new Date(assessment.created_at) > new Date(typeStats.latestDate)) {
        typeStats.latestScore = assessment.score;
        typeStats.latestSeverity = assessment.severity_level;
        typeStats.latestDate = assessment.created_at;
      }
    });
    
    return {
      totalAssessments,
      assessmentsByType,
      recentAssessments: recentAssessments.map(a => ({
        id: a.id,
        type: a.form_type,
        score: a.score,
        severity: a.severity_level,
        date: new Date(a.created_at).toLocaleDateString()
      }))
    };
  } catch (error) {
    console.error('Get assessment stats error:', error);
    throw error;
  }
};

export default {
  submitAssessment,
  getAssessmentHistory,
  getAssessmentById,
  getAssessmentStats
};
