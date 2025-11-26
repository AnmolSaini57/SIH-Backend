import { supabase } from '../config/supabase.js';
import path from 'path';

class ResourcesService {

  async uploadResource(resourceData, file, counsellorId, collegeId) {
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = `${counsellorId}/${fileName}`;

      // Uploadingg file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('counsellor-resources')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Insert metadata into database
      const { data: resource, error: dbError } = await supabase
        .from('counsellor_resources')
        .insert([
          {
            counsellor_id: counsellorId,
            college_id: collegeId,
            resource_name: resourceData.resource_name,
            description: resourceData.description || null,
            file_path: filePath,
            file_type: fileExtension.substring(1).toLowerCase(),
            file_size: file.size,
            original_filename: file.originalname
          }
        ])
        .select()
        .single();

      if (dbError) {
        // If DB insert fails, delete the uploaded file
        await supabase.storage
          .from('counsellor-resources')
          .remove([filePath]);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      return resource;
    } catch (error) {
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
      const { data, error } = await supabase.storage
        .from('counsellor-resources')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
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
