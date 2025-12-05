import express from 'express';
import {
  login,
  register,
  logout,
  changePassword,
  requestPasswordReset,
  getMe,
  getToken
} from '../controllers/auth.controller.js';
import { validate, authSchemas } from '../utils/validators.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/*
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

router.get('/me',
  auth,
  getMe
);

router.get('/token',
  auth,
  getToken
);

router.post('/change-password', 
  auth, 
  validate(authSchemas.changePassword), 
  changePassword
);

export default router;