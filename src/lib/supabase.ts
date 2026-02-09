import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

export type Link = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
