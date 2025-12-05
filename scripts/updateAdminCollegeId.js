import { supabase } from '../src/config/supabase.js';

/**
 * Update admin user's college_id in profiles table
 */

const TARGET_COLLEGE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ADMIN_EMAIL = 'admin@greenvalley.edu';

async function updateAdminProfile() {
  console.log('🔧 Updating admin profile with college_id...\n');

  try {
    // First, find the admin user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError.message);
      process.exit(1);
    }

    const adminUser = users.users.find(u => u.email === ADMIN_EMAIL);
    
    if (!adminUser) {
      console.error(`❌ Admin user not found: ${ADMIN_EMAIL}`);
      process.exit(1);
    }

    console.log(`✅ Found admin user: ${adminUser.email} (${adminUser.id})\n`);

    // Update the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ college_id: TARGET_COLLEGE_ID })
      .eq('id', adminUser.id)
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to update profile:', profileError.message);
      process.exit(1);
    }

    console.log('✅ Profile updated successfully!');
    console.log('   User ID:', profile.id);
    console.log('   Email:', profile.email);
    console.log('   Name:', profile.name);
    console.log('   Role:', profile.role);
    console.log('   College ID:', profile.college_id);
    console.log('\n🎉 Admin profile updated! Please refresh the frontend.');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateAdminProfile();
