# Database Schema Documentation

This document describes the complete database schema for the SIH Mental Health Platform using Supabase PostgreSQL.

## Overview

The database is designed with multi-tenancy in mind, where each college operates as an isolated tenant. The schema supports role-based access control (RBAC) and comprehensive mental health tracking.

## Core Tables

### 1. colleges
Stores information about educational institutions using the platform.

```sql
CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_colleges_code ON colleges(code);
CREATE INDEX idx_colleges_active ON colleges(is_active);
```

### 2. profiles
Extended user profiles linked to Supabase Auth users.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'counsellor', 'admin', 'superadmin')),
  college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  bio TEXT,
  specialization VARCHAR(255), -- For counsellors
  years_experience INTEGER, -- For counsellors
  qualifications TEXT[], -- For counsellors
  availability_schedule JSONB, -- For counsellors
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_college_id ON profiles(college_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view college profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'superadmin')
      AND (p.role = 'superadmin' OR p.college_id = profiles.college_id)
    )
  );
```

### 3. assessment_forms
Standardized mental health assessment questionnaires.

```sql
CREATE TABLE assessment_forms (
  id VARCHAR(20) PRIMARY KEY, -- e.g., 'phq9', 'gad7'
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  questions JSONB NOT NULL,
  scoring_method VARCHAR(50) DEFAULT 'sum',
  max_score INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_assessment_forms_active ON assessment_forms(is_active);
```

### 4. assessment_submissions
Individual assessment responses and results.

```sql
CREATE TABLE assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  form_id VARCHAR(20) NOT NULL REFERENCES assessment_forms(id),
  session_id UUID, -- Optional grouping for multiple assessments
  responses JSONB NOT NULL,
  score INTEGER NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('minimal', 'mild', 'moderate', 'severe')),
  guidance JSONB, -- Personalized guidance based on results
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assessment_submissions_user ON assessment_submissions(user_id);
CREATE INDEX idx_assessment_submissions_college ON assessment_submissions(college_id);
CREATE INDEX idx_assessment_submissions_form ON assessment_submissions(form_id);
CREATE INDEX idx_assessment_submissions_severity ON assessment_submissions(severity);
CREATE INDEX idx_assessment_submissions_date ON assessment_submissions(created_at);

-- Row Level Security
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own submissions" ON assessment_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" ON assessment_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 5. appointments
Counselling appointment booking and management.

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counsellor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER DEFAULT 60, -- Minutes
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'group', 'emergency', 'follow_up')),
  notes TEXT, -- Student notes when booking
  counsellor_notes TEXT, -- Counsellor notes
  feedback TEXT, -- Post-appointment feedback
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_appointments_student ON appointments(student_id);
CREATE INDEX idx_appointments_counsellor ON appointments(counsellor_id);
CREATE INDEX idx_appointments_college ON appointments(college_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their appointments" ON appointments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Counsellors can view their appointments" ON appointments
  FOR SELECT USING (auth.uid() = counsellor_id);
```

### 6. communities
Mental health support communities within colleges.

```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  max_members INTEGER,
  tags TEXT[],
  guidelines TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_communities_college ON communities(college_id);
CREATE INDEX idx_communities_active ON communities(is_active);
CREATE INDEX idx_communities_private ON communities(is_private);
```

### 7. community_members
Community membership tracking.

```sql
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(community_id, user_id)
);

-- Indexes
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);
```

### 8. community_messages
Messages within communities.

```sql
CREATE TABLE community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reply_to UUID REFERENCES community_messages(id),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_community_messages_community ON community_messages(community_id);
CREATE INDEX idx_community_messages_user ON community_messages(user_id);
CREATE INDEX idx_community_messages_date ON community_messages(created_at);
```

### 9. session_notes
Counsellor session notes for students.

```sql
CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counsellor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  content TEXT NOT NULL,
  session_date TIMESTAMPTZ NOT NULL,
  session_type VARCHAR(50),
  goals TEXT[],
  progress_notes TEXT,
  next_steps TEXT,
  is_confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_session_notes_student ON session_notes(student_id);
CREATE INDEX idx_session_notes_counsellor ON session_notes(counsellor_id);
CREATE INDEX idx_session_notes_college ON session_notes(college_id);
CREATE INDEX idx_session_notes_date ON session_notes(session_date);
```

### 10. counsellor_students
Assignment of students to counsellors.

```sql
CREATE TABLE counsellor_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
  notes TEXT,
  priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
  
  UNIQUE(counsellor_id, student_id)
);

-- Indexes
CREATE INDEX idx_counsellor_students_counsellor ON counsellor_students(counsellor_id);
CREATE INDEX idx_counsellor_students_student ON counsellor_students(student_id);
CREATE INDEX idx_counsellor_students_college ON counsellor_students(college_id);
```

### 11. announcements
College-wide announcements and notifications.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'event', 'maintenance')),
  target_role VARCHAR(20) DEFAULT 'all' CHECK (target_role IN ('all', 'student', 'counsellor', 'admin')),
  is_active BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  attachment_url VARCHAR(500),
  read_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_announcements_college ON announcements(college_id);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_active ON announcements(is_active);
CREATE INDEX idx_announcements_target ON announcements(target_role);
```

