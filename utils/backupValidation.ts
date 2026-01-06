import { BackupData } from '../types';

// A simple type guard to check if an object has required keys.
const hasKeys = <T extends object>(obj: any, keys: (keyof T)[]): obj is T => {
    if (typeof obj !== 'object' || obj === null) return false;
    return keys.every(key => key in obj);
};

export const validateBackupData = (data: any): { isValid: boolean; error?: string } => {
    // 1. Check for schemaVersion and top-level 'data' key
    if (!hasKeys<BackupData>(data, ['schemaVersion', 'data'])) {
        return { isValid: false, error: 'فایل پشتیبان نامعتبر است. ساختار اصلی فایل صحیح نیست.' };
    }
    
    if (data.schemaVersion !== 2) {
        return { isValid: false, error: `نسخه فایل پشتیبان (${data.schemaVersion}) پشتیبانی نمی‌شود. فقط نسخه ۲ قابل قبول است.` };
    }

    const backupContent = data.data;
    if (typeof backupContent !== 'object' || backupContent === null) {
        return { isValid: false, error: 'بخش "data" در فایل پشتیبان یافت نشد یا فرمت آن صحیح نیست.' };
    }

    // 2. Check for required top-level data keys
    const requiredKeys: (keyof BackupData['data'])[] = [
        'inventory', 'menu', 'sales', 'settings', 'expenses', 'suppliers', 'shifts', 'wasteRecords'
    ];
    
    for (const key of requiredKeys) {
        const contentPart = backupContent[key as keyof typeof backupContent];
        if (key === 'settings') {
            if (typeof contentPart !== 'object' || contentPart === null) {
                 return { isValid: false, error: `بخش ضروری 'settings' در فایل پشتیبان یافت نشد.` };
            }
        } else if (!Array.isArray(contentPart)) {
            return { isValid: false, error: `بخش ضروری '${key}' در فایل پشتیبان یافت نشد یا آرایه نیست.` };
        }
    }

    // 3. Check minimal fields within arrays
    if (backupContent.inventory && backupContent.inventory.some((item: any) => !hasKeys(item, ['id', 'name', 'currentStock']))) {
        return { isValid: false, error: 'داده‌های انبار در فایل پشتیبان ناقص است. هر کالا باید حداقل id, name, currentStock داشته باشد.' };
    }
    
    if (backupContent.menu && backupContent.menu.some((item: any) => !hasKeys(item, ['id', 'name', 'price']))) {
        return { isValid: false, error: 'داده‌های منو در فایل پشتیبان ناقص است. هر آیتم باید حداقل id, name, price داشته باشد.' };
    }

    if (backupContent.sales && backupContent.sales.some((item: any) => !hasKeys(item, ['id', 'timestamp', 'totalAmount']))) {
        return { isValid: false, error: 'داده‌های فروش در فایل پشتیبان ناقص است. هر فروش باید حداقل id, timestamp, totalAmount داشته باشد.' };
    }

    // 4. Check settings object
    if (backupContent.settings && !hasKeys(backupContent.settings, ['restaurantName', 'taxRate'])) {
        return { isValid: false, error: 'داده‌های تنظیمات در فایل پشتیبان ناقص است.' };
    }

    return { isValid: true };
};
