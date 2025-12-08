import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with service key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(30000) // 30 second timeout
      });
    }
  }
});

// Create admin client for user management operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: options.signal || AbortSignal.timeout(30000) // 30 second timeout
      });
    }
  }
});

// Test the connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is table not found, which is ok during setup
      console.error('Supabase connection test failed:', error.message);
    } else {
      console.log('Supabase connection established successfully');
    }
  } catch (error) {
    console.error('Supabase connection error:', error.message);
  }
};

// Test connection on startup (only in development)
if (process.env.NODE_ENV !== 'production') {
  testConnection();
}

export default supabase;