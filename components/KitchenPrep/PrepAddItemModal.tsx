import React, { useState } from 'react';
import { PrepTask } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { X } from 'lucide-react';
import { validate, ValidationRules } from '../../utils/validation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const validationRules: ValidationRules<Partial<PrepTask>> = {
    item: { required: true },
    parLevel: { required: true, isNumber: true, isPositive: true },
    unit: { required: true },
};

export const PrepAddItemModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { setPrepTasks } = useRestaurantStore();
    const { showToast } = useToast();
    const [newItemData, setNewItemData] = useState<Partial<PrepTask>>({
        item: '', station: 'آماده‌سازی', parLevel: 10, unit: 'kg'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const stations = ['گریل', 'سرد', 'سرخ کن', 'آماده‌سازی'];

    const handleSaveNewTask = () => {
        const validationErrors = validate(newItemData, validationRules);
        setErrors(validationErrors);
        
        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        const newTask: PrepTask = {
            id: crypto.randomUUID(),
            item: newItemData.item!,
            station: newItemData.station || 'آماده‌سازی',
            parLevel: Number(newItemData.parLevel),
            onHand: 0,
            unit: newItemData.unit!,
            recipe: [],
            costPerUnit: 0
        };
        setPrepTasks(prev => [newTask, ...prev]);
        onClose();
        showToast('آیتم جدید با موفقیت اضافه شد.');
    };
    
    const handleInputChange = (field: keyof PrepTask, value: any) => {
        setNewItemData(prev => ({...prev, [field]: value}));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">تعریف آیتم آماده‌سازی</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <input type="text" placeholder="نام آیتم (مثلا: سس سیر)" value={newItemData.item} onChange={e => handleInputChange('item', e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
                        {errors.item && <p className="text-rose-500 text-xs mt-1">{errors.item}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                           <input type="number" placeholder="پار لول" value={newItemData.parLevel || ''} onChange={e => handleInputChange('parLevel', Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-xl font-bold" />
                           {errors.parLevel && <p className="text-rose-500 text-xs mt-1">{errors.parLevel}</p>}
                        </div>
                        <div>
                            <select value={newItemData.unit} onChange={e => handleInputChange('unit', e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold">
                                <option value="kg">kg</option>
                                <option value="liter">liter</option>
                                <option value="number">number</option>
                            </select>
                             {errors.unit && <p className="text-rose-500 text-xs mt-1">{errors.unit}</p>}
                        </div>
                        <select value={newItemData.station} onChange={e => handleInputChange('station', e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold">{stations.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                </div>
                <div className="p-6 border-t"><button onClick={handleSaveNewTask} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">افزودن</button></div>
            </div>
        </div>
    );
};