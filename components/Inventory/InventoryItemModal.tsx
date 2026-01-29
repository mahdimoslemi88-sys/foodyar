import React, { useState, useEffect, useMemo } from 'react';
import { Ingredient, normalizeUnit, AuditLog } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { X, Plus, AlertTriangle, ArrowLeft, History } from 'lucide-react';
import { validate, ValidationRules } from '../../utils/validation';

const timeAgo = (timestamp: number) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);
    if (seconds < 60) return "همین الان";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقیقه پیش`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعت پیش`;
    const days = Math.floor(hours / 24);
    return `${days} روز پیش`;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    itemToEdit: Ingredient | null;
}

const validationRules: ValidationRules<Partial<Ingredient>> = {
    name: { required: true },
    usageUnit: { required: true },
    currentStock: { required: true, isNumber: true },
    costPerUnit: { required: true, isNumber: true, min: 0 },
    minThreshold: { required: true, isNumber: true, min: 0 },
};


export const InventoryItemModal: React.FC<Props> = ({ isOpen, onClose, itemToEdit }) => {
    const { suppliers, upsertInventoryItem, addAuditLogDetailed, auditLogs, setNavigationIntent } = useRestaurantStore();
    const { showToast } = useToast();

    const [formData, setFormData] = useState<Partial<Ingredient>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newConversion, setNewConversion] = useState({ name: '', toUnit: 'kg', factor: 1 });

    const relatedLogs = useMemo(() => {
        if (!itemToEdit) return [];
        return auditLogs
            .filter(log => log.entity === 'INVENTORY' && log.entityId === itemToEdit.id)
            .slice(0, 5); // Get last 5 events
    }, [auditLogs, itemToEdit]);

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            if (itemToEdit) {
                setFormData({ ...itemToEdit });
            } else {
                setFormData({ name: '', usageUnit: 'kg', currentStock: 0, costPerUnit: 0, minThreshold: 0, supplierId: '', purchaseHistory: [], customUnitConversions: {} });
            }
            setNewConversion({ name: '', toUnit: 'kg', factor: 1 });
        }
    }, [itemToEdit, isOpen]);

    if (!isOpen) return null;

    const handleAddConversion = () => {
        if (!newConversion.name || !newConversion.factor || newConversion.factor <= 0) {
            showToast('لطفا نام واحد و ضریب تبدیل صحیح را وارد کنید.', 'error');
            return;
        }
        const normalizedName = normalizeUnit(newConversion.name);
        setFormData(prev => ({
            ...prev,
            customUnitConversions: {
                ...prev.customUnitConversions,
                [normalizedName]: { toUnit: newConversion.toUnit, factor: newConversion.factor }
            }
        }));
        setNewConversion({ name: '', toUnit: 'kg', factor: 1 });
    };

    const handleRemoveConversion = (name: string) => {
        const { [name]: _, ...rest } = formData.customUnitConversions || {};
        setFormData(prev => ({ ...prev, customUnitConversions: rest }));
    };

    const handleSaveItem = () => {
        const validationErrors = validate(formData, validationRules);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        if (itemToEdit) {
            const updatedItem = { ...itemToEdit, ...formData } as Ingredient;
            addAuditLogDetailed(
                'UPDATE', 'INVENTORY', itemToEdit.id,
                itemToEdit,
                updatedItem,
                `ویرایش دستی آیتم: ${updatedItem.name}`,
                null
            );
            upsertInventoryItem(updatedItem).catch(err => {
                console.error("Failed to persist inventory update:", err);
                showToast("خطا در ذخیره‌سازی تغییرات در سرور.", "error");
            });
            showToast('کالا با موفقیت ویرایش شد.');
        } else {
            const cost = Number(formData.costPerUnit) || 0;
            const stock = Number(formData.currentStock) || 0;
            const newItem: Ingredient = {
                id: crypto.randomUUID(),
                name: formData.name!,
                usageUnit: formData.usageUnit || 'kg',
                currentStock: stock,
                costPerUnit: cost,
                minThreshold: Number(formData.minThreshold),
                supplierId: formData.supplierId,
                purchaseHistory: [{ date: Date.now(), quantity: stock, costPerUnit: cost }],
                isDeleted: false,
                customUnitConversions: formData.customUnitConversions || {},
            };
            addAuditLogDetailed('CREATE', 'INVENTORY', newItem.id, null, newItem, `ایجاد آیتم جدید: ${newItem.name}`, null);
            upsertInventoryItem(newItem).catch(err => {
                console.error("Failed to persist new inventory item:", err);
                showToast("خطا در ذخیره‌سازی کالای جدید در سرور.", "error");
            });
            showToast('کالای جدید با موفقیت اضافه شد.');
        }
        onClose();
    };

    const handleNavigateToLog = () => {
        if (itemToEdit) {
            setNavigationIntent('audit-log', itemToEdit.id);
            onClose();
        }
    };
    
    const handleInputChange = (field: keyof Ingredient, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const LogEntry: React.FC<{ log: AuditLog }> = ({ log }) => {
        const delta = (log.after?.currentStock !== undefined && log.before?.currentStock !== undefined) 
            ? log.after.currentStock - log.before.currentStock 
            : null;

        return (
            <div className="flex items-center justify-between text-xs border-b border-slate-200/50 py-2 last:border-b-0">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-600">{log.details.substring(0, 40)}...</span>
                    <span className="text-slate-400">{timeAgo(log.timestamp)}</span>
                </div>
                {delta !== null && (
                    <span className={`font-mono font-bold ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">{itemToEdit ? 'ویرایش کالا' : 'تعریف کالای جدید'}</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {(formData.currentStock || 0) < 0 && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                            <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> علت احتمالی کسری</h4>
                            {relatedLogs.length > 0 ? (
                                <>
                                    <div className="space-y-1">
                                        {relatedLogs.map(log => <LogEntry key={log.id} log={log} />)}
                                    </div>
                                    <button onClick={handleNavigateToLog} className="w-full text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 p-2 rounded-lg flex items-center justify-center gap-1">
                                        <History className="w-4 h-4" /> مشاهده لاگ کامل
                                    </button>
                                </>
                            ) : <p className="text-xs text-rose-600">تاریخچه‌ای برای این آیتم یافت نشد.</p>}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">نام کالا</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => handleInputChange('name', e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            placeholder="مثلا: گوشت گوساله"
                        />
                         {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">واحد شمارش</label>
                            <select 
                                value={formData.usageUnit}
                                onChange={e => handleInputChange('usageUnit', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                            >
                                <option value="kg">کیلوگرم</option>
                                <option value="gram">گرم</option>
                                <option value="liter">لیتر</option>
                                <option value="ml">میلی‌لیتر</option>
                                <option value="number">عدد</option>
                                <option value="pack">بسته</option>
                                <option value="can">قوطی</option>
                            </select>
                            {errors.usageUnit && <p className="text-rose-500 text-xs mt-1">{errors.usageUnit}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">موجودی فعلی</label>
                            <input 
                                type="number" 
                                value={formData.currentStock || ''}
                                onChange={e => handleInputChange('currentStock', Number(e.target.value))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                             {errors.currentStock && <p className="text-rose-500 text-xs mt-1">{errors.currentStock}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">قیمت خرید (واحد)</label>
                            <input 
                                type="number" 
                                value={formData.costPerUnit || ''}
                                onChange={e => handleInputChange('costPerUnit', Number(e.target.value))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                             {errors.costPerUnit && <p className="text-rose-500 text-xs mt-1">{errors.costPerUnit}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">حداقل موجودی (هشدار)</label>
                            <input 
                                type="number" 
                                value={formData.minThreshold || ''}
                                onChange={e => handleInputChange('minThreshold', Number(e.target.value))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                            {errors.minThreshold && <p className="text-rose-500 text-xs mt-1">{errors.minThreshold}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">تامین کننده پیش‌فرض</label>
                        <select 
                             value={formData.supplierId}
                             onChange={e => handleInputChange('supplierId', e.target.value)}
                             className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option value="">انتخاب کنید...</option>
                            {suppliers.filter(s => !s.isDeleted).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                            ))}
                        </select>
                    </div>

                    <div className="p-4 bg-slate-100 rounded-2xl space-y-3">
                        <h4 className="text-sm font-bold text-slate-700">تعریف واحدهای شمارش سفارشی (مانند کارتن، کیسه)</h4>
                        <div className="space-y-2">
                           {Object.entries(formData.customUnitConversions || {}).map(([name, conv]: [string, { factor: number; toUnit: string }]) => (
                                <div key={name} className="flex items-center justify-between bg-white p-2 rounded-lg text-sm font-mono">
                                    <span>1 {name} = {conv.factor} {conv.toUnit}</span>
                                    <button onClick={() => handleRemoveConversion(name)} className="p-1 text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                            <input type="text" placeholder="نام واحد (مثلا: کارتن)" value={newConversion.name} onChange={e => setNewConversion({...newConversion, name: e.target.value})} className="sm:col-span-2 w-full bg-white border-none rounded-xl p-3 text-sm font-bold" />
                            <input type="number" placeholder="ضریب" value={newConversion.factor || ''} onChange={e => setNewConversion({...newConversion, factor: Number(e.target.value)})} className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold" />
                            <div className="flex items-center gap-2">
                                <select value={newConversion.toUnit} onChange={e => setNewConversion({...newConversion, toUnit: e.target.value})} className="flex-1 w-full bg-white border-none rounded-xl p-3 text-sm font-bold appearance-none">
                                    <option value="kg">kg</option><option value="gram">gram</option><option value="liter">liter</option><option value="ml">ml</option><option value="number">number</option>
                                </select>
                                <button onClick={handleAddConversion} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center shrink-0"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">مثال: ۱ کارتن = ۱۲ کیلوگرم. نام واحد: کارتن، ضریب: 12، واحد: kg</p>
                    </div>

                </div>
                <div className="p-6 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">انصراف</button>
                    <button onClick={handleSaveItem} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2">
                        {itemToEdit ? 'ذخیره تغییرات' : 'افزودن کالا'}
                    </button>
                </div>
            </div>
        </div>
    );
};