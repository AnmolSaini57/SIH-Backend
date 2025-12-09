import { supabase } from '../src/config/supabase.js';

/**
 * Setup script for memory-wall storage bucket
 * This creates the bucket and provides SQL for RLS policies
 * Run: node scripts/setupMemoryWallBucket.js
 */

async function setupMemoryWallBucket() {
  console.log('🔧 Setting up memory-wall storage bucket...');

  try {
    // 1. Check if bucket exists, if not create it
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets.some(b => b.name === 'memory-wall');

    if (!bucketExists) {
      console.log('📦 Creating memory-wall bucket...');
      const { data: bucket, error: createError } = await supabase.storage.createBucket('memory-wall', {
        public: true, // Photos should be publicly accessible via URL
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/heic',
          'image/heif'
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
    console.log('1. Navigate to Storage > memory-wall');
    console.log('2. Click on "Policies" tab');
    console.log('3. Run the following SQL in the SQL Editor:\n');
    
    console.log('SQL to run in SQL Editor:');
    console.log('─────────────────────────────────────');
    console.log(`
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can INSERT (upload photos)
CREATE POLICY "Service role can upload to memory-wall"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'memory-wall');

-- Policy: Service role can UPDATE
CREATE POLICY "Service role can update memory-wall"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'memory-wall');

-- Policy: Service role can DELETE (when memory is deleted)
CREATE POLICY "Service role can delete from memory-wall"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'memory-wall');

-- Policy: Service role can SELECT
CREATE POLICY "Service role can select from memory-wall"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'memory-wall');

-- Policy: Public can view photos (for public URLs to work)
CREATE POLICY "Public can view memory-wall photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'memory-wall');

-- Policy: Authenticated users can view their own photos
CREATE POLICY "Students can view their memory photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'memory-wall'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
`);

    console.log('\n✅ Setup instructions displayed above');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log('📝 NOTES:');
    console.log('- The bucket is set to PUBLIC for photo URLs to work');
    console.log('- Photos are organized by: {college_id}/{student_id}/{filename}');
    console.log('- Backend uses SUPABASE_SERVICE_KEY for all operations (no RLS needed)');
    console.log('- Authorization handled by auth middleware + httpOnly cookies');
    console.log('- Max file size: 10MB per photo');
    console.log('- Allowed formats: JPG, PNG, GIF, WebP, HEIC, HEIF');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupMemoryWallBucket()
  .then(() => {
    console.log('\n✅ Setup process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
