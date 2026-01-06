
import { IAppRepository } from './interfaces';
import { RestaurantState } from '../store/restaurantStore';
import { supabase } from '../services/supabase';

export class SupabaseAppRepository implements IAppRepository {
  async load(): Promise<Partial<RestaurantState> | null> {
    try {
      // در یک پیاده‌سازی کامل، ما باید هر بخش را از جدول مربوطه واکشی کنیم
      // برای این فاز، فرض می‌کنیم داده‌ها را به صورت یکجا در یک تنظیمات کاربری ذخیره می‌کنیم
      // یا هر جدول را جداگانه کوئری می‌زنیم.
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [
        inventory,
        menu,
        sales,
        expenses,
        suppliers,
        shifts,
        customers,
        settings
      ] = await Promise.all([
        supabase.from('inventory').select('*').eq('user_id', user.id),
        supabase.from('menu').select('*').eq('user_id', user.id),
        supabase.from('sales').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id),
        supabase.from('suppliers').select('*').eq('user_id', user.id),
        supabase.from('shifts').select('*').eq('user_id', user.id),
        supabase.from('customers').select('*').eq('user_id', user.id),
        supabase.from('settings').select('*').eq('user_id', user.id).single()
      ]);

      return {
        inventory: inventory.data || [],
        menu: menu.data || [],
        sales: sales.data || [],
        expenses: expenses.data || [],
        suppliers: suppliers.data || [],
        shifts: shifts.data || [],
        customers: customers.data || [],
        settings: settings.data || undefined
      };
    } catch (error) {
      console.error("Failed to load state from Supabase", error);
      return null;
    }
  }

  async save(state: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // به دلیل ساختار رابطه‌ای، بهتر است هر اکشن در استور مستقیماً با دیتابیس سینک شود
    // اما برای پیاده‌سازی سریع مشابه LocalStorage، می‌توان از تابع upsert استفاده کرد
    
    // مثال برای ذخیره تنظیمات:
    await supabase.from('settings').upsert({ 
      user_id: user.id, 
      ...state.settings 
    });
    
    // نکته: در معماری حرفه‌ای، هر تغییر در اینونتوری یا فروش باید 
    // از طریق متدهای مجزا در جدول خود ثبت شود.
  }

  async clear(): Promise<void> {
    // پاکسازی داده‌ها در صورت نیاز
  }
}
