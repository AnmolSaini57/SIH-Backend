import memoryWallService from '../services/memoryWall.service.js';
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  formatSupabaseError 
} from '../utils/response.js';
import { supabase } from '../config/supabase.js';
import multer from 'multer';
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedImageTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed image types: ${allowedImageTypes.join(', ')}`), false);
  }
};

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: fileFilter
});

// Middleware for handling photo upload
const uploadMiddleware = upload.single('photo');

/**
 * Create a new memory with photo
 * POST /api/student/memory-wall
 */
export const createMemory = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    try {
      console.log('[MemoryWall Controller] Create memory request received');
      console.log('[MemoryWall Controller] User:', { 
        id: req.user?.user_id, 
        role: req.user?.role, 
        college_id: req.user?.college_id 
      });
      
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error('[MemoryWall Controller] Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(res, 'Photo size exceeds the limit (10MB)', 400);
        }
        return errorResponse(res, `Photo upload error: ${err.message}`, 400);
      } else if (err) {
        console.error('[MemoryWall Controller] Upload middleware error:', err);
        return errorResponse(res, err.message, 400);
      }

      if (!req.file) {
        console.error('[MemoryWall Controller] No photo uploaded');
        return errorResponse(res, 'Photo is required. Please choose a photo.', 400);
      }

      console.log('[MemoryWall Controller] Photo received:', {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Validate required fields
      const { title, date, description } = req.body;
      
      if (!title || title.trim() === '') {
        return errorResponse(res, 'Title is required', 400);
      }

      if (title.trim().length > 200) {
        return errorResponse(res, 'Title must not exceed 200 characters', 400);
      }

      if (!date) {
        return errorResponse(res, 'Date is required', 400);
      }

      // Validate date format and ensure it's not in the future
      const memoryDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (isNaN(memoryDate.getTime())) {
        return errorResponse(res, 'Invalid date format', 400);
      }

      if (memoryDate > today) {
        return errorResponse(res, 'Memory date cannot be in the future', 400);
      }

      // Get student's college_id
      let collegeId = req.user.college_id || req.tenant;
      
      // If still no college_id, fetch from profiles table
      if (!collegeId) {
        console.log('[MemoryWall] Fetching college_id from profiles table for user:', req.user.user_id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('college_id')
          .eq('id', req.user.user_id)
          .single();
        
        if (profileError) {
          console.error('[MemoryWall] Error fetching profile:', profileError);
        }
        
        collegeId = profile?.college_id || null;
        console.log('[MemoryWall] College ID from profile:', collegeId);
      }
      
      if (!collegeId) {
        console.error('[MemoryWall] College ID not found for student:', req.user.user_id);
        return errorResponse(res, 'College ID not found. Please update your profile.', 400);
      }

      // Prepare memory data
      const memoryData = {
        title: title.trim(),
        date: date,
        description: description ? description.trim() : null
      };

      console.log('[MemoryWall] Creating memory:', {
        studentId: req.user.user_id,
        collegeId,
        title: memoryData.title,
        date: memoryData.date,
        photoSize: req.file.size
      });

      // Create memory
      const memory = await memoryWallService.createMemory(
        memoryData,
        req.file,
        req.user.user_id,
        collegeId
      );

      return successResponse(res, memory, 'Memory created successfully', 201);
    } catch (error) {
      console.error('[MemoryWall] Create memory error:', error);
      console.error('[MemoryWall] Error stack:', error.stack);
      return errorResponse(res, error.message || 'Failed to create memory', 500);
    }
  });
};

/**
 * Get all memories for the logged-in student
 * GET /api/student/memory-wall
 */
export const getAllMemories = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const collegeId = req.user.college_id || req.tenant;
    
    const memories = await memoryWallService.getStudentMemories(
      req.user.user_id,
      collegeId,
      filters
    );

    return successResponse(res, memories, 'Memories retrieved successfully');
  } catch (error) {
    console.error('[MemoryWall] Get all memories error:', error);
    return errorResponse(res, error.message || 'Failed to fetch memories', 500);
  }
};

/**
 * Get a single memory by ID
 * GET /api/student/memory-wall/:id
 */
export const getMemoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.user.college_id || req.tenant;
    
    const memory = await memoryWallService.getMemoryById(
      id,
      req.user.user_id,
      collegeId
    );

    if (!memory) {
      return notFoundResponse(res, 'Memory not found');
    }

    return successResponse(res, memory, 'Memory retrieved successfully');
  } catch (error) {
    console.error('[MemoryWall] Get memory by ID error:', error);
    if (error.message === 'Memory not found') {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(res, error.message || 'Failed to fetch memory', 500);
  }
};

/**
 * Update a memory (title, date, description only)
 * PUT /api/student/memory-wall/:id
 */
export const updateMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, description } = req.body;
    const collegeId = req.user.college_id || req.tenant;

    // Validate updates
    const updates = {};
    
    if (title !== undefined) {
      if (title.trim() === '') {
        return errorResponse(res, 'Title cannot be empty', 400);
      }
      if (title.trim().length > 200) {
        return errorResponse(res, 'Title must not exceed 200 characters', 400);
      }
      updates.title = title;
    }

    if (date !== undefined) {
      const memoryDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (isNaN(memoryDate.getTime())) {
        return errorResponse(res, 'Invalid date format', 400);
      }

      if (memoryDate > today) {
        return errorResponse(res, 'Memory date cannot be in the future', 400);
      }
      updates.date = date;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 'No valid fields to update', 400);
    }

    const memory = await memoryWallService.updateMemory(
      id,
      req.user.user_id,
      collegeId,
      updates
    );

    return successResponse(res, memory, 'Memory updated successfully');
  } catch (error) {
    console.error('[MemoryWall] Update memory error:', error);
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(res, error.message || 'Failed to update memory', 500);
  }
};

/**
 * Delete a memory and its photo
 * DELETE /api/student/memory-wall/:id
 */
export const deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.user.college_id || req.tenant;
    
    const deletedMemory = await memoryWallService.deleteMemory(
      id,
      req.user.user_id,
      collegeId
    );

    return successResponse(res, deletedMemory, 'Memory deleted successfully');
  } catch (error) {
    console.error('[MemoryWall] Delete memory error:', error);
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return notFoundResponse(res, error.message);
    }
    return errorResponse(res, error.message || 'Failed to delete memory', 500);
  }
};

/**
 * Get memory statistics for the logged-in student
 * GET /api/student/memory-wall/stats
 */
export const getMemoryStats = async (req, res) => {
  try {
    const collegeId = req.user.college_id || req.tenant;
    
    const stats = await memoryWallService.getMemoryStats(
      req.user.user_id,
      collegeId
    );

    return successResponse(res, stats, 'Memory statistics retrieved successfully');
  } catch (error) {
    console.error('[MemoryWall] Get memory stats error:', error);
    return errorResponse(res, error.message || 'Failed to fetch memory statistics', 500);
  }
};
