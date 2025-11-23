import { supabase, supabaseAdmin } from '../src/config/supabase.js';

/*
 Seed script to create Auth users, profiles, and role-extension rows.
 Usage:
   node scripts/seedUsers.js
 Requirements:
   - SUPABASE_SERVICE_ROLE_KEY in environment (for supabaseAdmin)
   - Do NOT run in production without adjusting passwords.

 Flow per user:
   1. Create auth user (supabaseAdmin.auth.admin.createUser)
   2. Insert profile row into public.profiles
   3. Insert into role-specific table (admins / counsellors / students) if needed

 If any step after user creation fails, user is deleted for consistency.
*/

const users = [
  { email: 'sara.root@platform.com', password: 'Test@12345', name: 'Sara Root', role: 'superadmin', college_id: null },
  { email: 'alice.admin@greenvalley.edu', password: 'Test@12345', name: 'Alice Admin', role: 'admin', college_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', position: 'Student Affairs Coordinator' },
  { email: 'robert.mind@greenvalley.edu', password: 'Test@12345', name: 'Dr. Robert Mind', role: 'counsellor', college_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', specialization: 'Anxiety, Stress Management' },
  { email: 'elena.calm@horizon.edu', password: 'Test@12345', name: 'Dr. Elena Calm', role: 'counsellor', college_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', specialization: 'Depression Recovery' },
  { email: 'john.student@greenvalley.edu', password: 'Test@12345', name: 'John Student', role: 'student', college_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', anonymous_username: 'anon_john_01', year: 1, branch: 'CSE', roll_no: 'GV-CSE-2025-001' },
  { email: 'meera.learner@greenvalley.edu', password: 'Test@12345', name: 'Meera Learner', role: 'student', college_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', anonymous_username: 'anon_meera_02', year: 2, branch: 'ME', roll_no: 'GV-ME-2024-044' },
  { email: 'alex.horizon@horizon.edu', password: 'Test@12345', name: 'Alex Horizon', role: 'student', college_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', anonymous_username: 'anon_alex_03', year: 3, branch: 'ECE', roll_no: 'HZ-ECE-2023-010' }
];

// Idempotent college seed (upsert by fixed UUIDs used above)
const colleges = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Green Valley College' },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Horizon Institute' }
];

async function createAuthUser(u) {
  return supabaseAdmin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: {
      name: u.name,
      role: u.role,
      college_id: u.college_id || null
    }
  });
}

async function insertProfile(userId, u) {
  return supabase.from('profiles').insert({
    id: userId,
    email: u.email,
    name: u.name,
    role: u.role,
    college_id: u.role === 'superadmin' ? null : u.college_id,
    created_at: new Date().toISOString()
  });
}

async function insertRoleExtension(userId, u) {
  switch (u.role) {
    case 'admin':
      return supabase.from('admins').insert({ id: userId, position: u.position || null });
    case 'counsellor':
      return supabase.from('counsellors').insert({ id: userId, specialization: u.specialization || null });
    case 'student':
      return supabase.from('students').insert({
        id: userId,
        anonymous_username: u.anonymous_username,
        year: u.year,
        branch: u.branch,
        roll_no: u.roll_no
      });
    default:
      return { error: null }; // superadmin has no extension table
  }
}

async function seed() {
  console.log('Starting seed...');

  // Seed colleges first so foreign keys succeed
  console.log('\nUpserting colleges...');
  const { error: collegeError } = await supabase
    .from('colleges')
    .upsert(colleges, { onConflict: 'id' });
  if (collegeError) {
    console.error('College upsert error:', collegeError.message);
    throw new Error('Failed to seed colleges; aborting user seed');
  }
  console.log('Colleges ready. Proceeding with users...');

  console.log('\nStarting user seed...');
  for (const u of users) {
    console.log(`\nProcessing ${u.email} (${u.role})`);
    const { data, error } = await createAuthUser(u);
    if (error) {
      console.error('Auth create error:', error.message);
      continue;
    }
    const userId = data.user.id;

    const { error: profileError } = await insertProfile(userId, u);
    if (profileError) {
      console.error('Profile insert error:', profileError.message);
      console.log('Rolling back auth user...');
      await supabaseAdmin.auth.admin.deleteUser(userId);
      continue;
    }

    const { error: extError } = await insertRoleExtension(userId, u);
    if (extError) {
      console.error('Role extension insert error:', extError.message);
      console.log('Rolling back profile + auth user...');
      await supabase.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      continue;
    }

    console.log(`✅ Seeded ${u.role} ${u.email} (id: ${userId})`);
  }
  console.log('\nSeeding complete.');
}

seed().catch(e => {
  console.error('Seed script fatal error:', e);
  process.exit(1);
});
