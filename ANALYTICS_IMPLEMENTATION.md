# Assessment Analytics Implementation

## Overview
This document describes the implementation of the Assessment Analytics feature that displays real-time mental health assessment data in the Admin Dashboard.

## Features Implemented

### 1. Backend API Endpoint
**Endpoint**: `GET /api/admin/analytics/assessments`

**Location**: `src/controllers/admin.controller.js`

**Functionality**:
- Fetches all assessments for the college
- Filters to get only the latest assessment per student (avoiding duplicates)
- Calculates multiple analytics metrics:
  - **Stress Levels Over Time**: Weekly aggregates of stress-related assessments (PSS-10, PHQ-9, GAD-7)
  - **Anxiety/Depression Distribution**: Severity level breakdown (Normal, Mild, Moderate, Severe)
  - **Risk Alert Distribution**: Students categorized by risk level (Low, Medium, High)
  - **Assessment Type Breakdown**: Count of each assessment type submitted

**Response Format**:
```json
{
  "status": "success",
  "message": "Assessment analytics retrieved successfully",
  "data": {
    "stressLevels": {
      "labels": ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
      "values": [6.2, 5.8, 7.1, 6.5, 5.9],
      "average": 6.3
    },
    "anxietyDepressionDistribution": {
      "labels": ["Normal", "Mild", "Moderate", "Severe"],
      "values": [45, 28, 18, 9],
      "percentages": [45.0, 28.0, 18.0, 9.0]
    },
    "riskAlertDistribution": {
      "labels": ["Low Risk (Green)", "Medium Risk (Yellow)", "High Risk (Red)"],
      "values": [78, 15, 7],
      "colors": ["green", "yellow", "red"]
    },
    "totalStudentsAssessed": 100,
    "totalAssessments": 250,
    "assessmentTypeBreakdown": {
      "PHQ-9": 45,
      "GAD-7": 35,
      "PSS-10": 20
    }
  }
}
```

### 2. Frontend Integration
**Component**: `frontend/src/components/admin/AnalyticsModule.jsx`

**Key Features**:
- **Real-time Data Fetching**: Automatically fetches analytics data on component mount
- **Loading States**: Shows loading spinner while fetching data
- **Error Handling**: Displays error messages with retry option
- **Summary Statistics**: Shows total students assessed and total assessments
- **Three Main Charts**:
  1. **Stress Levels Over Time**: Line chart showing weekly stress trends
  2. **Anxiety/Depression Distribution**: Doughnut chart showing severity distribution
  3. **Risk Alert Distribution**: Progress bars showing risk level breakdown

**Visual Design**:
- Matches the mockup provided in the screenshot
- Color-coded risk levels (Green, Yellow, Red)
- Responsive grid layout
- Clean card-based design with shadows

### 3. Data Processing Logic

#### Latest Assessment Per Student
```javascript
// Groups assessments by student_id and keeps only the most recent one
const latestAssessmentsByStudent = {};
assessments.forEach(assessment => {
  if (!latestAssessmentsByStudent[assessment.student_id]) {
    latestAssessmentsByStudent[assessment.student_id] = assessment;
  }
});
```

#### Weekly Stress Aggregation
- Creates 5 weekly buckets (last 5 weeks)
- Filters stress-related assessments (PSS-10, PHQ-9, GAD-7)
- Calculates average score per week
- Normalizes scores to 0-10 scale

#### Risk Level Categorization
- **Low Risk**: Normal or Minimal severity
- **Medium Risk**: Mild or Moderate severity
- **High Risk**: Severe severity

## Setup Instructions

### Backend Setup
1. The endpoint is already added to `src/routes/admin.routes.js`
2. The controller function is in `src/controllers/admin.controller.js`
3. No database migrations needed - uses existing `assessments` table

### Frontend Setup
1. Updated `AnalyticsModule.jsx` to fetch real data
2. Uses `VITE_API_URL` environment variable for API endpoint
3. Requires admin authentication (uses token from localStorage)

### Testing
1. Ensure students have submitted assessments
2. Login as admin
3. Navigate to Analytics page
4. Data should display automatically

## Database Requirements

The implementation relies on the existing `assessments` table with the following columns:
- `id`: UUID (primary key)
- `student_id`: UUID (foreign key to profiles)
- `college_id`: UUID (for multi-tenancy)
- `form_type`: Text (assessment type: PHQ-9, GAD-7, etc.)
- `score`: Integer (calculated assessment score)
- `severity_level`: Text (Normal, Mild, Moderate, Severe)
- `responses`: JSONB (student responses)
- `created_at`: Timestamp

## API Authentication

The endpoint requires:
- Valid JWT token in Authorization header
- Admin role verification (handled by middleware)
- College ID matching (tenant isolation)

## Performance Considerations

1. **Query Optimization**: Uses single query to fetch all assessments, then processes in memory
2. **Data Caching**: Consider adding Redis caching for large datasets
3. **Pagination**: Current implementation loads all data; may need pagination for colleges with 1000+ students

## Future Enhancements

1. **Date Range Filters**: Allow admins to select custom date ranges
2. **Export Functionality**: Download analytics as PDF/CSV
3. **Real-time Updates**: WebSocket integration for live data updates
4. **Drill-down**: Click on charts to see individual student details (with privacy controls)
5. **Comparison Views**: Compare current period with previous period
6. **Alert Notifications**: Automatic notifications when high-risk students are detected

## Security & Privacy

- Only admins within the same college can access analytics
- Individual student identities are not exposed in aggregated views
- Follows HIPAA-style privacy guidelines for mental health data
- All data is scoped to college_id (multi-tenant isolation)

## Testing Checklist

- [ ] Backend endpoint returns correct data format
- [ ] Frontend displays loading state
- [ ] Error handling works (network errors, auth errors)
- [ ] Charts render correctly with real data
- [ ] Charts handle edge cases (no data, single data point)
- [ ] Mobile responsive design
- [ ] Color schemes match theme (light/dark mode)
- [ ] Performance is acceptable with 100+ students

## Troubleshooting

### No Data Showing
- Check if students have submitted assessments
- Verify admin has correct college_id
- Check browser console for API errors
- Verify token is valid in localStorage

### Incorrect Analytics
- Verify assessment scoring logic in `assessment.service.js`
- Check severity level mapping
- Ensure created_at timestamps are correct

### Performance Issues
- Add database indexes on `college_id` and `created_at`
- Implement caching layer
- Consider pagination for large datasets

## API Endpoint Summary

```
GET /api/admin/analytics/assessments
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "success",
  "data": { ... analytics object ... }
}
```

## Files Modified

1. **Backend**:
   - `src/controllers/admin.controller.js` - Added `getAssessmentAnalytics` function
   - `src/routes/admin.routes.js` - Added analytics route

2. **Frontend**:
   - `frontend/src/components/admin/AnalyticsModule.jsx` - Updated to fetch and display real data

## Dependencies

No new dependencies required. Uses existing:
- Supabase for database queries
- React hooks (useState, useEffect)
- Existing chart components (LineChart, DoughnutChart)
