import React, { useState } from 'react';
import { Ingredient } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { Trash2, Edit2 } from 'lucide-react';
import { calculateInventoryItemValue } from '../../domain/costing';

interface InventoryTableViewProps {
    inventory: Ingredient[];
    onEdit: (item: Ingredient) => void;
    onDelete: (id: string) => void;
}

export const InventoryTableView: React.FC<InventoryTableViewProps> = ({ inventory, onEdit, onDelete }) => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const { setInventory, addAuditLog } = useRestaurantStore();
    const { showModal } = useModal();
    const { showToast } = useToast();

    const toggleSelection = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId); else newSet.add(itemId);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === inventory.length) setSelectedItems(new Set());
        else setSelectedItems(new Set(inventory.map(item => item.id)));
    };

    const handleBulkDelete = () => {
        showModal(`حذف ${selectedItems.size} کالا`, 'آیا از حذف کالاهای انتخاب شده اطمینان دارید؟', () => {
            const itemNames = Array.from(selectedItems).map(id => inventory.find(i => i.id === id)?.name).join(', ');
            addAuditLog('DELETE', 'INVENTORY', `Bulk deleted ${selectedItems.size} items: ${itemNames}`);
            setInventory(prev => prev.map(item => selectedItems.has(item.id) ? { ...item, isDeleted: true } : item));
            setSelectedItems(new Set());
            showToast(`${selectedItems.size} کالا با موفقیت حذف شد.`, 'error');
        });
    };
    
    return (
        <>
        {selectedItems.size > 0 && (
            <div className="bg-slate-800 text-white p-4 rounded-3xl flex justify-between items-center animate-in fade-in slide-in-from-bottom-5 duration-300">
                <span className="font-bold text-sm">{selectedItems.size} آیتم انتخاب شده</span>
                <div className="flex gap-2">
                    <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500/20 text-rose-300 hover:text-white hover:bg-rose-500 rounded-xl text-xs font-bold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                </div>
            </div>
        )}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm pb-20">
            <table className="w-full text-right">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-4 w-10 text-center"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={selectedItems.size === inventory.length && inventory.length > 0} onChange={toggleSelectAll} /></th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">نام کالا</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">موجودی</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">واحد</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">قیمت خرید</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ارزش کل</th>
                        <th className="p-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {inventory.map(item => {
                        const isSelected = selectedItems.has(item.id);
                        const isNegative = item.currentStock < 0;
                        const isLow = !isNegative && item.minThreshold > 0 && item.currentStock <= item.minThreshold;
                        return (
                            <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 text-center"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isSelected} onChange={() => toggleSelection(item.id)} /></td>
                                <td className="p-4 font-bold text-slate-800 text-sm">{item.name}</td>
                                <td className={`p-4 font-bold text-sm font-mono ${isNegative ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-600'}`}>{item.currentStock.toFixed(2)}</td>
                                <td className="p-4 text-xs text-slate-500 font-bold">{item.usageUnit}</td>
                                <td className="p-4 text-sm text-slate-600 font-mono">{item.costPerUnit.toLocaleString()}</td>
                                <td className="p-4 text-sm text-slate-600 font-mono font-bold">{Math.round(calculateInventoryItemValue(item)).toLocaleString()}</td>
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
        </>
    );
};