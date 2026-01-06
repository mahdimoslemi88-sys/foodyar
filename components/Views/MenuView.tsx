import React, { useState, useMemo, useEffect } from 'react';
import { MenuItem } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useModal } from '../../contexts/ModalContext';
import { Plus, Trash2, LayoutGrid, List, ClipboardList } from 'lucide-react';
import { EmptyState } from '../EmptyState';
import { MenuItemModal } from '../Menu/MenuItemModal';
import { MenuCardView } from '../Menu/MenuCardView';
import { MenuTableView } from '../Menu/MenuTableView';

export const MenuView: React.FC = () => {
  const { menu, setMenu, addAuditLog, navigationIntent, clearNavigationIntent } = useRestaurantStore();
  const { showModal } = useModal();

  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const activeMenu = useMemo(() => menu.filter(item => !item.isDeleted), [menu]);

  const openModal = (item?: MenuItem) => {
      setEditingItem(item || null);
      setIsModalOpen(true);
  };
  
  useEffect(() => {
    if (navigationIntent?.view === 'menu' && navigationIntent.entityId) {
      const itemToOpen = activeMenu.find(m => m.id === navigationIntent.entityId);
      if (itemToOpen) {
        setTimeout(() => openModal(itemToOpen), 0);
      }
      clearNavigationIntent();
    }
  }, [navigationIntent, activeMenu, clearNavigationIntent]);

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingItem(null);
  };
  
  const deleteItem = (id: string) => {
    showModal('حذف آیتم', 'آیا از حذف این آیتم از منو اطمینان دارید؟', () => {
      const itemToDelete = menu.find(m => m.id === id);
      if(itemToDelete) {
        addAuditLog('DELETE', 'MENU', `Deleted menu item: ${itemToDelete.name}`);
        setMenu(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true } : m));
      }
    });
  };

  const handleBulkDelete = () => {
    showModal(
      `حذف ${selectedItems.size} آیتم`,
      'آیا از حذف آیتم‌های انتخاب شده اطمینان دارید؟',
      () => {
        const itemNames = Array.from(selectedItems).map(id => menu.find(i => i.id === id)?.name).join(', ');
        addAuditLog('DELETE', 'MENU', `Bulk deleted ${selectedItems.size} items: ${itemNames}`);
        setMenu(prev => prev.map(item => selectedItems.has(item.id) ? { ...item, isDeleted: true } : item));
        setSelectedItems(new Set());
      }
    );
  };


  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pt-24 pb-32 md:pb-8 md:pt-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-8">
       <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">مدیریت منو</h2>
           <p className="text-slate-500 mt-1 font-medium">مدیریت قیمت‌گذاری و محاسبه دقیق سودآوری</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                <button onClick={() => setViewType('card')} className={`p-2 rounded-full ${viewType === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><LayoutGrid/></button>
                <button onClick={() => setViewType('table')} className={`p-2 rounded-full ${viewType === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List/></button>
            </div>
            <button 
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
            >
            <Plus className="w-5 h-5" />
            <span className="font-bold">آیتم جدید</span>
            </button>
        </div>
      </div>
      
      {selectedItems.size > 0 && viewType === 'table' && (
          <div className="bg-slate-800 text-white p-4 rounded-3xl flex justify-between items-center animate-in fade-in slide-in-from-bottom-5 duration-300">
              <span className="font-bold text-sm">{selectedItems.size} آیتم انتخاب شده</span>
              <div className="flex gap-2">
                  <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500/20 text-rose-300 hover:text-white hover:bg-rose-500 rounded-xl text-xs font-bold flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
              </div>
          </div>
      )}

      {activeMenu.length === 0 ? (
          <div className="mt-8">
              <EmptyState
                  icon={<ClipboardList className="w-12 h-12" />}
                  title="هنوز هیچ آیتمی در منو ندارید"
                  description="با تعریف غذاها و نوشیدنی‌ها، منوی خود را بسازید و سودآوری هر کدام را محاسبه کنید."
                  action={{
                      label: 'افزودن آیتم جدید',
                      onClick: () => openModal()
                  }}
              />
          </div>
      ) : viewType === 'card' ? (
        <MenuCardView 
            menuItems={activeMenu}
            onEdit={openModal}
            onDelete={deleteItem}
        />
      ) : (
        <MenuTableView 
            menuItems={activeMenu}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            onEdit={openModal}
            onDelete={deleteItem}
        />
      )}

      <MenuItemModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        itemToEdit={editingItem}
      />
    </div>
  );
};