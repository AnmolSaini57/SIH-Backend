import { supabase } from '../src/config/supabase.js';

/**
 * Setup script for counsellor-resources storage bucket
 * This creates the bucket and sets up proper RLS policies
 */

async function setupStorageBucket() {
  console.log('🔧 Setting up counsellor-resources storage bucket...');

  try {
    // 1. Check if bucket exists, if not create it
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets.some(b => b.name === 'counsellor-resources');

    if (!bucketExists) {
      console.log('📦 Creating counsellor-resources bucket...');
      const { data: bucket, error: createError } = await supabase.storage.createBucket('counsellor-resources', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'video/mp4',
          'image/jpeg',
          'image/png',
          'text/plain'
        ]
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }
      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ Bucket already exists');
    }

    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('════════════════════════════════════════════════════════════');
    console.log('Go to your Supabase Dashboard:');
    console.log('1. Navigate to Storage > counsellor-resources');
    console.log('2. Click on "Policies" tab');
    console.log('3. Add the following policies:\n');
    
    console.log('Policy 1: Allow Service Role to Upload');
    console.log('─────────────────────────────────────');
    console.log('Policy Name: Service role can upload');
    console.log('Allowed operation: INSERT');
    console.log('Target roles: service_role');
    console.log('Policy definition:');
    console.log('  (bucket_id = \'counsellor-resources\'::text)\n');
    
    console.log('SQL to run in SQL Editor:');
    console.log('─────────────────────────────────────');
    console.log(`
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can upload
CREATE POLICY "Service role can upload to counsellor-resources"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'counsellor-resources');

-- Policy: Service role can update
CREATE POLICY "Service role can update counsellor-resources"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'counsellor-resources');

-- Policy: Service role can delete
CREATE POLICY "Service role can delete from counsellor-resources"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'counsellor-resources');

-- Policy: Service role can select
CREATE POLICY "Service role can select from counsellor-resources"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'counsellor-resources');

-- Policy: Authenticated users can view their own resources
CREATE POLICY "Users can view counsellor resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'counsellor-resources');
`);
    
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('After running the SQL above, your storage bucket will be ready! 🚀');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupStorageBucket();
