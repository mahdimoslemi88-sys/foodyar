import React, { useState, useEffect } from 'react';
import { PrepTask, getConversionFactor } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { validate } from '../../utils/validation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    task: PrepTask | null;
}

export const PrepProductionModal: React.FC<Props> = ({ isOpen, onClose, task }) => {
    const { inventory, setInventory, setPrepTasks } = useRestaurantStore();
    const { showToast } = useToast();
    const [productionBatches, setProductionBatches] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setProductionBatches(1);
            setError('');
        }
    }, [isOpen]);

    if (!isOpen || !task) return null;

    const handleProduce = () => {
        const validationErrors = validate({ productionBatches }, { productionBatches: { required: true, isNumber: true, isPositive: true } });
        if (validationErrors.productionBatches) {
            setError(validationErrors.productionBatches);
            return;
        }
        setError('');

        if (!task.recipe) {
            showToast("این آیتم فرمول تولید ندارد.", 'error');
            return;
        }

        const deductionMap = new Map<string, number>();
        task.recipe.forEach(r => {
            const ing = inventory.find(i => i.id === r.ingredientId);
            if (ing) {
                const factor = getConversionFactor(r.unit, ing.usageUnit, ing);
                 if (factor === null) {
                    throw new Error(`خطای تبدیل واحد برای ${ing.name}`);
                }
                const totalAmount = r.amount * factor * productionBatches;
                deductionMap.set(r.ingredientId, totalAmount);
            }
        });

        setInventory(prev => prev.map(ing => {
            const deduct = deductionMap.get(ing.id);
            if (deduct) {
                return { ...ing, currentStock: Math.max(0, ing.currentStock - deduct) };
            }
            return ing;
        }));

        const producedAmount = (task.batchSize || 1) * productionBatches;
        setPrepTasks(prev => prev.map(t => t.id === task.id ? {
            ...t,
            onHand: t.onHand + producedAmount
        } : t));

        onClose();
        showToast('تولید با موفقیت ثبت شد.');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-800">ثبت تولید: {task.item}</h3>
                    <p className="text-sm text-slate-400">موجودی فعلی: {task.onHand} {task.unit}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="font-bold">تعداد بچ برای تولید:</label>
                        <input type="number" value={productionBatches || ''} onChange={e => setProductionBatches(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-xl font-bold mt-2" />
                        {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
                    </div>
                    <p className="text-xs text-indigo-500 font-bold">مواد اولیه مصرفی برای {productionBatches || 0} بچ:</p>
                    <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg max-h-48 overflow-y-auto">
                        {task.recipe?.map(r => {
                            const ing = inventory.find(i => i.id === r.ingredientId);
                            return <p key={r.ingredientId} className="flex justify-between"><span>{ing?.name}</span><span className="font-mono">{(r.amount * (productionBatches || 0)).toFixed(2)} {r.unit}</span></p>
                        })}
                    </div>
                </div>
                <div className="p-6 border-t flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold">انصراف</button>
                    <button onClick={handleProduce} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">تولید و کسر از انبار</button>
                </div>
            </div>
        </div>
    );
};