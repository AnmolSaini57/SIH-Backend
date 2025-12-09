import { supabase, supabaseAdmin } from '../config/supabase.js';
import path from 'path';

/**
 * Memory Wall Service
 * Handles business logic for student memory wall operations
 * Includes photo upload to Supabase storage and database operations
 */
class MemoryWallService {

  /**
   * Create a new memory with photo upload
   * @param {Object} memoryData - Memory data (title, date, description)
   * @param {Object} file - Multer file object
   * @param {string} studentId - Student's user ID
   * @param {string} collegeId - College ID for multi-tenancy
   * @returns {Object} Created memory record
   */
  async createMemory(memoryData, file, studentId, collegeId) {
    try {
      console.log('[MemoryWallService] Starting memory creation:', {
        studentId,
        collegeId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      });

      // Generate unique file path
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `${collegeId}/${studentId}/${fileName}`;

      console.log('[MemoryWallService] Uploading photo to storage:', filePath);

      // Upload photo to Supabase Storage (memory-wall bucket)
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('memory-wall')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
          duplex: 'half'
        });

      if (uploadError) {
        console.error('[MemoryWallService] Storage upload error:', uploadError);
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      console.log('[MemoryWallService] Photo upload successful:', uploadData);

      // Get public URL for the photo
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('memory-wall')
        .getPublicUrl(filePath);

      const photoUrl = publicUrlData?.publicUrl || null;
      console.log('[MemoryWallService] Public URL generated:', photoUrl);

      // Insert memory record into database
      const insertData = {
        student_id: studentId,
        college_id: collegeId,
        photo_url: photoUrl,
        title: memoryData.title.trim(),
        date: memoryData.date,
        description: memoryData.description ? memoryData.description.trim() : null
      };

      console.log('[MemoryWallService] Inserting to database:', insertData);

      const { data: memory, error: dbError } = await supabaseAdmin
        .from('memory_wall')
        .insert([insertData])
        .select()
        .single();

      if (dbError) {
        console.error('[MemoryWallService] Database insert error:', dbError);
        // If DB insert fails, delete the uploaded photo
        await supabaseAdmin.storage
          .from('memory-wall')
          .remove([filePath]);
        throw new Error(`Failed to save memory: ${dbError.message}`);
      }

      console.log('[MemoryWallService] Memory created successfully:', memory);
      return memory;
    } catch (error) {
      console.error('[MemoryWallService] Create memory error:', error);
      throw error;
    }
  }

  /**
   * Get all memories for a student
   * @param {string} studentId - Student's user ID
   * @param {string} collegeId - College ID for multi-tenancy
   * @param {Object} filters - Optional filters (search, startDate, endDate)
   * @returns {Array} List of memories
   */
  async getStudentMemories(studentId, collegeId, filters = {}) {
    try {
      let query = supabase
        .from('memory_wall')
        .select('*')
        .eq('student_id', studentId)
        .eq('college_id', collegeId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply date range filters if provided
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch memories: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single memory by ID
   * @param {string} memoryId - Memory ID
   * @param {string} studentId - Student's user ID (for authorization)
   * @param {string} collegeId - College ID for multi-tenancy
   * @returns {Object} Memory record
   */
  async getMemoryById(memoryId, studentId, collegeId) {
    try {
      const { data, error } = await supabase
        .from('memory_wall')
        .select('*')
        .eq('id', memoryId)
        .eq('student_id', studentId)
        .eq('college_id', collegeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Memory not found');
        }
        throw new Error(`Failed to fetch memory: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a memory (title, date, description only - photo cannot be changed)
   * @param {string} memoryId - Memory ID
   * @param {string} studentId - Student's user ID (for authorization)
   * @param {string} collegeId - College ID for multi-tenancy
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated memory record
   */
  async updateMemory(memoryId, studentId, collegeId, updates) {
    try {
      // Verify ownership
      const existing = await this.getMemoryById(memoryId, studentId, collegeId);
      
      if (!existing) {
        throw new Error('Memory not found or you do not have permission to update it');
      }

      // Prepare update data (exclude photo_url, student_id, college_id)
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) {
        updateData.title = updates.title.trim();
      }

      if (updates.date !== undefined) {
        updateData.date = updates.date;
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description ? updates.description.trim() : null;
      }

      console.log('[MemoryWallService] Updating memory:', memoryId, updateData);

      const { data, error } = await supabase
        .from('memory_wall')
        .update(updateData)
        .eq('id', memoryId)
        .eq('student_id', studentId)
        .eq('college_id', collegeId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update memory: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a memory and its associated photo
   * @param {string} memoryId - Memory ID
   * @param {string} studentId - Student's user ID (for authorization)
   * @param {string} collegeId - College ID for multi-tenancy
   * @returns {Object} Deleted memory record
   */
  async deleteMemory(memoryId, studentId, collegeId) {
    try {
      // Verify ownership and get photo_url
      const existing = await this.getMemoryById(memoryId, studentId, collegeId);
      
      if (!existing) {
        throw new Error('Memory not found or you do not have permission to delete it');
      }

      console.log('[MemoryWallService] Deleting memory:', memoryId);

      // Delete from database
      const { data, error } = await supabase
        .from('memory_wall')
        .delete()
        .eq('id', memoryId)
        .eq('student_id', studentId)
        .eq('college_id', collegeId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to delete memory: ${error.message}`);
      }

      // Extract file path from photo URL and delete from storage
      if (existing.photo_url) {
        try {
          const urlParts = existing.photo_url.split('/memory-wall/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            console.log('[MemoryWallService] Deleting photo from storage:', filePath);
            
            const { error: storageError } = await supabaseAdmin.storage
              .from('memory-wall')
              .remove([filePath]);

            if (storageError) {
              console.error('[MemoryWallService] Failed to delete photo from storage:', storageError);
              // Don't throw error, as the DB record is already deleted
            }
          }
        } catch (storageError) {
          console.error('[MemoryWallService] Error deleting photo from storage:', storageError);
          // Continue anyway, as the DB record is deleted
        }
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get memory statistics for a student
   * @param {string} studentId - Student's user ID
   * @param {string} collegeId - College ID for multi-tenancy
   * @returns {Object} Statistics (total count, recent count, etc.)
   */
  async getMemoryStats(studentId, collegeId) {
    try {
      const { data, error, count } = await supabase
        .from('memory_wall')
        .select('*', { count: 'exact', head: false })
        .eq('student_id', studentId)
        .eq('college_id', collegeId);

      if (error) {
        throw new Error(`Failed to fetch memory stats: ${error.message}`);
      }

      // Calculate additional stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentMemories = data?.filter(memory => 
        new Date(memory.created_at) >= thirtyDaysAgo
      ).length || 0;

      return {
        totalCount: count || 0,
        recentCount: recentMemories,
        oldestMemoryDate: data && data.length > 0 
          ? data.reduce((oldest, memory) => 
              !oldest || new Date(memory.date) < new Date(oldest) ? memory.date : oldest, null)
          : null,
        newestMemoryDate: data && data.length > 0 
          ? data.reduce((newest, memory) => 
              !newest || new Date(memory.date) > new Date(newest) ? memory.date : newest, null)
          : null
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new MemoryWallService();
