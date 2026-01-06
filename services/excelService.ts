import * as XLSX from 'xlsx';
import {
    Sale,
    MenuItem,
    Ingredient,
    PurchaseInvoice,
    Expense
} from '../types';
import { calculateInventoryItemValue } from '../domain/costing';

// Generic helper function to export data to an Excel file
const exportToExcel = (data: any[], fileName: string): void => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    // The file will be named "fileName.xlsx"
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// --- Specific Export Functions ---

/**
 * Exports sales data to an Excel file with Persian headers.
 * @param sales - Array of sales objects.
 * @param menu - Array of menu items to look up item names.
 */
export const exportSales = (sales: Sale[], menu: MenuItem[]): void => {
    const paymentMethodMap: Record<string, string> = {
        'cash': 'نقد',
        'card': 'کارتخوان',
        'online': 'آنلاین',
        'void': 'لغو شده'
    };

    const formattedData = sales.map(sale => {
        const itemsSummary = sale.items
            .map(item => {
                const menuItem = menu.find(m => m.id === item.menuItemId);
                return `${menuItem ? menuItem.name : 'نامشخص'} (${item.quantity} عدد)`;
            })
            .join('، ');

        return {
            'شماره فاکتور': sale.invoiceNumber,
            'تاریخ': new Date(sale.timestamp).toLocaleDateString('fa-IR'),
            'ساعت': new Date(sale.timestamp).toLocaleTimeString('fa-IR'),
            'مبلغ کل (تومان)': sale.totalAmount,
            'روش پرداخت': paymentMethodMap[sale.paymentMethod || ''] || 'نامشخص',
            'اقلام': itemsSummary,
        };
    });

    exportToExcel(formattedData, 'گزارش_فروش');
};

/**
 * Exports inventory data to an Excel file with Persian headers.
 * @param inventory - Array of ingredient objects.
 */
export const exportInventory = (inventory: Ingredient[]): void => {
    const formattedData = inventory.map(item => ({
        'نام کالا': item.name,
        'موجودی': item.currentStock,
        'واحد': item.usageUnit,
        'قیمت واحد (تومان)': item.costPerUnit,
        'ارزش کل (تومان)': Math.round(calculateInventoryItemValue(item)),
    }));
    exportToExcel(formattedData, 'گزارش_موجودی');
};

/**
 * Exports purchase invoices data to an Excel file with Persian headers.
 * @param invoices - Array of purchase invoice objects.
 */
export const exportPurchases = (invoices: PurchaseInvoice[]): void => {
    const formattedData = invoices.flatMap(invoice => 
        invoice.items.map(item => ({
            'تاریخ': new Date(invoice.invoiceDate).toLocaleDateString('fa-IR'),
            'تامین‌کننده': invoice.supplierId || 'نامشخص', // As supplier name is not in the model
            'شماره فاکتور': invoice.invoiceNumber || 'ندارد',
            'نام کالا': item.name,
            'تعداد': item.quantity,
            'قیمت واحد (تومان)': item.costPerUnit,
        }))
    );
    exportToExcel(formattedData, 'گزارش_خرید');
};

/**
 * Exports expenses data to an Excel file with Persian headers.
 * @param expenses - Array of expense objects.
 */
export const exportExpenses = (expenses: Expense[]): void => {
    const categoryMap: Record<string, string> = {
        'rent': 'اجاره',
        'salary': 'حقوق',
        'utilities': 'قبوض',
        'marketing': 'تبلیغات',
        'maintenance': 'تعمیرات',
        'other': 'سایر'
    };
    
    const formattedData = expenses.map(expense => ({
        'تاریخ': new Date(expense.date).toLocaleDateString('fa-IR'),
        'دسته‌بندی': categoryMap[expense.category] || 'نامشخص',
        'عنوان': expense.title,
        'مبلغ (تومان)': expense.amount,
    }));

    exportToExcel(formattedData, 'گزارش_هزینه‌ها');
};
