# Assessment API Documentation

## Overview
The Assessment API provides endpoints for students to submit mental health assessments, view their assessment history, and receive AI-powered guidance and recommendations.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Available Assessment Forms](#available-assessment-forms)
3. [API Endpoints](#api-endpoints)
4. [Frontend Requirements](#frontend-requirements)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)
7. [Example Usage](#example-usage)

---

## Authentication

All assessment endpoints require:
- **Authentication**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- **Role**: Student only
- **Tenant**: College ID automatically extracted from JWT
- **CORS**: Requires `credentials: 'include'` in all requests

```javascript
// No Authorization header needed - cookies sent automatically
fetch('http://localhost:5000/api/student/assessments', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

---

## Available Assessment Forms

| Form Type | Full Name | Questions | Duration | Category |
|-----------|-----------|-----------|----------|----------|
| `PHQ-9` | Patient Health Questionnaire-9 | 9 | 5 min | Depression |
| `GAD-7` | Generalized Anxiety Disorder-7 | 7 | 3 min | Anxiety |
| `GHQ-12` | General Health Questionnaire-12 | 12 | 5 min | General Mental Health |
| `PSS-10` | Perceived Stress Scale-10 | 10 | 5 min | Stress |
| `WHO-5` | WHO Well-Being Index | 5 | 2 min | Wellbeing |
| `IAT` | Internet Addiction Test | 20 | 8 min | Internet Addiction |
| `PSQI` | Pittsburgh Sleep Quality Index | 19 | 10 min | Sleep Quality |
| `BHI-10` | Brief Health Index-10 | 10 | 5 min | Overall Health |
| `DERS-18` | Difficulties in Emotion Regulation Scale-18 | 18 | 8 min | Emotion Regulation |
| `CSSRS` | Columbia-Suicide Severity Rating Scale | 6 | 3 min | Crisis Assessment |

---

## API Endpoints

### 1. Get Available Assessments

**GET** `/api/student/assessments/available`

Returns a list of all available assessment forms with metadata.

**Response:**
```json
{
  "success": true,
  "message": "Available assessments retrieved successfully",
  "data": {
    "assessments": [
      {
        "id": "PHQ-9",
        "name": "PHQ-9 - Depression Screening",
        "description": "Patient Health Questionnaire for depression assessment",
        "duration": "5 minutes",
        "questions": 9,
        "category": "Mental Health"
      }
      // ... more assessments
    ],
    "total": 10
  }
}
```

---

### 2. Submit Assessment

**POST** `/api/student/assessments`

Submit a completed assessment form and receive instant results with AI guidance.

**Request Body:**
```json
{
  "formType": "PHQ-9",
  "responses": {
    "q1": 2,
    "q2": 1,
    "q3": 3,
    "q4": 2,
    "q5": 1,
    "q6": 2,
    "q7": 1,
    "q8": 2,
    "q9": 0
  }
}
```

**Required Fields from Frontend:**
- `formType` (string): One of the valid form types (e.g., "PHQ-9", "GAD-7")
- `responses` (object): Key-value pairs where keys are question identifiers (q1, q2, etc.) and values are numeric scores

**Response:**
```json
{
  "success": true,
  "message": "Assessment submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "formType": "PHQ-9",
    "score": 14,
    "severityLevel": "Moderate",
    "guidance": "Your PHQ-9 assessment indicates moderate depression symptoms...",
    "recommendedActions": [
      "Contact your campus counseling center as soon as possible",
      "Practice stress-reduction techniques daily",
      "Maintain regular social connections"
    ],
    "createdAt": "2025-11-28T10:30:00.000Z"
  }
}
```

---

### 3. Get Assessment History

**GET** `/api/student/assessments`

Retrieve the student's assessment history with optional filtering.

**Query Parameters:**
- `formType` (optional): Filter by specific form type (e.g., "PHQ-9")
- `limit` (optional): Number of results to return (1-100, default: all)
- `offset` (optional): Number of results to skip for pagination (default: 0)

**Example Requests:**
```
GET /api/student/assessments
GET /api/student/assessments?formType=PHQ-9
GET /api/student/assessments?limit=10&offset=0
```

**Response:**
```json
{
  "success": true,
  "message": "Assessment history retrieved successfully",
  "data": {
    "assessments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "assessmentName": "PHQ-9",
        "date": "11/28/2025",
        "time": "10:30:00 AM",
        "score": 14,
        "severity": "Moderate",
        "responses": {
          "q1": 2,
          "q2": 1,
          // ... all responses
        }
      }
      // ... more assessments
    ],
    "count": 15,
    "filters": {
      "formType": "all",
      "limit": "all",
      "offset": 0
    }
  }
}
```

---

### 4. Get Single Assessment

**GET** `/api/student/assessments/:id`

Retrieve detailed information about a specific assessment including full guidance.

**Response:**
```json
{
  "success": true,
  "message": "Assessment retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "assessmentName": "PHQ-9",
    "date": "11/28/2025",
    "time": "10:30:00 AM",
    "score": 14,
    "severity": "Moderate",
    "responses": {
      "q1": 2,
      "q2": 1,
      // ... all responses
    },
    "guidance": "Your PHQ-9 assessment indicates moderate depression symptoms. Many college students experience similar challenges...",
    "recommendedActions": [
      "Contact your campus counseling center as soon as possible",
      "Practice stress-reduction techniques daily",
      "Maintain regular social connections",
      "Establish healthy routines"
    ]
  }
}
```

---

### 5. Get Assessment Statistics

**GET** `/api/student/assessments/stats`

Get statistical overview of all assessments taken by the student.

**Response:**
```json
{
  "success": true,
  "message": "Assessment statistics retrieved successfully",
  "data": {
    "totalAssessments": 25,
    "assessmentsByType": {
      "PHQ-9": {
        "count": 5,
        "latestScore": 12,
        "latestSeverity": "Moderate",
        "latestDate": "2025-11-28T10:30:00.000Z"
      },
      "GAD-7": {
        "count": 4,
        "latestScore": 8,
        "latestSeverity": "Mild",
        "latestDate": "2025-11-27T14:20:00.000Z"
      }
      // ... more form types
    },
    "recentAssessments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "PHQ-9",
        "score": 12,
        "severity": "Moderate",
        "date": "11/28/2025"
      }
      // ... 4 more recent assessments
    ]
  }
}
```

---

## Frontend Requirements

### Data to Send to Backend

When submitting an assessment, the frontend should provide:

1. **formType** (string): The exact form type identifier
   - Must match one of: `PHQ-9`, `GAD-7`, `GHQ-12`, `PSS-10`, `WHO-5`, `IAT`, `PSQI`, `BHI-10`, `DERS-18`, `CSSRS`

2. **responses** (object): Question responses
   ```javascript
   {
     "q1": 2,  // Question 1 answer
     "q2": 1,  // Question 2 answer
     "q3": 3,  // Question 3 answer
     // ... etc
   }
   ```

### Question Response Values

Different assessments use different scoring scales:

| Assessment | Score Range | Example |
|------------|-------------|---------|
| PHQ-9 | 0-3 per question | 0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day |
| GAD-7 | 0-3 per question | Same as PHQ-9 |
| GHQ-12 | 0-3 per question | 0=Not at all, 1=No more than usual, 2=Rather more than usual, 3=Much more than usual |
| PSS-10 | 0-4 per question | 0=Never, 1=Almost never, 2=Sometimes, 3=Fairly often, 4=Very often |
| WHO-5 | 0-5 per question | 0=At no time, 1=Some of the time, 2=Less than half, 3=More than half, 4=Most of the time, 5=All of the time |
| IAT | 1-5 per question | 1=Rarely, 2=Occasionally, 3=Frequently, 4=Often, 5=Always |
| PSQI | 0-3 per component | Varies by component |
| BHI-10 | 0-4 per question | Varies by question |
| DERS-18 | 1-5 per question | 1=Almost never, 2=Sometimes, 3=About half, 4=Most of the time, 5=Almost always |
| CSSRS | "yes"/"no" | Binary responses |

### Frontend Implementation Checklist

- [ ] Create form components for each assessment type
- [ ] Implement proper question numbering (q1, q2, q3, etc.)
- [ ] Validate all questions are answered before submission
- [ ] Show loading state during submission
- [ ] Display results (score, severity, guidance, actions) after submission
- [ ] Implement assessment history page with filtering
- [ ] Add pagination for history if more than 10-20 assessments
- [ ] Create detailed view page for individual assessments
- [ ] Add statistics dashboard showing assessment trends
- [ ] Implement crisis warning for CSSRS severe results

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful message",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## Error Handling

### Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid form type, missing responses, invalid response format |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Not a student, accessing another student's data |
| 404 | Not Found | Assessment ID doesn't exist |
| 500 | Internal Server Error | Server or database error |

### Error Examples

**Invalid Form Type:**
```json
{
  "success": false,
  "error": "Invalid form type"
}
```

**Missing Responses:**
```json
{
  "success": false,
  "error": "Responses cannot be empty"
}
```

**Assessment Not Found:**
```json
{
  "success": false,
  "error": "Assessment not found"
}
```

---

## Example Usage

### JavaScript/React Example

```javascript
// Submit Assessment
const submitAssessment = async (formType, responses) => {
  try {
    const response = await fetch('http://localhost:5000/api/student/assessments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formType: formType,
        responses: responses
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Score:', data.data.score);
      console.log('Severity:', data.data.severityLevel);
      console.log('Guidance:', data.data.guidance);
      console.log('Actions:', data.data.recommendedActions);
      // Display results to user
    } else {
      console.error('Error:', data.error);
      // Show error message to user
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Get Assessment History
const getHistory = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/student/assessments', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Assessments:', data.data.assessments);
      // Display history to user
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Example: Submit PHQ-9 Assessment
const phq9Responses = {
  q1: 2,  // Little interest or pleasure in doing things
  q2: 1,  // Feeling down, depressed, or hopeless
  q3: 3,  // Trouble falling or staying asleep
  q4: 2,  // Feeling tired or having little energy
  q5: 1,  // Poor appetite or overeating
  q6: 2,  // Feeling bad about yourself
  q7: 1,  // Trouble concentrating
  q8: 2,  // Moving or speaking slowly
  q9: 0   // Thoughts of self-harm
};

submitAssessment('PHQ-9', phq9Responses);
```

---

## Database Setup

Before using the assessment API, run the SQL file to create the necessary table:

```bash
# Execute this SQL file in your Supabase SQL editor
database/assessments_table.sql
```

---

## Environment Variables

Add the following to your `.env` file:

```env
# Google Gemini AI API Key (for AI-powered guidance)
GEMINI_API_KEY=your_gemini_api_key_here
```

To get a Gemini API key:
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add it to your `.env` file

---

## Installation

Install the required npm package:

```bash
npm install @google/generative-ai
```

---

## Notes for Frontend Developers

### Important Considerations

1. **Validation**: Always validate that all questions are answered before submission
2. **Privacy**: Assessment data is sensitive - handle with care
3. **Crisis Handling**: For CSSRS assessments with "Severe" results, show immediate crisis resources
4. **User Experience**: 
   - Show progress during form completion
   - Provide clear instructions for each question
   - Use appropriate UI for different question types (radio buttons, sliders, etc.)
5. **Accessibility**: Ensure forms are keyboard navigable and screen reader friendly

### Recommended UI Flow

1. **Assessment Selection** → List of available assessments
2. **Assessment Form** → Questions with appropriate input types
3. **Submit & Process** → Loading state while calculating
4. **Results Display** → Score, severity, guidance, and recommended actions
5. **History View** → List of past assessments with filtering
6. **Detail View** → Full details of a specific assessment

### Sample Response Data Structure

When displaying results, you'll receive:
- `score`: Numeric value (display prominently)
- `severityLevel`: Text label with color coding (Minimal=green, Mild=yellow, Moderate=orange, Severe=red)
- `guidance`: 2-3 paragraphs of personalized advice (display in readable format)
- `recommendedActions`: Array of actionable items (display as numbered list or checklist)

---

## Support

For questions or issues with the Assessment API:
- Check this documentation first
- Review error messages carefully
- Contact the backend team with specific error details
- Include request/response examples when reporting issues

---

## Version History

- **v1.0.0** (2025-11-28): Initial release
  - 10 assessment forms supported
  - AI-powered guidance via Gemini
  - Complete history tracking
  - Statistical analysis
