import React, { useState, useEffect } from 'react';
import { PrepTask, RecipeIngredient } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { calculateBatchCost } from '../../domain/prep';
import { Trash2, X } from 'lucide-react';
import { validate } from '../../utils/validation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    task: PrepTask | null;
}

export const PrepRecipeModal: React.FC<Props> = ({ isOpen, onClose, task }) => {
    const { inventory, setPrepTasks } = useRestaurantStore();
    const { showToast } = useToast();

    const [currentRecipe, setCurrentRecipe] = useState<RecipeIngredient[]>([]);
    const [batchSize, setBatchSize] = useState(1);
    const [costPerUnit, setCostPerUnit] = useState(0);
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (isOpen && task) {
            setCurrentRecipe(task.recipe || []);
            setBatchSize(task.batchSize || 1);
            const calculatedCost = task.recipe ? calculateBatchCost(task.recipe, inventory) / (task.batchSize || 1) : (task.costPerUnit || 0);
            setCostPerUnit(calculatedCost);
            setErrors({});
        }
    }, [isOpen, task, inventory]);

    if (!isOpen || !task) return null;
    
    const validateForm = () => {
        const validationErrors: any = {};
        const batchSizeError = validate({ batchSize }, { batchSize: { isNumber: true, isPositive: true } });
        if(batchSizeError.batchSize) validationErrors.batchSize = batchSizeError.batchSize;
        
        const recipeErrors: any = {};
        currentRecipe.forEach((r, idx) => {
            if(!r.amount || r.amount <= 0) {
                if(!recipeErrors[idx]) recipeErrors[idx] = {};
                recipeErrors[idx].amount = 'مقدار باید مثبت باشد.';
            }
        });

        if(Object.keys(recipeErrors).length > 0) validationErrors.recipe = recipeErrors;
        
        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };


    const handleSaveRecipe = () => {
        if (!validateForm()) {
            showToast('لطفا خطاهای فرم را برطرف کنید.', 'error');
            return;
        }

        const totalBatchCost = calculateBatchCost(currentRecipe, inventory);
        const unitCost = batchSize > 0 ? totalBatchCost / batchSize : 0;

        setPrepTasks(prev => prev.map(t => t.id === task.id ? {
            ...t,
            recipe: currentRecipe,
            batchSize: batchSize,
            costPerUnit: Math.round(unitCost)
        } : t));

        onClose();
        showToast('فرمول تولید با موفقیت ذخیره شد.');
    };

    const addIngredientToRecipe = (id: string) => {
        const ing = inventory.find(i => i.id === id);
        if (ing && !currentRecipe.find(r => r.ingredientId === id)) {
            let defaultUnit = ing.usageUnit;
            if (ing.usageUnit === 'kg') defaultUnit = 'gram';
            if (ing.usageUnit === 'liter') defaultUnit = 'ml';
            setCurrentRecipe([...currentRecipe, { ingredientId: id, amount: 0, unit: defaultUnit, source: 'inventory' }]);
        }
    };

    const updateRecipeItem = (id: string, updates: Partial<RecipeIngredient>) => {
        setCurrentRecipe(prev => prev.map(r => r.ingredientId === id ? { ...r, ...updates } : r));
    };

    const removeRecipeItem = (id: string) => {
        setCurrentRecipe(prev => prev.filter(r => r.ingredientId !== id));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">فرمول تولید: {task.item}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <input type="number" value={batchSize || ''} onChange={e => setBatchSize(Number(e.target.value))} placeholder={`حجم بچ (${task.unit})`} className="w-full bg-slate-50 p-3 rounded-lg" />
                            {errors.batchSize && <p className="text-rose-500 text-xs mt-1">{errors.batchSize}</p>}
                        </div>
                        <div className="p-3 bg-slate-100 rounded-lg text-sm">هزینه واحد: {Math.round(costPerUnit).toLocaleString()}</div>
                    </div>
                    <select onChange={e => addIngredientToRecipe(e.target.value)} className="w-full bg-slate-50 p-3 rounded-lg text-sm"><option>+ افزودن ماده اولیه</option>{inventory.filter(i => !i.isDeleted).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                    <div className="space-y-2">
                        {currentRecipe.map((r, idx) => (
                            <div key={r.ingredientId} className="flex items-center gap-2">
                                <span className="flex-1">{inventory.find(i => i.id === r.ingredientId)?.name}</span>
                                <div>
                                    <input type="number" value={r.amount || ''} onChange={e => updateRecipeItem(r.ingredientId, { amount: Number(e.target.value) })} className="w-20 bg-slate-50 p-2 rounded" />
                                     {errors.recipe?.[idx]?.amount && <p className="text-rose-500 text-xs mt-1">{errors.recipe[idx].amount}</p>}
                                </div>
                                <input value={r.unit} onChange={e => updateRecipeItem(r.ingredientId, { unit: e.target.value })} className="w-20 bg-slate-50 p-2 rounded" />
                                <button onClick={() => removeRecipeItem(r.ingredientId)}><Trash2 className="w-4 h-4 text-rose-500" /></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold">انصراف</button>
                    <button onClick={handleSaveRecipe} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">ذخیره</button>
                </div>
            </div>
        </div>
    );
};