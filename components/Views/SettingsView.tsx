import React, { useState, useEffect, useRef } from 'react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import { SystemSettings, BackupData, StockDeductionPolicy, LoyaltySettings } from '../../types';
import { Settings, Percent, Building, Phone, MapPin, Save, Database, Download, Upload, SlidersHorizontal, Heart, ToggleLeft, ToggleRight } from 'lucide-react';
import { validateBackupData } from '../../utils/backupValidation';

export const SettingsView: React.FC = () => {
    const store = useRestaurantStore();
    const { settings, setSettings, restoreState, addAuditLog } = store;
    const { showToast } = useToast();
    const { showModal } = useModal();
    const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalSettings(prev => {
            const currentLoyalty = settings.loyaltySettings || prev.loyaltySettings || {
                enabled: false,
                programType: 'points',
                cashbackPercentage: 5,
                pointsRate: 100000,
                minRedeemAmount: 50000,
            };
            return { ...settings, loyaltySettings: currentLoyalty };
        });
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({
            ...prev,
            [name]: name === 'taxRate' ? Number(value) : value
        }));
    };

    const handlePolicyChange = (policy: StockDeductionPolicy) => {
        setLocalSettings(prev => ({ ...prev, stockDeductionPolicy: policy }));
    };

    const handleLoyaltyChange = (field: keyof LoyaltySettings, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            loyaltySettings: {
                ...(prev.loyaltySettings!),
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        setSettings(localSettings);
        showToast('تنظیمات با موفقیت ذخیره شد.');
    };

    const handleBackup = () => {
        const backupData: BackupData = {
            schemaVersion: 2,
            exportedAt: new Date().toISOString(),
            data: {
                inventory: store.inventory,
                menu: store.menu,
                sales: store.sales,
                expenses: store.expenses,
                suppliers: store.suppliers,
                purchaseInvoices: store.purchaseInvoices,
                managerTasks: store.managerTasks,
                prepTasks: store.prepTasks,
                shifts: store.shifts,
                wasteRecords: store.wasteRecords,
                auditLogs: store.auditLogs,
                settings: store.settings,
                customers: store.customers,
                transactions: store.transactions,
                invoiceCounter: store.invoiceCounter,
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.download = `foodyar_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('پشتیبان‌گیری با موفقیت انجام شد.');
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error('فایل نامعتبر است.');
                }
                const parsedData = JSON.parse(text);

                const { isValid, error: validationError } = validateBackupData(parsedData);
                if (!isValid) {
                    showToast(validationError || 'فایل پشتیبان انتخاب شده معتبر نیست.', 'error');
                    return;
                }

                const restoreAction = () => {
                    restoreState(parsedData.data);
                    addAuditLog('UPDATE', 'DATA_HEALTH', 'اطلاعات سیستم از فایل پشتیبان بازگردانی شد.');
                    showToast('اطلاعات با موفقیت بازگردانی شد.', 'success');
                };

                showModal(
                    'بازگردانی اطلاعات',
                    'آیا اطمینان دارید؟ تمام داده‌های فعلی شما با اطلاعات فایل پشتیبان جایگزین خواهد شد. این عمل غیرقابل بازگشت است.',
                    restoreAction
                );

            } catch (error: any) {
                showToast(`خطا در خواندن فایل: ${error.message}`, 'error');
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };
    
    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                style={{ display: 'none' }}
            />
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-indigo-600" />
                        تنظیمات سیستم
                    </h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">مدیریت اطلاعات و تنظیمات کلی رستوران</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Operational Settings */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5 text-indigo-500"/>
                        تنظیمات عملیاتی
                    </h3>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">سیاست کسر از انبار هنگام فروش</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button onClick={() => handlePolicyChange('ALLOW_NEGATIVE')} className={`p-4 rounded-xl text-right transition-all border-2 ${localSettings.stockDeductionPolicy === 'ALLOW_NEGATIVE' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                <p className="font-bold text-sm text-slate-800">مجاز کردن موجودی منفی</p>
                                <p className="text-xs text-slate-500 mt-1">فروش ثبت شده و موجودی منفی می‌شود.</p>
                            </button>
                             <button onClick={() => handlePolicyChange('ALLOW_BUT_REQUIRE_CONFIRMATION')} className={`p-4 rounded-xl text-right transition-all border-2 ${localSettings.stockDeductionPolicy === 'ALLOW_BUT_REQUIRE_CONFIRMATION' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                <p className="font-bold text-sm text-slate-800">دریافت تاییدیه در صورت کسری</p>
                                <p className="text-xs text-slate-500 mt-1">قبل از ثبت فروش، پیغام تایید نمایش داده می‌شود.</p>
                            </button>
                             <button onClick={() => handlePolicyChange('BLOCK_SALE_IF_INSUFFICIENT')} className={`p-4 rounded-xl text-right transition-all border-2 ${localSettings.stockDeductionPolicy === 'BLOCK_SALE_IF_INSUFFICIENT' ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                <p className="font-bold text-sm text-slate-800">مسدود کردن فروش</p>
                                <p className="text-xs text-slate-500 mt-1">در صورت کسری، از ثبت فروش جلوگیری می‌شود.</p>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Loyalty Settings */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-indigo-500"/>
                        باشگاه مشتریان و وفاداری
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <label className="text-sm font-bold text-slate-700">فعالسازی سیستم وفاداری</label>
                            <button onClick={() => handleLoyaltyChange('enabled', !localSettings.loyaltySettings?.enabled)}>
                                {localSettings.loyaltySettings?.enabled ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                            </button>
                        </div>
                        {localSettings.loyaltySettings?.enabled && (
                             <div className="space-y-4 pt-4 border-t border-slate-100">
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">نوع برنامه</label>
                                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                        <button onClick={() => handleLoyaltyChange('programType', 'points')} className={`flex-1 py-3 rounded-xl text-sm font-bold ${localSettings.loyaltySettings?.programType === 'points' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>امتیازی</button>
                                        <button onClick={() => handleLoyaltyChange('programType', 'cashback')} className={`flex-1 py-3 rounded-xl text-sm font-bold ${localSettings.loyaltySettings?.programType === 'cashback' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>کیف پول (کش‌بک)</button>
                                    </div>
                                 </div>
                                 {localSettings.loyaltySettings?.programType === 'points' ? (
                                     <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">نرخ امتیاز</label>
                                        <input type="number" value={localSettings.loyaltySettings?.pointsRate || ''} onChange={e => handleLoyaltyChange('pointsRate', Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100" />
                                        <p className="text-xs text-slate-400 mt-2">به ازای هر X تومان خرید، ۱ امتیاز به مشتری تعلق می‌گیرد.</p>
                                    </div>
                                 ) : (
                                     <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">درصد کش‌بک (٪)</label>
                                        <input type="number" value={localSettings.loyaltySettings?.cashbackPercentage || ''} onChange={e => handleLoyaltyChange('cashbackPercentage', Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100" />
                                        <p className="text-xs text-slate-400 mt-2">این درصد از مبلغ نهایی فاکتور به کیف پول مشتری بازگردانده می‌شود.</p>
                                     </div>
                                 )}
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">حداقل مبلغ خرید برای استفاده از امتیاز/موجودی</label>
                                    <input type="number" value={localSettings.loyaltySettings?.minRedeemAmount || ''} onChange={e => handleLoyaltyChange('minRedeemAmount', Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100" />
                                 </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Financial Config Card */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Percent className="w-5 h-5 text-indigo-500"/>
                        تنظیمات مالی
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="taxRate" className="block text-sm font-bold text-slate-700 mb-2">نرخ مالیات بر ارزش افزوده (٪)</label>
                            <input
                                type="number"
                                id="taxRate"
                                name="taxRate"
                                value={localSettings.taxRate}
                                onChange={handleChange}
                                placeholder="مثلا: 9"
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                             <p className="text-xs text-slate-400 mt-2">این نرخ به صورت پیش‌فرض در فاکتورهای صندوق اعمال خواهد شد.</p>
                        </div>
                    </div>
                </div>

                {/* Restaurant Info Card */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                     <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Building className="w-5 h-5 text-indigo-500"/>
                        اطلاعات رستوران
                    </h3>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="restaurantName" className="block text-sm font-bold text-slate-700 mb-2">نام رستوران</label>
                            <input
                                type="text"
                                id="restaurantName"
                                name="restaurantName"
                                value={localSettings.restaurantName}
                                onChange={handleChange}
                                placeholder="مثلا: رستوران فودیار"
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                         <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-bold text-slate-700 mb-2">شماره تلفن</label>
                            <input
                                type="text"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={localSettings.phoneNumber}
                                onChange={handleChange}
                                placeholder="مثلا: 02112345678"
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                         <div>
                            <label htmlFor="address" className="block text-sm font-bold text-slate-700 mb-2">آدرس</label>
                            <textarea
                                id="address"
                                name="address"
                                value={localSettings.address}
                                onChange={handleChange}
                                rows={3}
                                placeholder="آدرس کامل رستوران"
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Data Management Card */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-500"/>
                        مدیریت داده‌ها
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">از اطلاعات خود فایل پشتیبان تهیه کنید یا داده‌های قبلی را بازگردانی نمایید. این عملیات فقط روی دستگاه فعلی شما تاثیر دارد.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handleBackup} className="flex items-center justify-center gap-3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors">
                            <Download className="w-5 h-5" />
                            دانلود بکاپ (JSON)
                        </button>
                        <button onClick={handleRestoreClick} className="flex items-center justify-center gap-3 py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-bold transition-colors">
                            <Upload className="w-5 h-5" />
                            بازگردانی بکاپ (JSON)
                        </button>
                    </div>
                </div>
                
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2 shadow-xl shadow-slate-300 hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <Save className="w-5 h-5"/>
                        ذخیره تغییرات
                    </button>
                </div>
            </div>
        </div>
    );
};