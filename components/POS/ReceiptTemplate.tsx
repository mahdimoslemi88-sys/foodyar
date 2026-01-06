import React from 'react';
import { Sale, SystemSettings, Customer, MenuItem } from '../../types';
import { ChefHat } from 'lucide-react';
import { toPersianDate, toPersianNumber, formatPersianCurrency } from '../../utils/persianUtils';

interface ReceiptTemplateProps {
  sale: Sale;
  settings: SystemSettings;
  menuItems: MenuItem[];
  customer?: Customer | null;
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptTemplateProps>(({ sale, settings, menuItems, customer }, ref) => {
  const subtotal = sale.items.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
  const taxAmount = sale.tax ? Math.round(subtotal * (sale.tax / 100)) : 0;

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div ref={ref} className="w-[302px] bg-white text-black p-3 font-['Vazirmatn'] text-xs leading-relaxed" dir="rtl">
      {/* Header */}
      <div className="text-center mb-3">
        <div className="flex justify-center items-center gap-2 mb-2">
            <ChefHat className="w-8 h-8" />
            <h1 className="text-xl font-black">{settings.restaurantName}</h1>
        </div>
        {settings.address && <p className="text-[10px]">{settings.address}</p>}
        {settings.phoneNumber && <p className="text-[10px]">تلفن: {toPersianNumber(settings.phoneNumber)}</p>}
      </div>

      {/* Info Section */}
      <div className="border-t border-b border-dashed border-black py-2 my-3 text-[10px] space-y-1">
        <div className="flex justify-between">
          <span>شماره فاکتور:</span>
          <span>{toPersianNumber(sale.invoiceNumber)}</span>
        </div>
        <div className="flex justify-between">
          <span>تاریخ:</span>
          <span>{toPersianDate(sale.timestamp)} - {formatTime(sale.timestamp)}</span>
        </div>
        <div className="flex justify-between">
          <span>صندوق‌دار:</span>
          <span>{sale.operatorName}</span>
        </div>
        {customer && (
          <div className="flex justify-between">
            <span>مشتری:</span>
            <span>{customer.fullName || toPersianNumber(customer.phoneNumber)}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="text-xs">
        {sale.items.map((item, index) => {
          const menuItem = menuItems.find(m => m.id === item.menuItemId);
          return (
            <div key={index} className="py-2 border-b border-dashed border-black/50">
                <div className="flex justify-between font-bold">
                    <span>{menuItem?.name || 'آیتم حذف شده'}</span>
                    <span>{formatPersianCurrency(item.priceAtSale * item.quantity)}</span>
                </div>
                <div className="text-slate-600 text-[10px] mt-0.5">
                    {toPersianNumber(item.quantity)} عدد × {formatPersianCurrency(item.priceAtSale)}
                </div>
            </div>
          );
        })}
      </div>

      {/* Footer Totals */}
      <div className="pt-3 space-y-2 text-xs font-bold">
        <div className="flex justify-between">
          <span>جمع کل:</span>
          <span>{formatPersianCurrency(subtotal)}</span>
        </div>
        {sale.discount && sale.discount > 0 && (
          <div className="flex justify-between">
            <span>تخفیف:</span>
            <span>{formatPersianCurrency(sale.discount)}</span>
          </div>
        )}
        {sale.tax && sale.tax > 0 && (
          <div className="flex justify-between">
            <span>مالیات ({toPersianNumber(sale.tax)}٪):</span>
            <span>{formatPersianCurrency(taxAmount)}</span>
          </div>
        )}
        <div className="border-t border-dashed border-black my-1"></div>
        <div className="flex justify-between text-base font-black items-center pt-1">
          <span>قابل پرداخت:</span>
          <span>{formatPersianCurrency(sale.totalAmount)}</span>
        </div>
      </div>

      {/* Thank you message */}
      <div className="text-center pt-4 mt-3 border-t border-dashed border-black text-[10px]">
        <p className="font-bold">از خرید شما سپاسگزاریم</p>
        <p>منتظر دیدار مجدد شما هستیم</p>
      </div>
    </div>
  );
});
