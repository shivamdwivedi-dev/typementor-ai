import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ffdvlaeyazrtykjdkmjz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x66p3aS6q-UFkrxDtA9GtQ_ow46L680';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
