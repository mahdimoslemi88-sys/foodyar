import React, { useState } from 'react';
import { useRestaurantStore } from '../store/restaurantStore';
import { useToast } from '../contexts/ToastContext';
import { ChefHat, ShoppingBasket, Menu as MenuIcon, PartyPopper, ArrowLeft } from 'lucide-react';
import { Ingredient, MenuItem } from '../types';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const { upsertInventoryItem, upsertMenuItem } = useRestaurantStore();
  const { showToast } = useToast();

  const [invName, setInvName] = useState('گوشت چرخ کرده');
  const [invUnit, setInvUnit] = useState('kg');
  const [invStock, setInvStock] = useState(10);
  const [invCost, setInvCost] = useState(450000);

  const [menuName, setMenuName] = useState('همبرگر');
  const [menuPrice, setMenuPrice] = useState(180000);
  const [menuCat, setMenuCat] = useState('غذا');

  const handleAddInventory = () => {
    if (!invName || invStock <= 0 || invCost <= 0) {
      showToast('لطفا اطلاعات را کامل وارد کنید', 'error');
      return;
    }
    const newItem: Ingredient = {
      id: crypto.randomUUID(),
      name: invName,
      usageUnit: invUnit,
      currentStock: invStock,
      costPerUnit: invCost,
      minThreshold: invStock / 2,
      purchaseHistory: [{ date: Date.now(), quantity: invStock, costPerUnit: invCost }],
      isDeleted: false,
    };
    upsertInventoryItem(newItem).catch(err => {
        console.error("Failed to persist onboarding inventory:", err);
    });
    showToast(`${invName} با موفقیت به انبار اضافه شد.`);
    setStep(3);
  };

  const handleAddMenu = () => {
    if (!menuName || menuPrice <= 0) {
      showToast('لطفا اطلاعات را کامل وارد کنید', 'error');
      return;
    }
    const newItem: MenuItem = {
      id: crypto.randomUUID(),
      name: menuName,
      price: menuPrice,
      category: menuCat,
      recipe: [],
      isDeleted: false
    };
    upsertMenuItem(newItem).catch(err => {
        console.error("Failed to persist onboarding menu item:", err);
    });
    showToast(`${menuName} با موفقیت به منو اضافه شد.`);
    setStep(4);
  };

  const stepsContent = [
    // Step 1: Welcome
    {
      icon: <ChefHat className="w-10 h-10" />,
      title: 'به Foodyar 2 خوش آمدید!',
      description: 'بیایید در چند قدم ساده، رستوران شما را راه‌اندازی کنیم. این فرآیند کمتر از یک دقیقه طول می‌کشد.',
      action: { label: 'شروع کنیم', onClick: () => setStep(2) }
    },
    // Step 2: Add Inventory
    {
      icon: <ShoppingBasket className="w-10 h-10" />,
      title: 'افزودن اولین کالای انبار',
      description: 'برای شروع، یکی از مواد اولیه اصلی خود را وارد کنید. می‌توانید بعدا بقیه را اضافه کنید.',
      content: (
        <div className="space-y-4 text-right">
            <input type="text" value={invName} onChange={e => setInvName(e.target.value)} placeholder="نام کالا" className="w-full p-3 bg-slate-100 rounded-lg font-bold" />
            <div className="grid grid-cols-3 gap-2">
                <input type="number" value={invStock || ''} onChange={e => setInvStock(Number(e.target.value))} placeholder="موجودی" className="w-full p-3 bg-slate-100 rounded-lg font-bold" />
                <select value={invUnit} onChange={e => setInvUnit(e.target.value)} className="w-full p-3 bg-slate-100 rounded-lg font-bold">
                    <option value="kg">کیلوگرم</option><option value="number">عدد</option><option value="liter">لیتر</option>
                </select>
                <input type="number" value={invCost || ''} onChange={e => setInvCost(Number(e.target.value))} placeholder="قیمت واحد" className="w-full p-3 bg-slate-100 rounded-lg font-bold" />
            </div>
        </div>
      ),
      action: { label: 'افزودن و ادامه', onClick: handleAddInventory }
    },
    // Step 3: Add Menu Item
    {
      icon: <MenuIcon className="w-10 h-10" />,
      title: 'ساخت اولین آیتم منو',
      description: 'حالا یکی از غذاها یا نوشیدنی‌های محبوب خود را به منو اضافه کنید.',
      content: (
         <div className="space-y-4 text-right">
            <input type="text" value={menuName} onChange={e => setMenuName(e.target.value)} placeholder="نام آیتم منو" className="w-full p-3 bg-slate-100 rounded-lg font-bold" />
            <div className="grid grid-cols-2 gap-2">
                <input type="number" value={menuPrice || ''} onChange={e => setMenuPrice(Number(e.target.value))} placeholder="قیمت فروش" className="w-full p-3 bg-slate-100 rounded-lg font-bold" />
                <input type="text" value={menuCat} onChange={e => setMenuCat(e.target.value)} placeholder="دسته‌بندی" className="w-full p-3 bg-slate-100 rounded-lg font-bold" />
            </div>
        </div>
      ),
      action: { label: 'افزودن و ادامه', onClick: handleAddMenu }
    },
    // Step 4: Finish
    {
      icon: <PartyPopper className="w-10 h-10" />,
      title: 'تبریک! راه‌اندازی اولیه تمام شد.',
      description: 'شما آماده استفاده از Foodyar هستید. می‌توانید از داشبورد، وضعیت کلی را مشاهده کنید یا مستقیما به بخش صندوق بروید.',
      action: { label: 'ورود به داشبورد', onClick: onComplete }
    }
  ];

  const currentStepData = stepsContent[step - 1];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 relative text-center p-8 md:p-12">
        {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="absolute top-6 left-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <ArrowLeft className="w-5 h-5"/>
            </button>
        )}
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
          {currentStepData.icon}
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-3">{currentStepData.title}</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">{currentStepData.description}</p>
        
        {currentStepData.content && <div className="mb-8">{currentStepData.content}</div>}

        <button onClick={currentStepData.action.onClick} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95">
          {currentStepData.action.label}
        </button>

        <div className="flex justify-center gap-2 mt-8">
            {stepsContent.map((_, index) => (
                <div key={index} className={`w-2 h-2 rounded-full transition-all ${step === index + 1 ? 'bg-indigo-600 scale-125' : 'bg-slate-200'}`}></div>
            ))}
        </div>
      </div>
    </div>
  );
};