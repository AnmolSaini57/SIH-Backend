import { supabase } from '../src/config/supabase.js';

/**
 * Fix college_id mismatch for test users
 * Sets all users to use the same college_id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
 */

const TARGET_COLLEGE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const TEST_USERS = [
  { email: 'admin@greenvalley.edu', role: 'admin' },
  { email: 'john.student@greenvalley.edu', role: 'student' },
  { email: 'dr.sarah@greenvalley.edu', role: 'counsellor' },
];

async function updateUserMetadata(userId, email, role) {
  try {
    // Update user metadata in Supabase Auth
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: role,
        college_id: TARGET_COLLEGE_ID,
      },
    });

    if (error) {
      console.error(`❌ Failed to update user metadata for ${email}:`, error.message);
      return false;
    }

    // Also update the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ college_id: TARGET_COLLEGE_ID })
      .eq('id', userId);

    if (profileError) {
      console.error(`❌ Failed to update profile for ${email}:`, profileError.message);
      return false;
    }

    console.log(`✅ Updated ${email} (${role}) with college_id: ${TARGET_COLLEGE_ID}`);
    return true;
  } catch (err) {
    console.error(`❌ Error updating ${email}:`, err.message);
    return false;
  }
}

async function fixCollegeIds() {
  console.log('🔧 Starting college_id fix for test users...\n');
  console.log(`Target college_id: ${TARGET_COLLEGE_ID}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of TEST_USERS) {
    // Find user by email
    const { data: userData, error: fetchError } = await supabase.auth.admin.listUsers();

    if (fetchError) {
      console.error('❌ Failed to fetch users:', fetchError.message);
      continue;
    }

    const foundUser = userData.users.find((u) => u.email === user.email);

    if (!foundUser) {
      console.log(`⚠️  User not found: ${user.email}`);
      failCount++;
      continue;
    }

    console.log(`📧 Found user: ${user.email} (${foundUser.id})`);
    console.log(`   Current college_id: ${foundUser.user_metadata?.college_id || 'NOT SET'}`);

    const success = await updateUserMetadata(foundUser.id, user.email, user.role);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Successfully updated: ${successCount} users`);
  console.log(`❌ Failed to update: ${failCount} users`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (successCount > 0) {
    console.log('⚠️  IMPORTANT: Users need to log out and log back in for changes to take effect!');
    console.log('   The new college_id will be in their JWT tokens after re-login.\n');
  }

  // Also update communities table to use the target college_id
  console.log('🔧 Updating existing communities to use the target college_id...\n');
  
  const { data: communities, error: commError } = await supabase
    .from('communities')
    .select('id, title, college_id')
    .neq('college_id', TARGET_COLLEGE_ID);

  if (commError) {
    console.error('❌ Failed to fetch communities:', commError.message);
  } else if (communities.length === 0) {
    console.log('✅ All communities already have the correct college_id');
  } else {
    console.log(`Found ${communities.length} communities with different college_id:\n`);
    
    for (const comm of communities) {
      console.log(`   - ${comm.title} (${comm.id})`);
      console.log(`     Old college_id: ${comm.college_id}`);
      
      const { error: updateError } = await supabase
        .from('communities')
        .update({ college_id: TARGET_COLLEGE_ID })
        .eq('id', comm.id);

      if (updateError) {
        console.error(`     ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`     ✅ Updated to: ${TARGET_COLLEGE_ID}`);
      }
      console.log('');
    }
  }

  console.log('🎉 College ID fix completed!');
  process.exit(0);
}

fixCollegeIds().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
