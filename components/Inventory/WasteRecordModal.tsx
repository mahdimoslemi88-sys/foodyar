import React, { useState, useEffect } from 'react';
import { Ingredient, WasteRecord } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { Trash2 } from 'lucide-react';
import { calculateInventoryWasteLoss } from '../../domain/costing';
import { validate, ValidationRules } from '../../utils/validation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: Ingredient | null;
}

export const WasteRecordModal: React.FC<Props> = ({ isOpen, onClose, item }) => {
    const { setWasteRecords, setInventory, addAuditLogDetailed } = useRestaurantStore();
    const { showToast } = useToast();

    const [wasteAmount, setWasteAmount] = useState<number>(0);
    const [wasteReason, setWasteReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setWasteAmount(0);
            setWasteReason('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const handleSaveWaste = () => {
        const rules: ValidationRules<{ wasteAmount: number }> = {
            wasteAmount: { required: true, isPositive: true, max: item.currentStock }
        };
        const validationErrors = validate({ wasteAmount }, rules);
        if(validationErrors.wasteAmount) {
            setError(validationErrors.wasteAmount);
            return;
        }
        setError('');

        const costLoss = calculateInventoryWasteLoss(item, wasteAmount, item.usageUnit);
        const wasteRecord: WasteRecord = {
            id: crypto.randomUUID(),
            itemId: item.id,
            itemName: item.name,
            itemSource: 'inventory',
            amount: wasteAmount,
            unit: item.usageUnit,
            costLoss: costLoss,
            reason: wasteReason || 'نامشخص',
            date: Date.now()
        };

        setWasteRecords(prev => [wasteRecord, ...prev]);
        
        const beforeState = { currentStock: item.currentStock };
        const newStock = Math.max(0, item.currentStock - wasteAmount);
        const afterState = { currentStock: newStock };
        
        const updatedItem = { ...item, currentStock: newStock };
        setInventory(prev => prev.map(i => i.id === item.id ? updatedItem : i));

        addAuditLogDetailed(
            'WASTE',
            'INVENTORY',
            item.id,
            beforeState,
            afterState,
            `Waste recorded for ${item.name}: ${wasteAmount} ${item.usageUnit}. Reason: ${wasteReason || 'نامشخص'}. Loss: ${costLoss.toLocaleString()}`,
            null
        );

        onClose();
        showToast('ضایعات با موفقیت ثبت شد.');
    };

    const currentCostLoss = item ? calculateInventoryWasteLoss(item, wasteAmount, item.usageUnit) : 0;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-t-8 border-rose-500">
                <div className="p-6 bg-rose-50">
                    <h3 className="text-xl font-black text-rose-900 flex items-center gap-2"><Trash2 className="w-6 h-6" />ثبت ضایعات</h3>
                    <p className="text-rose-600 text-sm mt-1">ثبت دورریز برای کالای: <span className="font-bold">{item.name}</span></p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">مقدار ضایعات ({item.usageUnit})</label>
                        <input type="number" value={wasteAmount || ''} onChange={e => setWasteAmount(Number(e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-200" placeholder="0" />
                        {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
                        <p className="text-xs text-rose-400 mt-2 font-bold">ارزش مالی از دست رفته: {Math.round(currentCostLoss).toLocaleString()} تومان</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">علت ضایعات</label>
                        <select value={wasteReason} onChange={e => setWasteReason(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer">
                            <option value="">انتخاب کنید...</option>
                            <option value="فساد و خرابی">فساد و خرابی</option>
                            <option value="تاریخ انقضا">تاریخ انقضا</option>
                            <option value="آسیب فیزیکی">آسیب فیزیکی</option>
                            <option value="اشتباه پرسنل">اشتباه پرسنل</option>
                            <option value="سایر">سایر</option>
                        </select>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">انصراف</button>
                    <button onClick={handleSaveWaste} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2">ثبت نهایی</button>
                </div>
            </div>
        </div>
    );
};