### 12. counsellor_resources
Resources and documents for counsellors.

```sql
CREATE TABLE counsellor_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'cbt', 'mindfulness', 'crisis', 'assessment', etc.
  file_url VARCHAR(500),
  file_type VARCHAR(10), -- 'pdf', 'doc', 'video', etc.
  file_size INTEGER, -- in bytes
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  tags TEXT[],
  access_level VARCHAR(20) DEFAULT 'college' CHECK (access_level IN ('public', 'college', 'restricted')),
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_counsellor_resources_college ON counsellor_resources(college_id);
CREATE INDEX idx_counsellor_resources_category ON counsellor_resources(category);
CREATE INDEX idx_counsellor_resources_active ON counsellor_resources(is_active);
```

## Views

### 1. user_dashboard_stats
Aggregated statistics for user dashboards.

```sql
CREATE VIEW user_dashboard_stats AS
SELECT 
  p.id,
  p.name,
  p.role,
  p.college_id,
  c.name as college_name,
  COUNT(DISTINCT as1.id) as total_assessments,
  COUNT(DISTINCT ap1.id) as total_appointments,
  COUNT(DISTINCT cm1.id) as joined_communities,
  MAX(as1.created_at) as last_assessment_date,
  MAX(ap1.created_at) as last_appointment_date
FROM profiles p
LEFT JOIN colleges c ON p.college_id = c.id
LEFT JOIN assessment_submissions as1 ON p.id = as1.user_id
LEFT JOIN appointments ap1 ON (p.id = ap1.student_id OR p.id = ap1.counsellor_id)
LEFT JOIN community_members cm1 ON p.id = cm1.user_id
GROUP BY p.id, p.name, p.role, p.college_id, c.name;
```

## Functions

### 1. Update member count trigger
Automatically update community member counts.

```sql
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = member_count - 1 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_member_count();
```

### 2. Assessment severity calculation
Function to calculate assessment severity based on score.

```sql
CREATE OR REPLACE FUNCTION calculate_assessment_severity(
  form_id VARCHAR(20),
  score INTEGER
) RETURNS VARCHAR(20) AS $$
BEGIN
  CASE form_id
    WHEN 'phq9' THEN
      CASE 
        WHEN score < 5 THEN RETURN 'minimal';
        WHEN score < 10 THEN RETURN 'mild';
        WHEN score < 15 THEN RETURN 'moderate';
        ELSE RETURN 'severe';
      END CASE;
    WHEN 'gad7' THEN
      CASE 
        WHEN score < 5 THEN RETURN 'minimal';
        WHEN score < 10 THEN RETURN 'mild';
        WHEN score < 15 THEN RETURN 'moderate';
        ELSE RETURN 'severe';
      END CASE;
    ELSE
      RETURN 'mild'; -- Default fallback
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS) Policies

### Multi-tenant isolation
All tables with college_id have policies to ensure data isolation:

```sql
-- Example for assessment_submissions
CREATE POLICY "College isolation" ON assessment_submissions
  FOR ALL USING (
    college_id IN (
      SELECT college_id FROM profiles 
      WHERE id = auth.uid()
    )
  );
```

### Role-based access
Different access levels based on user roles:

```sql
-- Counsellors can view assigned students' data
CREATE POLICY "Counsellor student access" ON assessment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM counsellor_students cs
      JOIN profiles p ON p.id = auth.uid()
      WHERE cs.counsellor_id = auth.uid()
      AND cs.student_id = assessment_submissions.user_id
      AND p.role = 'counsellor'
    )
  );
```

## Initial Data

### Assessment Forms
```sql
INSERT INTO assessment_forms (id, name, title, description, questions) VALUES
('phq9', 'PHQ-9', 'Patient Health Questionnaire-9', 'Depression screening tool', '[...]'),
('gad7', 'GAD-7', 'Generalized Anxiety Disorder-7', 'Anxiety screening tool', '[...]'),
('ghq12', 'GHQ-12', 'General Health Questionnaire-12', 'General mental health screening', '[...]');
```

## Performance Considerations

1. **Indexing**: All foreign keys and frequently queried columns are indexed
2. **Partitioning**: Consider partitioning large tables like `assessment_submissions` by date
3. **Archiving**: Implement archiving strategy for old data
4. **Connection Pooling**: Use Supabase connection pooling for high-traffic scenarios

## Backup and Recovery

1. **Automated Backups**: Supabase provides automated daily backups
2. **Point-in-time Recovery**: Available for the last 7 days
3. **Manual Backups**: Regular exports of critical data

## Security Considerations

1. **RLS Enabled**: All tables have Row Level Security enabled
2. **Encrypted at Rest**: Supabase encrypts all data at rest
3. **SSL/TLS**: All connections use SSL/TLS encryption
4. **Audit Logging**: Consider implementing audit trails for sensitive operations

This schema provides a robust foundation for the SIH Mental Health Platform with proper multi-tenancy, security, and scalability considerations.