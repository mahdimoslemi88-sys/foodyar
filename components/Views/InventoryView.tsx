import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Ingredient, View, ProcessedInvoiceItem } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Search, Camera, FileUp, LayoutGrid, List, ShoppingBasket, Sparkles, FileDown, Loader2 } from 'lucide-react';
import { processInvoiceImage } from '../../services/geminiService';
import { EmptyState } from '../EmptyState';
import { exportInventory } from '../../services/excelService';
import { calculateInventoryItemValue } from '../../domain/costing';
import { InventoryItemModal } from '../Inventory/InventoryItemModal';
import { WasteRecordModal } from '../Inventory/WasteRecordModal';
import { InvoiceConfirmationModal } from '../Inventory/InvoiceConfirmationModal';
import { InventoryCardView } from '../Inventory/InventoryCardView';
import { InventoryTableView } from '../Inventory/InventoryTableView';

export const InventoryView: React.FC = () => {
  const { inventory, deleteInventoryItem, addAuditLog, navigationIntent, clearNavigationIntent } = useRestaurantStore();
  const { showModal } = useModal();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  const [itemToEdit, setItemToEdit] = useState<Ingredient | null>(null);
  const [itemForWaste, setItemForWaste] = useState<Ingredient | null>(null);
  
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  const [invoiceConfirmationData, setInvoiceConfirmationData] = useState<{ date: string | null; items: ProcessedInvoiceItem[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeInventory = useMemo(() => inventory.filter(i => !i.isDeleted), [inventory]);

  const totalItems = activeInventory.length;
  const totalValue = activeInventory.reduce((acc, i) => acc + calculateInventoryItemValue(i), 0);

  const filteredInventory = useMemo(() => {
    return activeInventory.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeInventory, searchQuery]);
  
  const handleOpenItemModal = (item?: Ingredient) => {
    setItemToEdit(item || null);
    setIsItemModalOpen(true);
  };

  useEffect(() => {
    if (navigationIntent?.view === 'inventory' && navigationIntent.entityId) {
      const itemToOpen = activeInventory.find(i => i.id === navigationIntent.entityId);
      if (itemToOpen) {
        // Use a timeout to ensure the view has rendered before opening the modal
        setTimeout(() => handleOpenItemModal(itemToOpen), 0);
      }
      clearNavigationIntent(); // Consume the intent
    }
  }, [navigationIntent, activeInventory, clearNavigationIntent]);

  const handleDeleteItem = (id: string) => {
    showModal('حذف کالا', 'آیا از حذف این کالا از انبار اطمینان دارید؟ این عمل غیرقابل بازگشت است.', () => {
        const itemToDelete = inventory.find(i => i.id === id);
        if(itemToDelete) {
            addAuditLog('DELETE', 'INVENTORY', `Deleted item: ${itemToDelete.name}`);
            deleteInventoryItem(id).catch(err => {
                console.error("Failed to persist inventory deletion:", err);
                showToast("خطا در حذف کالا از سرور.", "error");
            });
            showToast('کالا با موفقیت حذف شد.', 'error');
        }
    });
  };

  const handleOpenWasteModal = (item: Ingredient) => {
    setItemForWaste(item);
    setIsWasteModalOpen(true);
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingInvoice(true);
    try {
        const base64String = await toBase64(file);
        const mimeType = file.type;
        const { invoiceDate, items } = await processInvoiceImage(base64String, mimeType, activeInventory);
        
        if (items.length === 0) {
            showToast("هیچ آیتمی در فاکتور شناسایی نشد.", 'error');
        } else {
            setInvoiceConfirmationData({ date: invoiceDate, items: items });
            setIsInvoiceModalOpen(true);
        }
    } catch (error) {
        console.error(error);
        showToast("خطا در پردازش تصویر فاکتور.", 'error');
    } finally {
        setIsProcessingInvoice(false);
        if (event.target) event.target.value = "";
    }
  };
  
  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceConfirmationData(null);
  };
  
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
      <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" style={{ display: 'none' }} />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">انبارداری</h2>
           <p className="text-slate-400 font-bold text-sm"> {totalItems} کالا • ارزش کل: {(totalValue/1000000).toFixed(1)}M تومان </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
             <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-100 p-1.5">
                 <button onClick={() => exportInventory(activeInventory)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-full flex items-center gap-2 transition-colors active:scale-95"><FileDown className="w-4 h-4" /> <span className="hidden md:inline">خروجی اکسل انبار</span></button>
                 <button onClick={() => setViewType('card')} className={`px-4 py-2.5 rounded-full flex items-center gap-2 transition-colors ${viewType === 'card' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}><LayoutGrid className="w-4 h-4" /></button>
                 <button onClick={() => setViewType('table')} className={`px-4 py-2.5 rounded-full flex items-center gap-2 transition-colors ${viewType === 'table' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}><List className="w-4 h-4" /></button>
                 <button onClick={() => cameraInputRef.current?.click()} disabled={isProcessingInvoice} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 active:scale-95"><Camera className="w-4 h-4" /></button>
                 <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingInvoice} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 active:scale-95"><FileUp className="w-4 h-4" /></button>
                 <button onClick={() => handleOpenItemModal()} title="افزودن دستی" className="w-11 h-11 bg-slate-900 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"><Plus className="w-5 h-5" /></button>
            </div>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative group">
         <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
         <input type="text" placeholder="جستجوی کالا..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border-none py-5 pr-14 pl-6 rounded-3xl shadow-sm text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all" />
      </div>

      {activeInventory.length === 0 ? (
          <div className="mt-10">
              <EmptyState icon={<ShoppingBasket className="w-12 h-12" />} title="انبار شما خالی است" description="برای شروع، اولین کالای خود را با اسکن فاکتور یا به صورت دستی اضافه کنید." action={{ label: 'افزودن اولین کالا', onClick: () => handleOpenItemModal() }} />
          </div>
      ) : viewType === 'card' ? (
        <InventoryCardView 
            inventory={filteredInventory}
            onEdit={handleOpenItemModal}
            onWaste={handleOpenWasteModal}
            onDelete={handleDeleteItem}
        />
      ) : (
        <InventoryTableView 
            inventory={filteredInventory}
            onEdit={handleOpenItemModal}
            onDelete={handleDeleteItem}
        />
      )}

      {isProcessingInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                <h3 className="font-bold text-slate-700">هوش مصنوعی در حال تحلیل فاکتور است...</h3>
                <p className="text-sm text-slate-400">لطفا کمی صبر کنید</p>
            </div>
        </div>
      )}
      
      <InventoryItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} itemToEdit={itemToEdit} />
      <WasteRecordModal isOpen={isWasteModalOpen} onClose={() => setIsWasteModalOpen(false)} item={itemForWaste} />
      <InvoiceConfirmationModal isOpen={isInvoiceModalOpen} onClose={handleCloseInvoiceModal} invoiceData={invoiceConfirmationData} />
    </div>
  );
};