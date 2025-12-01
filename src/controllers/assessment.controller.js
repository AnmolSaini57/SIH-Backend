import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  formatSupabaseError 
} from "../utils/response.js";
import {
  submitAssessment,
  getAssessmentHistory,
  getAssessmentById,
  getAssessmentStats
} from "../services/assessment.service.js";

// ==================== SUBMIT ASSESSMENT ====================

/**
 * Submit a new assessment
 * POST /api/student/assessments
 * Body: { formType: string, responses: object }
 */
export const submitAssessmentController = async (req, res) => {
  try {
    const { formType, responses } = req.body;
    const studentId = req.user.user_id;
    const collegeId = req.tenant;

    // Validation
    if (!formType || !responses) {
      return errorResponse(res, 'Form type and responses are required', 400);
    }

    // Validate form type
    const validFormTypes = [
      'PHQ-9', 'GAD-7', 'GHQ-12', 'PSS-10', 'WHO-5', 
      'IAT', 'PSQI', 'BHI-10', 'DERS-18', 'CSSRS', 'C-SSRS'
    ];

    if (!validFormTypes.includes(formType)) {
      return errorResponse(res, `Invalid form type: ${formType}. Valid types are: ${validFormTypes.join(', ')}`, 400);
    }

    // Validate responses is an object
    if (typeof responses !== 'object' || Array.isArray(responses)) {
      return errorResponse(res, 'Responses must be an object', 400);
    }

    // Check if responses is empty
    if (Object.keys(responses).length === 0) {
      return errorResponse(res, 'Responses cannot be empty', 400);
    }

    // Submit assessment
    const result = await submitAssessment(studentId, collegeId, formType, responses);

    return successResponse(
      res, 
      result, 
      'Assessment submitted successfully',
      201
    );
  } catch (error) {
    console.error('Submit assessment controller error:', error);
    
    // Handle specific errors
    if (error.code === '23503') {
      return errorResponse(res, 'Invalid student or college ID', 400);
    }
    
    return errorResponse(
      res, 
      'Failed to submit assessment. Please try again.',
      500
    );
  }
};

// ==================== GET ASSESSMENT HISTORY ====================

/**
 * Get assessment history for the logged-in student
 * GET /api/student/assessments
 * Query params: formType (optional), limit (optional), offset (optional)
 */
export const getAssessmentHistoryController = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const collegeId = req.tenant;
    
    // Parse query parameters
    const filters = {
      formType: req.query.formType,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    // Validate limit and offset
    if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
      return errorResponse(res, 'Limit must be between 1 and 100', 400);
    }

    if (filters.offset && filters.offset < 0) {
      return errorResponse(res, 'Offset must be non-negative', 400);
    }

    // Get assessment history
    const assessments = await getAssessmentHistory(studentId, collegeId, filters);

    return successResponse(
      res, 
      {
        assessments,
        count: assessments.length,
        filters: {
          formType: filters.formType || 'all',
          limit: filters.limit || 'all',
          offset: filters.offset || 0
        }
      }, 
      'Assessment history retrieved successfully'
    );
  } catch (error) {
    console.error('Get assessment history controller error:', error);
    return errorResponse(
      res, 
      'Failed to retrieve assessment history',
      500
    );
  }
};

// ==================== GET SINGLE ASSESSMENT ====================

/**
 * Get a single assessment by ID
 * GET /api/student/assessments/:id
 */
export const getAssessmentByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.user_id;
    const collegeId = req.tenant;

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse(res, 'Invalid assessment ID format', 400);
    }

    // Get assessment
    const assessment = await getAssessmentById(id, studentId, collegeId);

    if (!assessment) {
      return notFoundResponse(res, 'Assessment not found');
    }

    return successResponse(
      res, 
      assessment, 
      'Assessment retrieved successfully'
    );
  } catch (error) {
    console.error('Get assessment by ID controller error:', error);
    
    if (error.code === 'PGRST116') {
      return notFoundResponse(res, 'Assessment not found');
    }
    
    return errorResponse(
      res, 
      'Failed to retrieve assessment',
      500
    );
  }
};

