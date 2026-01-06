import React, { useState, useEffect } from 'react';
import { ProcessedInvoiceItem, Ingredient, PurchaseInvoice, getConversionFactor, ALL_UNITS, normalizeUnit } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircle, Repeat, PackagePlus, AlertTriangle } from 'lucide-react';
import { getCostPerUsageUnit, getSafeConversionRate } from '../../domain/costing';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    invoiceData: { date: string | null; items: ProcessedInvoiceItem[] } | null;
}

export const InvoiceConfirmationModal: React.FC<Props> = ({ isOpen, onClose, invoiceData }) => {
    const { inventory, setInventory, setPurchaseInvoices, addAuditLogDetailed } = useRestaurantStore();
    const { showToast } = useToast();

    const [localInvoiceItems, setLocalInvoiceItems] = useState<ProcessedInvoiceItem[]>([]);
    const [unitErrors, setUnitErrors] = useState<Record<number, string | boolean>>({});

    const validateUnits = (items: ProcessedInvoiceItem[]) => {
        const errors: Record<number, string | boolean> = {};
        items.forEach((item, index) => {
            if (!item.isNew && item.matchedId) {
                const currentItem = inventory.find(i => i.id === item.matchedId);
                if (currentItem) {
                    const factor = getConversionFactor(item.unit, currentItem.usageUnit, currentItem);
                    if (factor === null) {
                        const normalizedInvoiceUnit = normalizeUnit(item.unit);
                        const isKnownCustomUnit = Object.keys(currentItem.customUnitConversions || {}).includes(normalizedInvoiceUnit);
                        
                        // It's a custom unit but this specific item doesn't have a conversion defined for it.
                        if (!isKnownCustomUnit) {
                             errors[index] = `برای واحد '${item.unit}' تبدیل تعریف نشده است.`;
                        } else {
                            // It's a generally incompatible unit (e.g. kg vs number)
                            errors[index] = true; 
                        }
                    }
                }
            }
        });
        setUnitErrors(errors);
    };

    useEffect(() => {
        if (isOpen && invoiceData) {
            const initialItems = invoiceData.items.map(item => ({...item}));
            setLocalInvoiceItems(initialItems);
            validateUnits(initialItems);
        }
    }, [isOpen, invoiceData, inventory]);


    if (!isOpen || !invoiceData) return null;

    const handleUnitChange = (index: number, newUnit: string) => {
        const updatedItems = localInvoiceItems.map((item, i) =>
            i === index ? { ...item, unit: newUnit } : item
        );
        setLocalInvoiceItems(updatedItems);
        validateUnits(updatedItems);
    };

    const handleConfirmInvoice = () => {
        const inventoryBefore = [...inventory];
        const invoiceDate = invoiceData.date ? new Date(invoiceData.date).getTime() : Date.now();
        let inventoryAfter = [...inventory];

        localInvoiceItems.forEach(item => {
            if (item.isNew) {
                const newIngredient: Ingredient = {
                    id: crypto.randomUUID(), name: item.name, usageUnit: item.unit, purchaseUnit: item.unit,
                    conversionRate: 1, currentStock: item.quantity, costPerUnit: item.costPerUnit, minThreshold: 0, 
                    purchaseHistory: [{ date: invoiceDate, quantity: item.quantity, costPerUnit: item.costPerUnit }], isDeleted: false,
                };
                inventoryAfter.push(newIngredient);
                addAuditLogDetailed('INVOICE_ADD', 'INVENTORY', newIngredient.id, null, newIngredient, `ایجاد کالا از طریق فاکتور: ${item.name}`, null);
            } else {
                inventoryAfter = inventoryAfter.map(invItem => {
                    if (invItem.id === item.matchedId) {
                        const factor = getConversionFactor(item.unit, invItem.usageUnit, invItem);
                        if (factor === null) return invItem;

                        const purchasedQtyInUsageUnit = item.quantity * factor;
                        const newTotalStock = invItem.currentStock + purchasedQtyInUsageUnit;
                        const currentVal = invItem.currentStock * getCostPerUsageUnit(invItem);
                        const purchaseVal = item.quantity * item.costPerUnit;
                        const newAvgCostPerUsageUnit = newTotalStock > 0 ? (currentVal + purchaseVal) / newTotalStock : getCostPerUsageUnit(invItem);
                        const newCostPerPurchaseUnit = newAvgCostPerUsageUnit * getSafeConversionRate(invItem);

                        const updatedItem = {
                            ...invItem, currentStock: newTotalStock, costPerUnit: Math.round(newCostPerPurchaseUnit),
                            purchaseHistory: [...(invItem.purchaseHistory || []), { date: invoiceDate, quantity: item.quantity, costPerUnit: item.costPerUnit }]
                        };

                        addAuditLogDetailed('INVOICE_ADD', 'INVENTORY', invItem.id, invItem, updatedItem, `افزایش موجودی از طریق فاکتور: ${item.name}`, null);
                        return updatedItem;
                    }
                    return invItem;
                });
            }
        });
        
        setInventory(inventoryAfter);

        const newInvoice: PurchaseInvoice = {
            id: crypto.randomUUID(), invoiceDate: invoiceDate,
            totalAmount: localInvoiceItems.reduce((sum, i) => sum + (i.quantity * i.costPerUnit), 0),
            status: 'unpaid',
            items: localInvoiceItems.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, costPerUnit: i.costPerUnit }))
        };
        setPurchaseInvoices(prev => [newInvoice, ...prev]);
        addAuditLogDetailed('CREATE', 'INVOICE', newInvoice.id, null, newInvoice, `ثبت فاکتور خرید با ${newInvoice.items.length} آیتم.`, null);

        onClose();
        showToast('فاکتور با موفقیت در انبار ثبت شد.');
    };

    const hasErrors = Object.values(unitErrors).some(err => err);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-800">تایید اطلاعات فاکتور</h3>
                    <p className="text-sm text-slate-400 font-bold mt-1">اطلاعات زیر از تصویر استخراج شد. پس از تایید، به انبار اضافه خواهد شد. {invoiceData.date && ` (تاریخ فاکتور: ${new Date(invoiceData.date).toLocaleDateString('fa-IR')})`}</p>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                     {hasErrors && (
                        <div className="p-4 bg-rose-50 border-l-4 border-rose-400 text-rose-700">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6"/>
                                <p className="font-bold">خطای تبدیل واحد</p>
                            </div>
                            <p className="text-sm mt-1">یک یا چند واحد با انبار سازگار نیستند. لطفا واحد صحیح را انتخاب کنید یا در بخش انبارداری، تبدیل واحد سفارشی را تعریف نمایید.</p>
                        </div>
                    )}
                    {localInvoiceItems.some(i => !i.isNew) && (
                        <div>
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Repeat className="w-5 h-5 text-indigo-500"/> به‌روزرسانی کالاهای موجود</h4>
                            <div className="space-y-2">
                                {localInvoiceItems.filter(i => !i.isNew).map((item, idx) => {
                                    const currentItem = inventory.find(i => i.id === item.matchedId);
                                    if (!currentItem) return null;
                                    const itemIndex = localInvoiceItems.indexOf(item);
                                    const error = unitErrors[itemIndex];
                                    const factor = getConversionFactor(item.unit, currentItem.usageUnit, currentItem);
                                    const newStock = currentItem.currentStock + (item.quantity * (factor || 0));

                                    return (
                                        <div key={idx} className={`border rounded-2xl p-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm items-center ${error ? 'bg-rose-50 border-rose-200' : 'bg-indigo-50 border-indigo-100'}`}>
                                            <span className={`font-bold ${error ? 'text-rose-900' : 'text-indigo-900'}`}>{item.name}</span>
                                            <span className={`text-slate-600 ${error ? 'line-through' : ''}`}>موجودی: {currentItem?.currentStock} → <span className="font-bold text-indigo-800">{newStock.toFixed(2)}</span></span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600 whitespace-nowrap">واحد فاکتور:</span>
                                                {error ? (
                                                     <select
                                                        value={item.unit}
                                                        onChange={(e) => handleUnitChange(itemIndex, e.target.value)}
                                                        className="bg-white border-rose-300 border-2 rounded-lg p-1 text-xs font-bold w-full"
                                                    >
                                                        <option value={item.unit} disabled>{item.unit || "انتخاب"}</option>
                                                        {ALL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                ) : <span className="font-bold">{item.unit}</span> }
                                            </div>
                                            <span className="text-slate-600">قیمت جدید: {item.costPerUnit.toLocaleString()} ت</span>
                                            {error && typeof error === 'string' && (
                                                <p className="text-xs font-bold text-rose-600 col-span-full mt-1">{error}</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {localInvoiceItems.some(i => i.isNew) && (
                        <div>
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><PackagePlus className="w-5 h-5 text-emerald-500" /> افزودن کالاهای جدید</h4>
                            <div className="space-y-2">
                                {localInvoiceItems.filter(i => i.isNew).map((item, idx) => (
                                    <div key={idx} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                        <span className="font-bold text-emerald-900">{item.name}</span>
                                        <span className="text-slate-600">مقدار: <span className="font-bold text-emerald-800">{item.quantity} {item.unit}</span></span>
                                        <span className="text-slate-600">قیمت: {item.costPerUnit.toLocaleString()} ت</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">انصراف</button>
                    <button onClick={handleConfirmInvoice} disabled={hasErrors} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <CheckCircle className="w-5 h-5" />
                        تایید و افزودن به انبار
                    </button>
                </div>
            </div>
        </div>
    );
};