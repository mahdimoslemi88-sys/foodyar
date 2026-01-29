import { useState, useMemo, useEffect } from 'react';
import { MenuItem, RecipeIngredient } from '../types';
import { useRestaurantStore } from '../store/restaurantStore';
import { useToast } from '../contexts/ToastContext';
import { analyzeRecipe } from '../services/geminiService';
import { calculateRecipeCost } from '../domain/pricing';
import { validate, ValidationRules } from '../utils/validation';

interface FormErrors {
    name?: string;
    price?: string;
    category?: string;
    recipe?: { [key: number]: { amount?: string } };
    recipe_general?: string;
}

export const useMenuItemForm = (itemToEdit: MenuItem | null) => {
    const { menu, upsertMenuItem, inventory, prepTasks, addAuditLogDetailed } = useRestaurantStore();
    const { showToast } = useToast();
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [category, setCategory] = useState('غذا');
    const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});

    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (itemToEdit) {
            setEditingId(itemToEdit.id);
            setName(itemToEdit.name);
            setPrice(itemToEdit.price);
            setCategory(itemToEdit.category);
            setRecipe([...itemToEdit.recipe]);
        } else {
            setEditingId(null);
            setName('');
            setPrice(0);
            setCategory('غذا');
            setRecipe([]);
        }
        setErrors({});
        setAnalysisResult(null);
        setIsAnalyzing(false);
    }, [itemToEdit]);

    const currentCost = useMemo(() => calculateRecipeCost(recipe, inventory, prepTasks), [recipe, inventory, prepTasks]);

    const validateForm = (): FormErrors => {
        const mainErrors = validate({ name, price, category }, {
            name: { required: true },
            price: { required: true, isNumber: true, min: 0 },
            category: { required: true }
        });

        const recipeErrors: { [key: number]: { amount?: string } } = {};
        let recipeGeneralError = '';

        if (recipe.length === 0) {
            // It's not an error to have no recipe, but you might want to warn
            // recipeGeneralError = 'دستور پخت خالی است. هزینه تمام شده صفر در نظر گرفته می‌شود.';
        } else {
            recipe.forEach((ing, index) => {
                const ingErrors: { amount?: string } = {};
                if (!ing.amount || ing.amount <= 0) {
                    ingErrors.amount = 'مقدار باید مثبت باشد.';
                }
                if (Object.keys(ingErrors).length > 0) {
                    recipeErrors[index] = ingErrors;
                }
            });
        }
        
        return { ...mainErrors, recipe: recipeErrors, recipe_general: recipeGeneralError };
    };

    const handleSave = (onClose: () => void) => {
        const validationErrors = validateForm();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0 && Object.keys(validationErrors.recipe || {}).length > 0) {
            showToast('لطفا خطاهای فرم را برطرف کنید.', 'error');
            return;
        }
        
        const newItemData = { name, price, category, recipe };

        if (editingId) {
            const oldItem = menu.find(m => m.id === editingId);
            const updatedItem = { ...oldItem, ...newItemData } as MenuItem;
            
            addAuditLogDetailed(
                'UPDATE',
                'MENU',
                editingId,
                oldItem,
                updatedItem,
                `Updated menu item: ${name}.`,
                null
            );
            upsertMenuItem(updatedItem).catch(err => {
                console.error("Failed to persist menu item update:", err);
                showToast("خطا در ذخیره‌سازی تغییرات منو در سرور.", "error");
            });
            showToast('آیتم منو با موفقیت ویرایش شد.');
        } else {
            const newItem: MenuItem = { id: crypto.randomUUID(), ...newItemData, isDeleted: false };
            addAuditLogDetailed(
                'CREATE',
                'MENU',
                newItem.id,
                null,
                newItem,
                `Created new menu item: ${name}`,
                null
            );
            upsertMenuItem(newItem).catch(err => {
                console.error("Failed to persist new menu item:", err);
                showToast("خطا در ذخیره‌سازی آیتم جدید منو در سرور.", "error");
            });
            showToast('آیتم جدید به منو اضافه شد.');
        }
        onClose();
    };

    const addIngredientToRecipe = (id: string, source: 'inventory' | 'prep') => {
        if (recipe.some(r => r.ingredientId === id)) return;
        
        if (source === 'inventory') {
            const ing = inventory.find(i => i.id === id);
            if (ing) {
                let defaultUnit = ing.usageUnit;
                if (ing.usageUnit === 'kg') defaultUnit = 'gram';
                if (ing.usageUnit === 'liter') defaultUnit = 'ml';
                setRecipe([...recipe, { ingredientId: id, amount: 0, unit: defaultUnit, source: 'inventory' }]);
            }
        } else {
            const prep = prepTasks.find(p => p.id === id);
            if (prep) {
                setRecipe([...recipe, { ingredientId: id, amount: 1, unit: prep.unit, source: 'prep' }]);
            }
        }
    };

    const updateRecipeItem = (ingId: string, updates: Partial<RecipeIngredient>) => {
        setRecipe(prev => prev.map(r => r.ingredientId === ingId ? { ...r, ...updates } : r));
    };

    const removeIngredientFromRecipe = (ingId: string) => {
        setRecipe(prev => prev.filter(r => r.ingredientId !== ingId));
    };

    const handleAnalyzeRecipe = async () => {
        if (!editingId) return;
        const currentItem = menu.find(m => m.id === editingId);
        if (!currentItem || !currentItem.recipe || currentItem.recipe.length === 0) {
            showToast("برای تحلیل، آیتم باید دارای فرمولاسیون ذخیره شده باشد.", 'error');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeRecipe(currentItem, inventory);
            setAnalysisResult(result);
        } catch (error: any) {
            let errorMessage = "خطا در ارتباط با هوش مصنوعی. لطفا اتصال و کلید API را بررسی کنید.";
            if (error.message === 'RATE_LIMIT_ERROR') {
                errorMessage = "شما به تازگی درخواست مشابهی ارسال کرده‌اید. لطفاً کمی بعد دوباره تلاش کنید.";
            } else if (error.message === 'AUTH_ERROR') {
                errorMessage = "خطای احراز هویت. کلید API نامعتبر است. لطفاً از بخش هوش مصنوعی کلید جدیدی انتخاب کنید.";
            }
            console.error("Analysis Error:", error);
            setAnalysisResult(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    return {
        editingId,
        name, setName,
        price, setPrice,
        category, setCategory,
        recipe, setRecipe,
        currentCost,
        errors,
        analysisResult,
        isAnalyzing,
        handleSave,
        addIngredientToRecipe,
        updateRecipeItem,
        removeIngredientFromRecipe,
        handleAnalyzeRecipe
    };
};