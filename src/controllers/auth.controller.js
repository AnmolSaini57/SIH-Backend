import { supabase, supabaseAdmin } from "../config/supabase.js";
import { 
  successResponse, 
  errorResponse, 
  authErrorResponse, 
  conflictResponse,
  formatSupabaseError 
} from "../utils/response.js";
import bcrypt from "bcryptjs";


 // Authentication Controller
 // Handles user authentication, registration, and session management

// User login with email and password
// Sets secure HTTP-only cookies for session management
 
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      return authErrorResponse(res, 'Invalid email or password');
    }

    const { session, user } = data;

    // Get additional user profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        role,
        college_id,
        avatar_url,
        phone,
        created_at,
        colleges (
          id,
          name
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Set secure HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    // Set access token (1 hour)
    res.cookie("sb-access-token", session.access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Set refresh token (7 days)
    res.cookie("sb-refresh-token", session.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user information (exclude sensitive data)
    const userData = {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name,
      role: profile?.role || user.user_metadata?.role || 'student',
      college_id: profile?.college_id,
      college: profile?.colleges,
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
      phone: profile?.phone,
      created_at: profile?.created_at || user.created_at
    };

    return successResponse(res, userData, 'Login successful');

  } catch (error) {
    console.error('Login controller error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

/**
 * User registration
 * Creates new user account with proper role and college assignment
 */
export const register = async (req, res) => {
  try {
    const { email, password, name, role, college_id } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return conflictResponse(res, 'User with this email already exists');
    }

    // Validate college exists (except for superadmin)
    if (role !== 'superadmin' && college_id) {
      const { data: college, error: collegeError } = await supabase
        .from('colleges')
        .select('id')
        .eq('id', college_id)
        .single();

      if (collegeError || !college) {
        return errorResponse(res, 'Invalid college ID', 400);
      }
    }

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role,
        college_id: role === 'superadmin' ? null : college_id
      },
      email_confirm: true // Auto-confirm email in development
    });

    if (error) {
      console.error('Registration error:', error);
      const formattedError = formatSupabaseError(error);
      return errorResponse(res, formattedError.message, 400);
    }

    const { user } = data;

    // Create user profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email,
        name,
        role,
        college_id: role === 'superadmin' ? null : college_id,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      const formattedError = formatSupabaseError(profileError);
      return errorResponse(res, formattedError.message, 400);
    }

    // Return success without sensitive data
    const userData = {
      id: user.id,
      email: user.email,
      name,
      role,
      college_id: role === 'superadmin' ? null : college_id,
      created_at: user.created_at
    };

    return successResponse(res, userData, 'Registration successful', 201);

  } catch (error) {
    console.error('Registration controller error:', error);
    return errorResponse(res, 'Registration failed', 500);
  }
};

/**
 * User logout
 * Clears authentication cookies and invalidates session
 */
export const logout = async (req, res) => {
  try {
    // Get refresh token from cookies
    const refreshToken = req.cookies["sb-refresh-token"];

    // If refresh token exists, sign out the session
    if (refreshToken) {
      await supabase.auth.admin.signOut(refreshToken);
    }

    // Clear authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    res.clearCookie("sb-access-token", cookieOptions);
    res.clearCookie("sb-refresh-token", cookieOptions);

    return successResponse(res, null, 'Logout successful');

  } catch (error) {
    console.error('Logout controller error:', error);
    // Still clear cookies even if logout fails
    res.clearCookie("sb-access-token");
    res.clearCookie("sb-refresh-token");
    return successResponse(res, null, 'Logout completed');
  }
};

/**
 * Change user password
 * Allows authenticated users to change their password
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    // Get user's current auth data
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user.user) {
      return authErrorResponse(res, 'User not found');
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.user.email,
      password: currentPassword,
    });

    if (signInError) {
      return authErrorResponse(res, 'Current password is incorrect');
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      const formattedError = formatSupabaseError(updateError);
      return errorResponse(res, formattedError.message, 400);
    }

    return successResponse(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password controller error:', error);
    return errorResponse(res, 'Failed to change password', 500);
  }
};

/**
 * Request password reset
 * Sends password reset email to user
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      console.error('Password reset request error:', error);
      // Don't reveal if email exists for security
    }

    // Always return success to prevent email enumeration
    return successResponse(res, null, 'If an account with that email exists, a password reset link has been sent');

  } catch (error) {
    console.error('Request password reset controller error:', error);
    return errorResponse(res, 'Failed to process password reset request', 500);
  }
};

/**
 * Get current user information
 * Returns the authenticated user's profile data
 */
export const getMe = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get user profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        college_id,
        avatar_url,
        phone,
        bio,
        created_at,
        colleges (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return errorResponse(res, 'Failed to fetch user profile', 500);
    }

    if (!profile) {
      return errorResponse(res, 'User profile not found', 404);
    }

    // Return user information
    const userData = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      college_id: profile.college_id,
      college: profile.colleges,
      avatar_url: profile.avatar_url,
      phone: profile.phone,
      bio: profile.bio,
      created_at: profile.created_at
    };

    return successResponse(res, userData, 'User profile retrieved successfully');

  } catch (error) {
    console.error('Get me controller error:', error);
    return errorResponse(res, 'Failed to retrieve user information', 500);
  }
};

/**
 * Get access token from HTTP-only cookie
 * Used for Socket.IO authentication
 * GET /api/auth/token
 */
export const getToken = async (req, res) => {
  try {
    const token = req.cookies['sb-access-token'];
    
    if (!token) {
      return errorResponse(res, 'No authentication token found', 401);
    }

    return successResponse(res, { token }, 'Access token retrieved successfully');
  } catch (error) {
    console.error('Get token error:', error);
    return errorResponse(res, 'Failed to retrieve token', 500);
  }
};