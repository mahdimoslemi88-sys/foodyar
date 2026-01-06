
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TODO: مقادیر زیر را با اطلاعات پروژه سوپابیس خود جایگزین کنید
// این اطلاعات در بخش Project Settings > API در داشبورد سوپابیس شما موجود است
// ============================================================================
const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // مثلا: 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // کلید anon public شما

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn("Please configure your Supabase credentials in services/supabase.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
