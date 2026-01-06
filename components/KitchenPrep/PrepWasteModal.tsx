import React, { useState, useEffect } from 'react';
import { PrepTask, WasteRecord } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { Trash2 } from 'lucide-react';
import { validate, ValidationRules } from '../../utils/validation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    task: PrepTask | null;
}

export const PrepWasteModal: React.FC<Props> = ({ isOpen, onClose, task }) => {
    const { setWasteRecords, setPrepTasks, addAuditLogDetailed } = useRestaurantStore();
    const { showToast } = useToast();
    const [wasteAmount, setWasteAmount] = useState(0);
    const [wasteReason, setWasteReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setWasteAmount(0);
            setWasteReason('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen || !task) return null;

    const handleSavePrepWaste = () => {
        const validationRules: ValidationRules<{ wasteAmount: number }> = {
            wasteAmount: { required: true, isPositive: true, max: task.onHand }
        };
        const validationErrors = validate({ wasteAmount }, validationRules);

        if (validationErrors.wasteAmount) {
            setError(validationErrors.wasteAmount);
            return;
        }
        setError('');
        
        const costLoss = wasteAmount * (task.costPerUnit || 0);
        const wasteRecord: WasteRecord = {
            id: crypto.randomUUID(),
            itemId: task.id,
            itemName: task.item,
            itemSource: 'prep',
            amount: wasteAmount,
            unit: task.unit,
            costLoss: costLoss,
            reason: wasteReason || 'نامشخص',
            date: Date.now()
        };
        setWasteRecords(prev => [wasteRecord, ...prev]);

        const beforeState = { onHand: task.onHand };
        const newOnHand = Math.max(0, task.onHand - wasteAmount);
        const afterState = { onHand: newOnHand };

        setPrepTasks(prev => prev.map(p =>
            p.id === task.id
                ? { ...p, onHand: newOnHand }
                : p
        ));

        addAuditLogDetailed(
            'WASTE',
            'PREP',
            task.id,
            beforeState,
            afterState,
            `Waste recorded for prep item ${task.item}: ${wasteAmount} ${task.unit}. Loss: ${costLoss.toLocaleString()}`,
            null
        );
        onClose();
        showToast('ضایعات با موفقیت ثبت شد.');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold">ثبت ضایعات: {task.item}</h3>
                    <p className="text-sm text-slate-500">موجودی فعلی: {task.onHand} {task.unit}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <input type="number" value={wasteAmount || ''} onChange={e => setWasteAmount(Number(e.target.value))} placeholder={`مقدار ضایعات (${task.unit})`} className="w-full bg-slate-50 p-3 rounded-lg" />
                        {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
                    </div>
                    <select value={wasteReason} onChange={e => setWasteReason(e.target.value)} className="w-full bg-slate-50 p-3 rounded-lg"><option value="خرابی">خرابی</option><option value="اشتباه تولید">اشتباه تولید</option></select>
                </div>
                <div className="p-6 border-t flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-slate-500">انصراف</button>
                    <button onClick={handleSavePrepWaste} className="flex-1 py-2 bg-rose-500 text-white rounded-lg">ثبت</button>
                </div>
            </div>
        </div>
    );
};