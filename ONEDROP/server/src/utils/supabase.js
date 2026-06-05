const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[Supabase Service] SDK initialized successfully.');
} else {
  console.warn('[Supabase Service] SUPABASE_URL and SUPABASE_ANON_KEY not found in environment. Falling back to mock authentication.');
}

/**
 * Verifies a Supabase Access Token sent from the client.
 * Supports standard verification and developer fallbacks.
 * @param {string} accessToken - The Supabase access token to verify
 */
const verifySupabaseToken = async (accessToken) => {
  if (!accessToken) {
    throw new Error('No access token provided');
  }

  // Developer mock token extraction
  if (accessToken.startsWith('mock_supabase_token:')) {
    try {
      const jsonStr = accessToken.slice('mock_supabase_token:'.length);
      const payload = JSON.parse(jsonStr);
      console.log('[Supabase Auth Mock] Decoded mock token:', payload);
      return payload;
    } catch (e) {
      throw new Error('Invalid mock token format');
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error) {
        throw error;
      }
      return {
        uid: data.user.id,
        email: data.user.email,
        email_verified: !!data.user.email_confirmed_at,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || ''
      };
    } catch (error) {
      console.error('[Supabase Auth] Token verification failed:', error.message);
      throw error;
    }
  } else {
    console.warn('[Supabase Auth] SDK not initialized. Applying development fallback decoding.');
    // Simulated token parser (split JWT payload)
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          uid: payload.sub || 'mock_uid_123',
          email: payload.email || 'mock@example.com',
          email_verified: payload.email_verified ?? true,
          name: payload.user_metadata?.full_name || 'Mock User'
        };
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return {
      uid: 'mock_uid_dev_' + Math.random().toString(36).slice(-6),
      email: 'mock_developer@onedrop.org',
      email_verified: true,
      name: 'Developer Mock'
    };
  }
};

module.exports = {
  supabase,
  verifySupabaseToken
};
