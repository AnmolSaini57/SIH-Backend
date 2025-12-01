# Appointment Management API Documentation

## Overview
The Appointment Management API enables students to book appointments with counsellors and allows counsellors to manage their appointment schedules. Supports both in-person and online consultation modes.

## Base URL
```
http://localhost:5000/api
```

## Authentication
- **Required**: Yes - User must be logged in
- **Method**: HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- **CORS**: Requires `credentials: 'include'` in all requests

---

## Student Endpoints

### Get Available Counsellors

**Endpoint**: `GET /api/student/counsellors`

**Authorization**: Student role required

**Query Parameters**:
- `specialization` (optional): Filter by counsellor specialization

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "first_name": "Dr. Robert",
      "last_name": "Mind",
      "email": "robert.mind@greenvalley.edu",
      "specialization": "Clinical Psychology",
      "qualifications": "PhD in Clinical Psychology, Licensed Therapist",
      "available_slots": [
        {
          "day": "Monday",
          "start_time": "09:00",
          "end_time": "17:00"
        }
      ]
    }
  ]
}
```

### Book Appointment

**Endpoint**: `POST /api/student/appointments`

**Authorization**: Student role required

**Request Body**:
```json
{
  "counsellor_id": "uuid",
  "appointment_date": "2025-12-15",
  "appointment_time": "14:00",
  "reason": "Feeling anxious about upcoming exams and need coping strategies",
  "preferred_mode": "in-person"
}
```

**Validation Rules**:
- Counsellor ID: Required, valid UUID, must be from same college
- Appointment Date: Required, format YYYY-MM-DD, cannot be in the past
- Appointment Time: Required, format HH:MM (24-hour)
- Reason: Required, max 500 characters
- Preferred Mode: Required, one of `in-person` or `online`

**Success Response** (201):
```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "id": "uuid",
    "student_id": "uuid",
    "counsellor_id": "uuid",
    "appointment_date": "2025-12-15",
    "appointment_time": "14:00:00",
    "reason": "Feeling anxious about upcoming exams and need coping strategies",
    "preferred_mode": "in-person",
    "status": "pending",
    "created_at": "2025-12-01T10:30:00Z"
  }
}
```

### Get Student Appointments

**Endpoint**: `GET /api/student/appointments`

**Authorization**: Student role required

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `confirmed`, `completed`, `cancelled`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "student_id": "uuid",
        "counsellor_id": "uuid",
        "appointment_date": "2025-12-15",
        "appointment_time": "14:00:00",
        "reason": "Feeling anxious about upcoming exams",
        "preferred_mode": "in-person",
        "status": "confirmed",
        "notes": "Looking forward to meeting you",
        "counsellor": {
          "first_name": "Dr. Robert",
          "last_name": "Mind",
          "specialization": "Clinical Psychology"
        },
        "created_at": "2025-12-01T10:30:00Z",
        "updated_at": "2025-12-01T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### Cancel Appointment

**Endpoint**: `DELETE /api/student/appointments/:appointment_id`

**Authorization**: Student role required

**URL Parameters**:
- `appointment_id`: UUID of the appointment

**Success Response** (200):
```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

**Error Responses**:
- `404 Not Found`: Appointment not found
- `403 Forbidden`: Cannot cancel appointment (not owned by student or already completed)

---

## Counsellor Endpoints

### Get Counsellor Appointments

**Endpoint**: `GET /api/counsellor/appointments`

**Authorization**: Counsellor role required

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `confirmed`, `completed`, `cancelled`)
- `date` (optional): Filter by specific date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "student_id": "uuid",
        "counsellor_id": "uuid",
        "appointment_date": "2025-12-15",
        "appointment_time": "14:00:00",
        "reason": "Feeling anxious about upcoming exams",
        "preferred_mode": "in-person",
        "status": "pending",
        "student": {
          "first_name": "John",
          "last_name": "Doe",
          "roll_number": "GV-CSE-2024-055",
          "department": "Computer Science"
        },
        "created_at": "2025-12-01T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15
    }
  }
}
```

### Update Appointment Status

**Endpoint**: `PUT /api/counsellor/appointments/:appointment_id`

**Authorization**: Counsellor role required

**URL Parameters**:
- `appointment_id`: UUID of the appointment

**Request Body**:
```json
{
  "status": "confirmed",
  "notes": "Looking forward to our session. Please bring any relevant academic records."
}
```

**Validation Rules**:
- Status: Required, one of `confirmed`, `cancelled`, `completed`
- Notes: Optional, max 500 characters

**Success Response** (200):
```json
{
  "success": true,
  "message": "Appointment updated successfully",
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "notes": "Looking forward to our session. Please bring any relevant academic records.",
    "updated_at": "2025-12-01T15:00:00Z"
  }
}
```

---

## Appointment Status Flow

1. **pending** → Student books appointment
2. **confirmed** → Counsellor accepts appointment
3. **completed** → Counsellor marks appointment as done
4. **cancelled** → Either party cancels (before completion)

**Status Transitions**:
- Student can: `pending` → `cancelled`
- Counsellor can: `pending` → `confirmed|cancelled`, `confirmed` → `completed|cancelled`

---

## Common Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Appointment date cannot be in the past"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "message": "Cannot modify this appointment"
}
```

**409 Conflict**:
```json
{
  "success": false,
  "message": "Time slot already booked"
}
```

---

## Frontend Integration Example

```javascript
// Student: Book appointment
const bookAppointment = async (appointmentData) => {
  const response = await fetch('http://localhost:5000/api/student/appointments', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(appointmentData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};

// Counsellor: Update appointment
const updateAppointment = async (appointmentId, updates) => {
  const response = await fetch(
    `http://localhost:5000/api/counsellor/appointments/${appointmentId}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  return await response.json();
};

// Get appointments with filters
const getAppointments = async (role, filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(
    `http://localhost:5000/api/${role}/appointments?${params}`,
    { credentials: 'include' }
  );
  
  return await response.json();
};
```

---

## Notes

- **Tenant Isolation**: Students can only book appointments with counsellors from their college
- **Time Validation**: Appointment date/time must be in the future
- **Conflict Detection**: System prevents double-booking (same counsellor, same time)
- **Notifications**: Consider implementing email/push notifications for appointment status changes
- **Cancellation Policy**: Both parties can cancel, but completed appointments cannot be modified

---

## Postman Collection
Import: `postman/Appointment_Management_API.postman_collection.json`

All requests are pre-configured with proper cookie handling and test data.
