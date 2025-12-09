-- Performance indexes for appointments and availability
-- Safe to run multiple times (IF NOT EXISTS)

-- Speed up counsellor request/sessions lookups by counsellor, college, status, date/time
CREATE INDEX IF NOT EXISTS idx_appointments_counsellor_college_status_date_start
  ON appointments (counsellor_id, college_id, status, date, start_time);

-- Speed up student appointment lookups by student, college, status, date/time
CREATE INDEX IF NOT EXISTS idx_appointments_student_college_status_date_start
  ON appointments (student_id, college_id, status, date, start_time);

-- Speed up generic date/time queries within a college (booking conflict checks)
CREATE INDEX IF NOT EXISTS idx_appointments_college_date_start
  ON appointments (college_id, date, start_time);

-- Speed up availability fetch and slot existence checks
CREATE INDEX IF NOT EXISTS idx_counsellor_availability_main
  ON counsellor_availability (counsellor_id, college_id, date, is_active, start_time);

-- Speed up filtering counsellors by college/role
CREATE INDEX IF NOT EXISTS idx_profiles_college_role
  ON profiles (college_id, role);
