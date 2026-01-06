
import { createClient } from '@supabase/supabase-js';

// مقادیر زیر را باید از پنل سوپابیس خود جایگزین کنید
// در محیط واقعی از process.env استفاده می‌شود
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
