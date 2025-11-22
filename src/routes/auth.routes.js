import express from 'express';
import {
  login,
  register,
  logout,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordReset,
  refreshToken
} from '../controllers/auth.controller.js';
import { validate, authSchemas } from '../utils/validators.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public routes
router.post('/login', 
  validate(authSchemas.login), 
  login
);

router.post('/register', 
  validate(authSchemas.register), 
  register
);

router.post('/logout', logout);

router.post('/request-password-reset', 
  validate(authSchemas.resetPassword), 
  requestPasswordReset
);

// Protected routes (require authentication)
router.get('/me', optionalAuth, getMe);

router.put('/profile', 
  optionalAuth, 
  updateProfile
);

router.post('/change-password', 
  optionalAuth, 
  validate(authSchemas.changePassword), 
  changePassword
);

router.post('/refresh', 
  optionalAuth, 
  refreshToken
);

export default router;