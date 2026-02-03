import React, { useState, useMemo, useCallback } from 'react';
import { MenuItem, PaymentMethod } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  ShoppingCart, Search, 
  Coffee, Pizza, Utensils, Receipt, 
  Lock, Loader2, ArrowRight, PowerOff
} from 'lucide-react';
import { CheckoutModal } from '../POS/CheckoutModal';
import { ShiftControlView } from '../POS/ShiftControlView';
import { CloseShiftModal } from '../POS/CloseShiftModal';

// Helper to get item icon based on category
const getItemIcon = (cat: string) => {
  if (cat.includes('نوشیدنی') || cat.includes('قهوه')) return <Coffee className="w-6 h-6" />;
  if (cat.includes('پیتزا') || cat.includes('فست')) return <Pizza className="w-6 h-6" />;
  return <Utensils className="w-6 h-6" />;
};

// BOLT OPTIMIZATION: Extracting MenuItemButton into a memoized component prevents
// all menu items from re-rendering when only one is added to the cart (animatedItemId changes).
const MenuItemButton = React.memo(({ item, onClick, isAnimated }: {
  item: MenuItem,
  onClick: (item: MenuItem) => void,
  isAnimated: boolean
}) => {
  return (
    <button
      onClick={() => onClick(item)}
      className={`bg-white rounded-3xl p-4 text-center group active:scale-95 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-indigo-100/50 border border-transparent hover:border-indigo-100 ${isAnimated ? 'animate-pop' : ''}`}
    >
      <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-500 mb-4 group-hover:bg-indigo-50 transition-colors">
        {getItemIcon(item.category)}
      </div>
      <p className="font-bold text-slate-800 text-sm leading-tight h-10">{item.name}</p>
      <p className="text-xs text-slate-400 mt-2 font-medium">{(item.price).toLocaleString()} ت</p>
    </button>
  );
});

// Main POS Component
export const POSView: React.FC = () => {
  // BOLT OPTIMIZATION: Use individual selectors to prevent unnecessary re-renders when other parts of the store change.
  const menu = useRestaurantStore(state => state.menu);
  const shifts = useRestaurantStore(state => state.shifts);
  const settings = useRestaurantStore(state => state.settings);
  
  const currentShift = useMemo(() => shifts.find(s => s.status === 'open'), [shifts]);

  const [cart, setCart] = useState<{item: MenuItem, quantity: number}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [animatedItemId, setAnimatedItemId] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  const activeMenu = useMemo(() => menu.filter(m => !m.isDeleted), [menu]);

  // BOLT OPTIMIZATION: Memoize categories to avoid O(N) calculation on every render (e.g. during search query updates).
  const categories = useMemo(() => {
    return ['همه', ...new Set<string>(activeMenu.map((m: MenuItem) => m.category))];
  }, [activeMenu]);

  const filteredMenu = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return activeMenu
      .filter(m => selectedCategory === 'همه' || m.category === selectedCategory)
      .filter(m => m.name.toLowerCase().includes(query));
  }, [activeMenu, selectedCategory, searchQuery]);

  // BOLT OPTIMIZATION: Wrap event handlers in useCallback to maintain stable references.
  const addToCart = useCallback((item: MenuItem) => {
    setAnimatedItemId(item.id);
    setTimeout(() => setAnimatedItemId(null), 300);

    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart(prev => {
        const itemInCart = prev.find(c => c.item.id === itemId);
        if (itemInCart && itemInCart.quantity + delta <= 0) {
            return prev.filter(c => c.item.id !== itemId);
        }
        return prev.map(c => 
            c.item.id === itemId 
            ? { ...c, quantity: Math.max(0, c.quantity + delta) } 
            : c
        );
    });
  }, []);

  // BOLT OPTIMIZATION: Memoize cart totals to avoid re-calculation unless cart changes.
  const { total, totalItems } = useMemo(() => {
    return {
      total: cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0),
      totalItems: cart.reduce((sum, c) => sum + c.quantity, 0)
    };
  }, [cart]);

  return (
    <div className="flex h-full w-full bg-[#F3F4F6] overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden pt-20 md:pt-0">
        <div className="p-4 md:p-6 bg-[#F3F4F6] z-10 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">صندوق</h2>
            {currentShift && (
              <button onClick={() => setIsCloseShiftModalOpen(true)} className="flex items-center gap-2 bg-white text-rose-600 font-bold px-4 py-2 rounded-full border border-rose-100 shadow-sm active:scale-95 transition-transform">
                <PowerOff className="w-4 h-4" /> بستن شیفت
              </button>
            )}
          </div>
          {currentShift && (
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="جستجوی آیتم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white border-none rounded-2xl p-4 pr-12 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
            </div>
          )}
        </div>

        {currentShift && (
          <div className="px-4 md:px-6 py-3 shrink-0 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 w-max">
                  {categories.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-3 rounded-full text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>{cat}</button>
                  ))}
              </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-40 md:pb-32">
          {!currentShift ? (
              <div className="h-full flex items-center justify-center">
                  <ShiftControlView />
              </div>
          ) : filteredMenu.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                  <p>هیچ آیتمی یافت نشد.</p>
              </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMenu.map(item => (
                <MenuItemButton
                  key={item.id}
                  item={item}
                  onClick={addToCart}
                  isAnimated={animatedItemId === item.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {cart.length > 0 && (
          <div className="absolute bottom-24 md:bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-30 animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-4 text-white shadow-2xl shadow-slate-900/20">
                  <button onClick={() => setIsCheckoutModalOpen(true)} className="w-full flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sm font-bold">{totalItems}</div>
                          <div>
                            <p className="text-xs text-slate-300 font-bold">جمع کل</p>
                            <p className="font-extrabold text-lg tracking-tight">{total.toLocaleString()} <span className="text-xs font-normal">تومان</span></p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-2xl font-bold text-sm">
                          مشاهده و پرداخت
                          <ArrowRight className="w-4 h-4" />
                      </div>
                  </button>
              </div>
          </div>
      )}

      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => {
            setIsCheckoutModalOpen(false);
            setCart([]); // Clear cart after transaction is complete
        }}
        cart={cart}
        updateQuantity={updateQuantity}
        settings={settings}
      />
      
      {currentShift && (
        <CloseShiftModal
            isOpen={isCloseShiftModalOpen}
            onClose={() => setIsCloseShiftModalOpen(false)}
            shift={currentShift}
        />
      )}
    </div>
  );
};