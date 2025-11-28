import resourcesService from '../services/resources.service.js';
import { 
  successResponse, 
  errorResponse,
  notFoundResponse,
  formatSupabaseError 
} from '../utils/response.js';
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  
  const allowedTypes = process.env.ALLOWED_FILE_TYPES 
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'mp4', 'jpg', 'jpeg', 'png', 'txt'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
  },
  fileFilter: fileFilter
});

// Middleware for handling file upload

const uploadMiddleware = upload.single('file');

// Upload a new resource
// POST /api/counsellor/resources

export const uploadResource = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(res, 'File size exceeds the limit (50MB)', 400);
        }
        return errorResponse(res, `File upload error: ${err.message}`, 400);
      } else if (err) {
        return errorResponse(res, err.message, 400);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded. Please choose a file.', 400);
      }

      // Validate required fields
      const { resource_name, description } = req.body;
      
      if (!resource_name || resource_name.trim() === '') {
        return errorResponse(res, 'Resource name is required', 400);
      }

      // Get counsellor's college_id from profile
      const collegeId = req.user.college_id || req.tenant;
      
      if (!collegeId) {
        return errorResponse(res, 'College ID not found for counsellor', 400);
      }

      // Prepare resource data
      const resourceData = {
        resource_name: resource_name.trim(),
        description: description ? description.trim() : null
      };

      // Upload resource
      const resource = await resourcesService.uploadResource(
        resourceData,
        req.file,
        req.user.user_id,
        collegeId
      );

      return successResponse(res, resource, 'Resource uploaded successfully', 201);
    } catch (error) {
      console.error('Upload resource error:', error);
      return errorResponse(res, error.message || 'Failed to upload resource', 500);
    }
  });
};


// Get all resources for the counsellor
// GET /api/counsellor/resources

export const getResources = async (req, res) => {
  try {
    const { search, file_type } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (file_type) filters.file_type = file_type;

    const resources = await resourcesService.getCounsellorResources(
      req.user.user_id,
      filters
    );

    return successResponse(res, resources, 'Resources retrieved successfully');
  } catch (error) {
    console.error('Get resources error:', error);
    return errorResponse(res, error.message || 'Failed to get resources', 500);
  }
};

// Get a single resource by ID
// GET /api/counsellor/resources/:id

export const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const resource = await resourcesService.getResourceById(id, req.user.user_id);
    
    // Verify ownership
    if (resource.counsellor_id !== req.user.user_id) {
      return errorResponse(res, 'Unauthorized access to this resource', 403);
    }

    return successResponse(res, resource, 'Resource retrieved successfully');
  } catch (error) {
    console.error('Get resource by ID error:', error);
    if (error.message === 'Resource not found') {
      return notFoundResponse(res, 'Resource');
    }
    return errorResponse(res, error.message || 'Failed to get resource', 500);
  }
};

// Update resource metadata (name and description only)
// PUT /api/counsellor/resources/:id

export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { resource_name, description } = req.body;

    if (!resource_name || resource_name.trim() === '') {
      return errorResponse(res, 'Resource name is required', 400);
    }

    const updates = {
      resource_name: resource_name.trim(),
      description: description ? description.trim() : null
    };

    const resource = await resourcesService.updateResource(
      id,
      req.user.user_id,
      updates
    );

    return successResponse(res, resource, 'Resource updated successfully');
  } catch (error) {
    console.error('Update resource error:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return notFoundResponse(res, 'Resource');
    }
    return errorResponse(res, error.message || 'Failed to update resource', 500);
  }
};

// Delete a resource
// DELETE /api/counsellor/resources/:id

export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await resourcesService.deleteResource(id, req.user.user_id);

    return successResponse(res, result, result.message);
  } catch (error) {
    console.error('Delete resource error:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return notFoundResponse(res, 'Resource');
    }
    return errorResponse(res, error.message || 'Failed to delete resource', 500);
  }
};

// Generate download URL for a resource
// GET /api/counsellor/resources/:id/download

export const getDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get resource details
    const resource = await resourcesService.getResourceById(id, req.user.user_id);
    
    // Verify ownership or access
    if (resource.counsellor_id !== req.user.user_id) {
      return errorResponse(res, 'Unauthorized access to this resource', 403);
    }

    // Generate signed URL
    const downloadUrl = await resourcesService.getDownloadUrl(resource.file_path);

    return successResponse(res, { 
      download_url: downloadUrl,
      resource_name: resource.resource_name,
      original_filename: resource.original_filename
    }, 'Download URL generated successfully');
  } catch (error) {
    console.error('Get download URL error:', error);
    if (error.message === 'Resource not found') {
      return notFoundResponse(res, 'Resource');
    }
    return errorResponse(res, error.message || 'Failed to generate download URL', 500);
  }
};

// Get resource statistics for the counsellor
// GET /api/counsellor/resources/stats

export const getResourceStats = async (req, res) => {
  try {
    const stats = await resourcesService.getCounsellorStats(req.user.user_id);
    
    // Format total size for display
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    stats.total_size_formatted = formatBytes(stats.total_size_bytes);

    return successResponse(res, stats, 'Resource statistics retrieved successfully');
  } catch (error) {
    console.error('Get resource stats error:', error);
    return errorResponse(res, error.message || 'Failed to get resource statistics', 500);
  }
};


