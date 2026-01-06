import React from 'react';
import { MenuItem } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { calculateRecipeCost } from '../../domain/pricing';
import { Edit2, Trash2 } from 'lucide-react';

interface MenuTableViewProps {
    menuItems: MenuItem[];
    selectedItems: Set<string>;
    setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
}

export const MenuTableView: React.FC<MenuTableViewProps> = ({ menuItems, selectedItems, setSelectedItems, onEdit, onDelete }) => {
    const { inventory, prepTasks } = useRestaurantStore.getState();

    const toggleSelection = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId); else newSet.add(itemId);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === menuItems.length) setSelectedItems(new Set());
        else setSelectedItems(new Set(menuItems.map(item => item.id)));
    };

    return (
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
            <table className="w-full text-right">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-4 w-10 text-center">
                            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={selectedItems.size === menuItems.length && menuItems.length > 0} onChange={toggleSelectAll} />
                        </th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">نام آیتم</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">دسته‌بندی</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">قیمت فروش</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">هزینه تمام شده</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">سود (٪)</th>
                        <th className="p-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {menuItems.map(item => {
                        const isSelected = selectedItems.has(item.id);
                        const cost = calculateRecipeCost(item.recipe, inventory, prepTasks);
                        const margin = item.price - cost;
                        const marginPercent = item.price > 0 ? Math.round((margin / item.price) * 100) : 0;
                        return (
                            <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 text-center">
                                    <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isSelected} onChange={() => toggleSelection(item.id)} />
                                </td>
                                <td className="p-4 font-bold text-slate-800 text-sm">{item.name}</td>
                                <td className="p-4 text-xs text-slate-500 font-bold">{item.category}</td>
                                <td className="p-4 text-sm text-slate-600 font-mono font-bold">{item.price.toLocaleString()}</td>
                                <td className="p-4 text-sm text-slate-600 font-mono">{cost.toLocaleString()}</td>
                                <td className={`p-4 text-sm font-bold font-mono ${marginPercent > 50 ? 'text-emerald-600' : marginPercent > 30 ? 'text-amber-600' : 'text-rose-600'}`}>{marginPercent}%</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
};
