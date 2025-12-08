import { supabase, supabaseAdmin } from '../config/supabase.js';
import path from 'path';

class ResourcesService {

  async uploadResource(resourceData, file, counsellorId, collegeId) {
    try {
      console.log('[ResourcesService] Starting upload:', {
        counsellorId,
        collegeId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      });

      // Generate unique file path
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = `${counsellorId}/${fileName}`;

      console.log('[ResourcesService] Uploading to storage:', filePath);

      // Upload file to Supabase Storage using admin client
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('counsellor-resources')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
          duplex: 'half'
        });

      if (uploadError) {
        console.error('[ResourcesService] Storage upload error:', uploadError);
        console.error('[ResourcesService] Upload error details:', JSON.stringify(uploadError, null, 2));
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      console.log('[ResourcesService] Storage upload successful:', uploadData);

      console.log('[ResourcesService] Storage upload successful:', uploadData);

      // Get public URL for the file
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('counsellor-resources')
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData?.publicUrl || null;
      console.log('[ResourcesService] Public URL generated:', fileUrl);

      // Insert metadata into database using admin client to bypass RLS
      const insertData = {
        counsellor_id: counsellorId,
        college_id: collegeId,
        resource_name: resourceData.resource_name,
        description: resourceData.description || null,
        file_url: fileUrl,
        file_path: filePath,
        file_type: fileExtension.substring(1).toLowerCase(),
        file_size: file.size,
        original_filename: file.originalname
      };

      console.log('[ResourcesService] Inserting to database:', insertData);

      const { data: resource, error: dbError } = await supabaseAdmin
        .from('counsellor_resources')
        .insert([insertData])
        .select()
        .single();

      if (dbError) {
        console.error('[ResourcesService] Database insert error:', dbError);
        console.error('[ResourcesService] DB error details:', JSON.stringify(dbError, null, 2));
        // If DB insert fails, delete the uploaded file
        await supabaseAdmin.storage
          .from('counsellor-resources')
          .remove([filePath]);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      console.log('[ResourcesService] Resource created successfully:', resource);
      console.log('[ResourcesService] Resource created successfully:', resource);
      return resource;
    } catch (error) {
      console.error('[ResourcesService] Upload resource error:', error);
      console.error('[ResourcesService] Error stack:', error.stack);
      throw error;
    }
  }

  async getCounsellorResources(counsellorId, filters = {}) {
    try {
      let query = supabase
        .from('counsellor_resources')
        .select('*')
        .eq('counsellor_id', counsellorId)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`resource_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.file_type) {
        query = query.eq('file_type', filters.file_type);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch resources: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Note: listing by college is intentionally omitted per requirements

  async getResourceById(resourceId, userId) {
    try {
      const { data, error } = await supabase
        .from('counsellor_resources')
        .select('*')
        .eq('id', resourceId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch resource: ${error.message}`);
      }

      if (!data) {
        throw new Error('Resource not found');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateResource(resourceId, counsellorId, updates) {
    try {
      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('counsellor_resources')
        .select('*')
        .eq('id', resourceId)
        .eq('counsellor_id', counsellorId)
        .single();

      if (fetchError || !existing) {
        throw new Error('Resource not found or unauthorized');
      }

      // Update only allowed fields
      const allowedUpdates = {
        resource_name: updates.resource_name,
        description: updates.description
      };

      const { data, error } = await supabase
        .from('counsellor_resources')
        .update(allowedUpdates)
        .eq('id', resourceId)
        .eq('counsellor_id', counsellorId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update resource: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async deleteResource(resourceId, counsellorId) {
    try {
      // Get resource details for file deletion
      const { data: resource, error: fetchError } = await supabase
        .from('counsellor_resources')
        .select('*')
        .eq('id', resourceId)
        .eq('counsellor_id', counsellorId)
        .single();

      if (fetchError || !resource) {
        throw new Error('Resource not found or unauthorized');
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('counsellor-resources')
        .remove([resource.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with DB deletion even if storage fails
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('counsellor_resources')
        .delete()
        .eq('id', resourceId)
        .eq('counsellor_id', counsellorId);

      if (deleteError) {
        throw new Error(`Failed to delete resource: ${deleteError.message}`);
      }

      return { success: true, message: 'Resource deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async getDownloadUrl(filePath, expiresIn = 3600) {
    try {
      // Try to create signed URL first
      const { data, error } = await supabase.storage
        .from('counsellor-resources')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Signed URL error:', error);
        // Fallback to public URL if signed URL fails
        const { data: publicUrlData } = supabase.storage
          .from('counsellor-resources')
          .getPublicUrl(filePath);
        
        if (publicUrlData?.publicUrl) {
          console.log('Using public URL as fallback');
          return publicUrlData.publicUrl;
        }
        
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Get download URL error:', error);
      throw error;
    }
  }


  async getCounsellorStats(counsellorId) {
    try {
      const { data, error } = await supabase
        .from('counsellor_resources')
        .select('file_type, file_size')
        .eq('counsellor_id', counsellorId);

      if (error) {
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }

      const stats = {
        total_resources: data.length,
        total_size_bytes: data.reduce((sum, r) => sum + (r.file_size || 0), 0),
        by_type: {}
      };

      // Group by file type
      data.forEach(resource => {
        if (!stats.by_type[resource.file_type]) {
          stats.by_type[resource.file_type] = 0;
        }
        stats.by_type[resource.file_type]++;
      });

      return stats;
    } catch (error) {
      throw error;
    }
  }
}

export default new ResourcesService();
