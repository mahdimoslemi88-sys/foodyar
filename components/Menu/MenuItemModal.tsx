import React, { useMemo } from 'react';
import { MenuItem, RecipeIngredient } from '../../types';
import { useMenuItemForm } from '../../hooks/useMenuItemForm';
import { useRestaurantStore } from '../../store/restaurantStore';
import { getConversionFactor } from '../../types';
import { Plus, Trash2, Edit2, Package, Sparkles, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MenuItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemToEdit: MenuItem | null;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({ isOpen, onClose, itemToEdit }) => {
    const { inventory, prepTasks } = useRestaurantStore();
    const {
        editingId, name, setName, price, setPrice, category, setCategory,
        recipe, setRecipe, currentCost, analysisResult, isAnalyzing, errors,
        handleSave, addIngredientToRecipe, updateRecipeItem, removeIngredientFromRecipe,
        handleAnalyzeRecipe
    } = useMenuItemForm(itemToEdit);

    // FIX: Add explicit type annotation to useMemo to resolve 'unknown' type errors when mapping categories.
    const availableCategories = useMemo<string[]>(() => {
        const allCategories = useRestaurantStore.getState().menu.map(item => item.category);
        return [...new Set(allCategories)];
    }, []);

    const getCompatibleUnits = (baseUnit: string) => {
        const mass = ['kg', 'gram'];
        const volume = ['liter', 'ml', 'cc'];
        if (mass.includes(baseUnit)) return mass;
        if (volume.includes(baseUnit)) return volume;
        return [baseUnit];
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-[32px] w-full max-w-2xl h-[90vh] md:h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                            {editingId ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800">{editingId ? 'ویرایش آیتم منو' : 'تعریف آیتم جدید'}</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">اطلاعات محصول و فرمولاسیون را وارد کنید</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">نام آیتم</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold text-slate-700 shadow-sm" placeholder="مثلا: پیتزا پپرونی" />
                            {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">دسته‌بندی</label>
                            <input type="text" list="categories-datalist" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm" placeholder="مثلا: غذای اصلی" />
                            <datalist id="categories-datalist">
                                {availableCategories.map((cat) => <option key={cat} value={cat} />)}
                            </datalist>
                             {errors.category && <p className="text-rose-500 text-xs mt-1">{errors.category}</p>}
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2">قیمت فروش (تومان)</label>
                            <input type="number" value={price || ''} onChange={e => setPrice(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-extrabold text-slate-800 shadow-sm" />
                             {errors.price && <p className="text-rose-500 text-xs mt-1">{errors.price}</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2"><span className="w-2 h-6 bg-indigo-500 rounded-full"></span>فرمولاسیون (Recipe)</h4>
                            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200">
                                <span className="text-xs text-slate-400 block font-bold mb-1">هزینه تمام شده</span>
                                <span className="font-extrabold text-slate-800 text-xl">{currentCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">تومان</span></span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <select onChange={(e) => { if(e.target.value) { addIngredientToRecipe(e.target.value, 'inventory'); e.target.value = ""; } }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer">
                                <option value="">+ مواد اولیه خام (Raw)</option>
                                {inventory.filter(i => !i.isDeleted).map(ing => (<option key={ing.id} value={ing.id}>{ing.name} ({ing.usageUnit})</option>))}
                            </select>
                            <select onChange={(e) => { if(e.target.value) { addIngredientToRecipe(e.target.value, 'prep'); e.target.value = ""; } }} className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer">
                                <option value="">+ مواد نیمه‌آماده (Mise en place)</option>
                                {prepTasks.map(p => (<option key={p.id} value={p.id}>{p.item} (موجودی: {p.onHand} {p.unit})</option>))}
                            </select>
                        </div>

                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                           {recipe.map((r, idx) => {
                              const isPrep = r.source === 'prep';
                              const itemData = isPrep ? prepTasks.find(p => p.id === r.ingredientId) : inventory.find(i => i.id === r.ingredientId);
                              if (!itemData) return null;
                              
                              const name = isPrep ? (itemData as any).item : (itemData as any).name;
                              const baseUnit = isPrep ? (itemData as any).unit : (itemData as any).usageUnit;
                              const compatibleUnits = getCompatibleUnits(baseUnit);

                              return (
                                <div key={r.ingredientId} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-2xl border shadow-sm group transition-all ${isPrep ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100'}`}>
                                   <div className="flex items-center gap-3 w-full sm:w-auto flex-1"><div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isPrep ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{idx + 1}</div><div className="min-w-0"><div className="font-bold text-slate-800 text-sm truncate">{name}</div><div className="text-[10px] text-slate-400 font-bold flex gap-2"><span>{isPrep ? 'آشپزخانه (Prep)' : 'انبار (Raw)'}</span></div></div></div>
                                   <div className="flex items-center gap-2 w-full sm:w-auto">
                                       <div>
                                            <input type="number" value={r.amount || ''} onChange={e => updateRecipeItem(r.ingredientId, { amount: Number(e.target.value) })} className="w-20 bg-white border border-slate-200 rounded-xl p-2 text-center text-sm font-bold outline-none focus:border-indigo-500" placeholder="مقدار"/>
                                            {errors.recipe?.[idx]?.amount && <p className="text-rose-500 text-xs mt-1">{errors.recipe[idx].amount}</p>}
                                       </div>
                                       <div className="relative w-24">
                                           <select value={r.unit} onChange={e => updateRecipeItem(r.ingredientId, { unit: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2 pr-2 text-xs font-bold appearance-none outline-none focus:border-indigo-500">{compatibleUnits.map(u => (<option key={u} value={u}>{u}</option>))}</select>
                                       </div>
                                       <button onClick={() => removeIngredientFromRecipe(r.ingredientId)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                                   </div>
                                </div>
                              )
                           })}
                           {recipe.length === 0 && (<div className="text-center text-slate-400 text-sm py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"><Package className="w-10 h-10 mx-auto mb-3 opacity-20" />مواد تشکیل‌دهنده را از انبار یا میزانپلاس اضافه کنید</div>)}
                        </div>
                         {errors.recipe_general && <p className="text-rose-500 text-xs mt-2 font-bold">{errors.recipe_general}</p>}
                    </div>

                    <div className="mt-6">
                        <button onClick={handleAnalyzeRecipe} disabled={isAnalyzing || !editingId} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                            {isAnalyzing ? (<Loader2 className="w-5 h-5 animate-spin" />) : (<Sparkles className="w-5 h-5" />)}
                            <span>{isAnalyzing ? 'در حال تحلیل...' : 'تحلیل هوشمند و پیشنهاد بهبود رسپی'}</span>
                        </button>
                        {analysisResult && (
                            <div className="mt-4 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in fade-in duration-500 max-h-64 overflow-y-auto custom-scrollbar">
                                <ReactMarkdown className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:font-black prose-strong:text-indigo-700 prose-ul:list-disc prose-ul:marker:text-indigo-400 prose-ul:list-inside">{analysisResult}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex gap-4 bg-white z-10">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold transition-colors">انصراف</button>
                    <button onClick={() => handleSave(onClose)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all">ذخیره تغییرات</button>
                </div>
            </div>
        </div>
    );
};