// ==================== GET ASSESSMENT STATISTICS ====================

/**
 * Get assessment statistics for the logged-in student
 * GET /api/student/assessments/stats
 */
export const getAssessmentStatsController = async (req, res) => {
  try {
    const studentId = req.user.user_id;
    const collegeId = req.tenant;

    // Get statistics
    const stats = await getAssessmentStats(studentId, collegeId);

    return successResponse(
      res, 
      stats, 
      'Assessment statistics retrieved successfully'
    );
  } catch (error) {
    console.error('Get assessment stats controller error:', error);
    return errorResponse(
      res, 
      'Failed to retrieve assessment statistics',
      500
    );
  }
};

// ==================== GET AVAILABLE ASSESSMENTS ====================

/**
 * Get list of available assessment forms
 * GET /api/student/assessments/available
 */
export const getAvailableAssessments = async (req, res) => {
  try {
    const assessments = [
      {
        id: 'PHQ-9',
        name: 'PHQ-9 - Depression Screening',
        description: 'Patient Health Questionnaire for depression assessment',
        duration: '5 minutes',
        questions: 9,
        category: 'Mental Health'
      },
      {
        id: 'GAD-7',
        name: 'GAD-7 - Anxiety Assessment',
        description: 'Generalized Anxiety Disorder screening tool',
        duration: '3 minutes',
        questions: 7,
        category: 'Mental Health'
      },
      {
        id: 'GHQ-12',
        name: 'GHQ-12 - General Mental Health',
        description: 'General Health Questionnaire for overall mental wellbeing',
        duration: '5 minutes',
        questions: 12,
        category: 'Mental Health'
      },
      {
        id: 'PSS-10',
        name: 'PSS-10 - Stress Assessment',
        description: 'Perceived Stress Scale to measure stress levels',
        duration: '5 minutes',
        questions: 10,
        category: 'Stress'
      },
      {
        id: 'WHO-5',
        name: 'WHO-5 - Wellbeing Index',
        description: 'WHO Well-Being Index for positive mental health',
        duration: '2 minutes',
        questions: 5,
        category: 'Wellbeing'
      },
      {
        id: 'IAT',
        name: 'IAT - Internet Addiction Test',
        description: 'Assessment for problematic internet use',
        duration: '8 minutes',
        questions: 20,
        category: 'Behavioral'
      },
      {
        id: 'PSQI',
        name: 'PSQI - Sleep Quality Index',
        description: 'Pittsburgh Sleep Quality Index for sleep assessment',
        duration: '10 minutes',
        questions: 19,
        category: 'Sleep'
      },
      {
        id: 'BHI-10',
        name: 'BHI-10 - Brief Health Index',
        description: 'Comprehensive health and wellness assessment',
        duration: '5 minutes',
        questions: 10,
        category: 'Health'
      },
      {
        id: 'DERS-18',
        name: 'DERS-18 - Emotion Regulation',
        description: 'Difficulties in Emotion Regulation Scale',
        duration: '8 minutes',
        questions: 18,
        category: 'Emotional Health'
      },
      {
        id: 'CSSRS',
        name: 'CSSRS - Suicide Risk Screening',
        description: 'Columbia-Suicide Severity Rating Scale (screener)',
        duration: '3 minutes',
        questions: 6,
        category: 'Crisis Assessment',
        warning: 'This is a screening tool. If you are in crisis, please contact emergency services or a crisis hotline immediately.'
      }
    ];

    return successResponse(
      res, 
      { assessments, total: assessments.length }, 
      'Available assessments retrieved successfully'
    );
  } catch (error) {
    console.error('Get available assessments error:', error);
    return errorResponse(
      res, 
      'Failed to retrieve available assessments',
      500
    );
  }
};

export default {
  submitAssessmentController,
  getAssessmentHistoryController,
  getAssessmentByIdController,
  getAssessmentStatsController,
  getAvailableAssessments
};
