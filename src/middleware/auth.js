import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
import { errorResponse } from "../utils/response.js";

/**
 * Authentication middleware with automatic token refresh
 * Handles:
 * 1. Check access token validity
 * 2. If expired, attempt refresh using refresh token
 * 3. Set new cookies with refreshed tokens
 * 4. Add user information to req.user
 */
export default async function auth(req, res, next) {
  try {
    const accessToken = req.cookies["sb-access-token"];
    const refreshToken = req.cookies["sb-refresh-token"];

    console.log(`[Auth] Request to ${req.method} ${req.path}`);
    console.log(`[Auth] Access token present: ${!!accessToken}`);
    console.log(`[Auth] Refresh token present: ${!!refreshToken}`);

    // Check if refresh token exists
    if (!refreshToken) {
      console.log('[Auth] No refresh token found - returning 401');
      return errorResponse(res, "Session expired. Please login again.", 401);
    }

    // Try to verify access token first
    try {
      const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET);
      
      // Token is valid, extract user information from JWT
      let collegeId = decoded.user_metadata?.college_id || decoded.app_metadata?.college_id || null;
      
      // If college_id not in JWT, fetch from profiles table
      if (!collegeId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('college_id')
          .eq('id', decoded.sub)
          .single();
        
        collegeId = profile?.college_id || null;
      }
      
      req.user = {
        id: decoded.sub,  // Using 'id' for consistency with controllers
        user_id: decoded.sub,  // Keep for backward compatibility
        email: decoded.email,
        role: decoded.user_metadata?.role || decoded.app_metadata?.role || 'student',
        college_id: collegeId,
        aud: decoded.aud,
        exp: decoded.exp,
        iat: decoded.iat
      };
      
      console.log(`[Auth] User authenticated - ID: ${req.user.user_id}, Email: ${req.user.email}, Role: ${req.user.role}, College: ${req.user.college_id}`);
      
      return next();
    } catch (tokenError) {
      // Access token is invalid or expired, try to refresh
      console.log('🔄 Access token expired, attempting refresh...');
      
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        console.error('Token refresh failed:', error?.message);
        return errorResponse(res, "Session expired. Please login again.", 401);
      }

      // Successfully refreshed, update cookies
      const { session } = data;
      
      // Set new access token cookie
      res.cookie("sb-access-token", session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/'
      });

      // Set new refresh token cookie
      res.cookie("sb-refresh-token", session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      // Decode the new access token
      const decodedNew = jwt.decode(session.access_token);
      
      // If college_id not in JWT, fetch from profiles table
      let collegeId = decodedNew.user_metadata?.college_id || decodedNew.app_metadata?.college_id || null;
      
      if (!collegeId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('college_id')
          .eq('id', decodedNew.sub)
          .single();
        
        collegeId = profile?.college_id || null;
      }
      
      req.user = {
        id: decodedNew.sub,  // Using 'id' for consistency with controllers
        user_id: decodedNew.sub,  // Keep for backward compatibility
        email: decodedNew.email,
        role: decodedNew.user_metadata?.role || decodedNew.app_metadata?.role || 'student',
        college_id: collegeId,
        aud: decodedNew.aud,
        exp: decodedNew.exp,
        iat: decodedNew.iat
      };

      console.log('Token refreshed successfully for user:', req.user.id);
      return next();
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return errorResponse(res, "Authentication failed", 500);
  }
}

/**
 * Optional authentication middleware for routes that work with or without auth
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies["sb-access-token"];
    
    if (!accessToken) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET);
      req.user = {
        user_id: decoded.sub,
        email: decoded.email,
        role: decoded.user_metadata?.role || decoded.app_metadata?.role || 'student',
        college_id: decoded.user_metadata?.college_id || decoded.app_metadata?.college_id || null,
      };
    } catch (tokenError) {
      req.user = null;
    }
    
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};