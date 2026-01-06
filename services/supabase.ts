
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TODO: مقادیر زیر را با اطلاعات پروژه سوپابیس خود جایگزین کنید
// این اطلاعات در بخش Project Settings > API در داشبورد سوپابیس شما موجود است
// ============================================================================
const SUPABASE_URL = 'https://xrzczrgqkdhblqkbbtnr.supabase.co';       // مثلا: 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyemN6cmdxa2RoYmxxa2JidG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjA1NjMsImV4cCI6MjA4MzEzNjU2M30.rlomR3mJkcF0T_mHwplB-Yjk463wzpnuI3wfn_i4oXI'; // کلید anon public شما

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn("Please configure your Supabase credentials in services/supabase.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
