import express from 'express';
import {
  createMemory,
  getAllMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  getMemoryStats
} from '../controllers/memoryWall.controller.js';
import { validateUUID } from '../utils/validators.js';

const router = express.Router();

/**
 * Memory Wall Routes
 * Base path: /api/student/memory-wall
 * All routes require authentication and student role (applied at parent level)
 */

/**
 * @route   GET /api/student/memory-wall/stats
 * @desc    Get memory statistics for the logged-in student
 * @access  Private (Student only)
 * @query   None
 * @returns {Object} stats - { totalCount, recentCount, oldestMemoryDate, newestMemoryDate }
 */
router.get('/stats', getMemoryStats);

/**
 * @route   GET /api/student/memory-wall
 * @desc    Get all memories for the logged-in student
 * @access  Private (Student only)
 * @query   {String} [search] - Search by title or description
 * @query   {String} [startDate] - Filter memories from this date (YYYY-MM-DD)
 * @query   {String} [endDate] - Filter memories up to this date (YYYY-MM-DD)
 * @returns {Array} memories - List of memory objects
 */
router.get('/', getAllMemories);

/**
 * @route   POST /api/student/memory-wall
 * @desc    Create a new memory with photo
 * @access  Private (Student only)
 * @body    {FormData} multipart/form-data
 *          - photo: File (required, image only, max 10MB)
 *          - title: String (required, max 200 chars)
 *          - date: String (required, YYYY-MM-DD format, cannot be future)
 *          - description: String (optional)
 * @returns {Object} memory - Created memory object
 */
router.post('/', createMemory);

/**
 * @route   GET /api/student/memory-wall/:id
 * @desc    Get a single memory by ID
 * @access  Private (Student only, own memories only)
 * @param   {UUID} id - Memory ID
 * @returns {Object} memory - Memory object
 */
router.get('/:id', validateUUID('id'), getMemoryById);

/**
 * @route   PUT /api/student/memory-wall/:id
 * @desc    Update a memory (title, date, description only - photo cannot be changed)
 * @access  Private (Student only, own memories only)
 * @param   {UUID} id - Memory ID
 * @body    {Object} updates
 *          - title: String (optional, max 200 chars)
 *          - date: String (optional, YYYY-MM-DD format, cannot be future)
 *          - description: String (optional)
 * @returns {Object} memory - Updated memory object
 */
router.put('/:id', validateUUID('id'), updateMemory);

/**
 * @route   DELETE /api/student/memory-wall/:id
 * @desc    Delete a memory and its photo
 * @access  Private (Student only, own memories only)
 * @param   {UUID} id - Memory ID
 * @returns {Object} deletedMemory - Deleted memory object
 */
router.delete('/:id', validateUUID('id'), deleteMemory);

export default router;
