import React from 'react';
import { MenuItem } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { calculateRecipeCost } from '../../domain/pricing';
import { ChefHat, Edit2, Trash2, TrendingUp } from 'lucide-react';

interface MenuCardViewProps {
    menuItems: MenuItem[];
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
}

export const MenuCardView: React.FC<MenuCardViewProps> = ({ menuItems, onEdit, onDelete }) => {
    const inventory = useRestaurantStore(state => state.inventory);
    const prepTasks = useRestaurantStore(state => state.prepTasks);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item, index) => {
                const cost = calculateRecipeCost(item.recipe, inventory, prepTasks);
                const margin = item.price - cost;
                const marginPercent = item.price > 0 ? Math.round((margin / item.price) * 100) : 0;
                
                const isHighProfit = marginPercent >= 50;
                const isMediumProfit = marginPercent >= 30 && marginPercent < 50;
            
                return (
                    <div 
                        key={item.id} 
                        className="bg-white rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 relative group hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 opacity-0 animate-in-stagger"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    >
                        <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => onEdit(item)} className="p-2 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-slate-400 shadow-sm transition-colors"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => onDelete(item.id)} className="p-2 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 shadow-sm transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100 bg-gradient-to-br from-white to-slate-50 border border-slate-100`}>
                                <ChefHat className="w-7 h-7 text-indigo-600" />
                            </div>
                            <div className="pt-1">
                                <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{item.name}</h3>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{item.category}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-slate-400 text-xs font-bold block mb-1">فروش</span>
                                    <span className="font-extrabold text-slate-800 text-sm">{item.price.toLocaleString()}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-slate-400 text-xs font-bold block mb-1">هزینه</span>
                                    <span className="font-bold text-slate-600 text-sm">{cost.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className={`flex items-center gap-3 p-1 rounded-2xl border ${
                                isHighProfit ? 'bg-emerald-50 border-emerald-100' : 
                                isMediumProfit ? 'bg-amber-50 border-amber-100' : 
                                'bg-rose-50 border-rose-100'
                            }`}>
                                <div className="flex-1 px-3 py-2">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                    <TrendingUp className={`w-3.5 h-3.5 ${
                                        isHighProfit ? 'text-emerald-600' : 
                                        isMediumProfit ? 'text-amber-600' : 
                                        'text-rose-600'
                                    }`} />
                                    <span className={`text-[10px] font-bold uppercase ${
                                        isHighProfit ? 'text-emerald-600' : 
                                        isMediumProfit ? 'text-amber-600' : 
                                        'text-rose-600'
                                    }`}>سود خالص</span>
                                    </div>
                                    <div className={`font-bold text-base ${
                                        isHighProfit ? 'text-emerald-700' : 
                                        isMediumProfit ? 'text-amber-700' : 
                                        'text-rose-700'
                                    }`}>
                                    {margin.toLocaleString()} <span className="text-[10px] opacity-70">تومان</span>
                                    </div>
                                </div>
                                
                                <div className={`w-14 h-14 flex flex-col items-center justify-center rounded-xl shadow-sm ${
                                    isHighProfit ? 'bg-emerald-500 text-white shadow-emerald-200' : 
                                    isMediumProfit ? 'bg-amber-500 text-white shadow-amber-200' : 
                                    'bg-rose-500 text-white shadow-rose-200'
                                }`}>
                                    <span className="text-xs font-bold opacity-80">%</span>
                                    <span className="text-lg font-extrabold tracking-tighter leading-none">{marginPercent}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
