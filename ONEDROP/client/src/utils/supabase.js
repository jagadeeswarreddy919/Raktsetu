import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  }
  return null;
};

const isRealSupabase = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export const supabaseSignInWithEmail = async (email, password) => {
  if (isRealSupabase()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const accessToken = data.session.access_token;
    return { accessToken, user: data.user };
  } else {
    console.log('[Mock Supabase Auth] Sign in with email:', email);
    const mockUid = `mock_uid_${email.replace(/[^a-zA-Z0-9]/g, '')}`;
    const accessToken = `mock_supabase_token:{"uid":"${mockUid}","email":"${email}","email_verified":true,"name":"Mock Developer"}`;
    return { accessToken, user: { email, email_confirmed_at: new Date().toISOString(), id: mockUid } };
  }
};

export const supabaseCreateUserWithEmail = async (email, password) => {
  if (isRealSupabase()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const accessToken = data.session?.access_token || '';
    return { accessToken, user: data.user };
  } else {
    console.log('[Mock Supabase Auth] Create user with email:', email);
    const mockUid = `mock_uid_${email.replace(/[^a-zA-Z0-9]/g, '')}`;
    const accessToken = `mock_supabase_token:{"uid":"${mockUid}","email":"${email}","email_verified":false,"name":"Mock Developer"}`;
    return { accessToken, user: { email, email_confirmed_at: null, id: mockUid } };
  }
};

export const supabaseSignInWithGoogle = async () => {
  if (isRealSupabase()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    // OAuth redirects away, but data will be handled on return
    return { accessToken: '', redirect: true };
  } else {
    console.log('[Mock Supabase Auth] Sign in with Google');
    const email = 'google_mock@onedrop.org';
    const mockUid = 'mock_uid_google_999';
    const accessToken = `mock_supabase_token:{"uid":"${mockUid}","email":"${email}","email_verified":true,"name":"Google Mock User"}`;
    return { accessToken, user: { email, email_confirmed_at: new Date().toISOString(), id: mockUid } };
  }
};

export const supabaseSignOut = async () => {
  if (isRealSupabase()) {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  } else {
    console.log('[Mock Supabase Auth] Signed out.');
  }
};

export const supabaseSendPasswordReset = async (email) => {
  if (isRealSupabase()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  } else {
    console.log('[Mock Supabase Auth] Dispatched password reset to:', email);
  }
};

export const supabaseGetCurrentUserToken = async () => {
  if (isRealSupabase()) {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  } else {
    const email = 'google_mock@onedrop.org';
    const mockUid = 'mock_uid_google_999';
    return `mock_supabase_token:{"uid":"${mockUid}","email":"${email}","email_verified":true,"name":"Google Mock User"}`;
  }
};
