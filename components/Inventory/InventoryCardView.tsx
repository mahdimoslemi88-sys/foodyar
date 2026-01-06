import React, { useState, useEffect } from 'react';
import { Ingredient } from '../../types';
import { MoreHorizontal, Edit2, AlertTriangle, Trash2, Sparkles } from 'lucide-react';

interface InventoryCardViewProps {
    inventory: Ingredient[];
    onEdit: (item: Ingredient) => void;
    onWaste: (item: Ingredient) => void;
    onDelete: (id: string) => void;
}

const AIInsight: React.FC<{ suggestion: string }> = ({ suggestion }) => (
    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3 animate-in fade-in duration-500">
        <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-xs text-indigo-800 font-medium leading-relaxed">{suggestion}</p>
    </div>
);

export const InventoryCardView: React.FC<InventoryCardViewProps> = ({ inventory, onEdit, onWaste, onDelete }) => {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    
    const itemForAISuggestion = React.useMemo(() => {
        if (inventory.length < 3) return null;
        return inventory.reduce((maxItem, currentItem) => (currentItem.currentStock > maxItem.currentStock) ? currentItem : maxItem, inventory[0]);
    }, [inventory]);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {inventory.map((item, index) => {
                const isNegative = item.currentStock < 0;
                const isLow = !isNegative && item.minThreshold > 0 && item.currentStock <= item.minThreshold;
                const isMenuOpen = openMenuId === item.id;

                return (
                    <div key={item.id} className="bg-white p-4 rounded-[28px] flex flex-col justify-between group hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 border border-transparent hover:border-slate-50 cursor-default opacity-0 animate-in-stagger" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}>
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ${isNegative ? 'bg-rose-100 text-rose-500' : isLow ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'} transition-colors`}>{item.name.charAt(0)}</div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                                            {item.name}
                                            {(isLow || isNegative) && <div className={`w-2.5 h-2.5 ${isNegative ? 'bg-rose-500' : 'bg-amber-500'} rounded-full animate-pulse`} title={isNegative ? "موجودی منفی" : "موجودی کم"}></div>}
                                        </h3>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{item.usageUnit}</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : item.id); }} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMenuOpen ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'}`}> <MoreHorizontal className="w-5 h-5" /> </button>
                                    {isMenuOpen && (
                                    <div className="absolute left-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                        <button onClick={() => { onEdit(item); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Edit2 className="w-4 h-4" /> ویرایش</button>
                                        <button onClick={() => { onWaste(item); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> ثبت ضایعات</button>
                                        <button onClick={() => { onDelete(item.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50"><Trash2 className="w-4 h-4" /> حذف کالا</button>
                                    </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-slate-400">موجودی</span>
                                    <span className={`font-black text-lg font-mono tabular-nums ${isNegative ? 'text-rose-600' : 'text-slate-800'}`}>{item.currentStock.toFixed(2)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${isNegative ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-slate-900'}`} style={{ width: `${Math.min(100, (item.minThreshold > 0 && !isNegative ? (item.currentStock / item.minThreshold) * 50 : 100))}%` }}></div>
                                </div>
                            </div>
                        </div>
                        {itemForAISuggestion && item.id === itemForAISuggestion.id && (<AIInsight suggestion="این کالا موجودی بالایی دارد. برای جلوگیری از ضایعات، پیشنهاد می‌شود در منو ویژه روز یا برای تهیه غذای پرسنل از آن استفاده کنید." />)}
                    </div>
                )
            })}
        </div>
    );
};