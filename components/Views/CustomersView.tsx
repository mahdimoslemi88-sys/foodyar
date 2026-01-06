import React, { useState, useMemo, useEffect } from 'react';
import { Customer, CustomerSegment } from '../../types';
import { useRestaurantStore } from '../../store/restaurantStore';
import { useToast } from '../../contexts/ToastContext';
import { Heart, Search, Award, Star, Phone, Edit3, X, History, Gift, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { EmptyState } from '../EmptyState';
import { determineCustomerSegment } from '../../domain/customer';
import { BulkSmsModal } from '../Customers/BulkSmsModal';

const timeAgo = (timestamp: number) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " سال پیش";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " ماه پیش";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " روز پیش";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " ساعت پیش";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " دقیقه پیش";
    return "همین الان";
};

const getSegmentStyle = (segment: CustomerSegment) => {
    const styles: Record<CustomerSegment, string> = {
        vip: 'bg-purple-100 text-purple-700',
        loyal: 'bg-emerald-100 text-emerald-700',
        new: 'bg-blue-100 text-blue-700',
        slipping: 'bg-amber-100 text-amber-700',
        churned: 'bg-rose-100 text-rose-700'
    };
    const labels: Record<CustomerSegment, string> = {
        vip: 'VIP', loyal: 'وفادار', new: 'جدید', slipping: 'در حال ریزش', churned: 'ریزش کرده'
    }
    return { className: styles[segment] || 'bg-slate-100 text-slate-700', label: labels[segment] || 'نامشخص' };
};

const segmentFilters: { id: CustomerSegment | 'all', label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: 'vip', label: 'VIP' },
    { id: 'loyal', label: 'وفادار' },
    { id: 'new', label: 'جدید' },
    { id: 'slipping', label: 'در حال ریزش' },
    { id: 'churned', label: 'ریزش کرده' },
];

export const CustomersView: React.FC = () => {
    const { customers, setCustomers, sales, menu } = useRestaurantStore();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'lastVisit' | 'totalSpent'>('lastVisit');
    const [filterBySegment, setFilterBySegment] = useState<CustomerSegment | 'all'>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
    const [isBulkSmsModalOpen, setIsBulkSmsModalOpen] = useState(false);

    useEffect(() => {
        const updates: { id: string, segment: CustomerSegment }[] = [];
        customers.forEach(customer => {
            const newSegment = determineCustomerSegment(customer);
            if (customer.segment !== newSegment) {
                updates.push({ id: customer.id, segment: newSegment });
            }
        });

        if (updates.length > 0) {
            setCustomers(currentCustomers => 
                currentCustomers.map(c => {
                    const updatedInfo = updates.find(u => u.id === c.id);
                    return updatedInfo ? { ...c, segment: updatedInfo.segment } : c;
                })
            );
        }
    }, [customers, setCustomers]);

    useEffect(() => {
        setSelectedCustomers(new Set());
    }, [filterBySegment]);

    const segmentCounts = useMemo(() => {
        const counts: Record<CustomerSegment | 'all', number> = { all: 0, vip: 0, loyal: 0, new: 0, slipping: 0, churned: 0 };
        customers.filter(c => !c.isDeleted).forEach(c => {
            counts.all++;
            if (counts[c.segment] !== undefined) {
                counts[c.segment]++;
            }
        });
        return counts;
    }, [customers]);

    const processedCustomers = useMemo(() => {
        return customers
            .filter(c => !c.isDeleted &&
                (filterBySegment === 'all' || c.segment === filterBySegment) &&
                (c.phoneNumber.includes(searchQuery) || c.fullName?.toLowerCase().includes(searchQuery.toLowerCase())))
            .sort((a, b) => {
                if (sortBy === 'lastVisit') return b.lastVisit - a.lastVisit;
                if (sortBy === 'totalSpent') return b.totalSpent - a.totalSpent;
                return 0;
            });
    }, [customers, searchQuery, sortBy, filterBySegment]);
    
    const selectedCustomerObjects = useMemo(() => {
        return customers.filter(c => selectedCustomers.has(c.id));
    }, [customers, selectedCustomers]);

    const handleEditName = (customerId: string) => {
        const currentName = customers.find(c => c.id === customerId)?.fullName || '';
        const newName = prompt('نام جدید مشتری را وارد کنید:', currentName);
        if (newName !== null) {
            setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, fullName: newName.trim() } : c));
        }
    };

    const handleAddPoints = (customerId: string) => {
        const pointsStr = prompt('تعداد امتیاز برای افزودن را وارد کنید:');
        if (pointsStr) {
            const pointsToAdd = parseInt(pointsStr, 10);
            if (!isNaN(pointsToAdd) && pointsToAdd > 0) {
                setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, loyaltyPoints: c.loyaltyPoints + pointsToAdd } : c));
                showToast(`${pointsToAdd} امتیاز با موفقیت اضافه شد.`, 'success');
            } else {
                showToast('لطفا یک عدد صحیح مثبت وارد کنید.', 'error');
            }
        }
    };

    const favoriteItemsData = useMemo(() => {
        if (!selectedCustomer) return [];
        return selectedCustomer.favoriteItems
            .map(fav => {
                const menuItem = menu.find(m => m.id === fav.itemId);
                return { name: menuItem?.name || 'آیتم حذف شده', count: fav.count };
            })
            .sort((a, b) => a.count - b.count).slice(-3);
    }, [selectedCustomer, menu]);

    const toggleSelection = (customerId: string) => {
        setSelectedCustomers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(customerId)) newSet.delete(customerId); else newSet.add(customerId);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedCustomers.size === processedCustomers.length) {
            setSelectedCustomers(new Set());
        } else {
            setSelectedCustomers(new Set(processedCustomers.map(c => c.id)));
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><Heart className="w-8 h-8 text-indigo-600" />باشگاه مشتریان</h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">{processedCustomers.length} عضو</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1">
                         <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                         <input type="text" placeholder="جستجوی نام یا شماره موبایل..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold shadow-sm" />
                    </div>
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        <button onClick={()=>setSortBy('lastVisit')} className={`px-3 py-2 rounded-xl text-xs font-bold ${sortBy === 'lastVisit' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>آخرین بازدید</button>
                        <button onClick={()=>setSortBy('totalSpent')} className={`px-3 py-2 rounded-xl text-xs font-bold ${sortBy === 'totalSpent' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>بیشترین هزینه</button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
                {segmentFilters.map(filter => (
                     <button key={filter.id} onClick={() => setFilterBySegment(filter.id)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex-1 md:flex-none ${filterBySegment === filter.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {filter.label} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${filterBySegment === filter.id ? 'bg-white/20' : 'bg-slate-100'}`}>{segmentCounts[filter.id]}</span>
                    </button>
                ))}
            </div>

            {processedCustomers.length === 0 ? (
                 <EmptyState icon={<Heart className="w-12 h-12" />} title="مشتری یافت نشد" description="هیچ مشتری با فیلترهای انتخاب شده مطابقت ندارد. برای شروع مجدد، فیلترها را تغییر دهید." />
            ) : (
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-right">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 w-10 text-center"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={processedCustomers.length > 0 && selectedCustomers.size === processedCustomers.length} onChange={toggleSelectAll} /></th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">مشتری</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">سطح</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">تعداد مراجعه</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">جمع هزینه</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">امتیاز</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">آخرین بازدید</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {processedCustomers.map(c => {
                            const segmentStyle = getSegmentStyle(c.segment);
                            return (
                                <tr key={c.id} onClick={() => setSelectedCustomer(c)} className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedCustomers.has(c.id) ? 'bg-indigo-50' : ''}`}>
                                    <td className="p-4 text-center"><input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={selectedCustomers.has(c.id)} onChange={() => toggleSelection(c.id)} onClick={e => e.stopPropagation()} /></td>
                                    <td className="p-4" onClick={() => setSelectedCustomer(c)}>
                                        <p className="font-bold text-slate-800 text-sm">{c.fullName || c.phoneNumber}</p>
                                        {c.fullName && <p className="text-xs text-slate-400 font-mono">{c.phoneNumber}</p>}
                                    </td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-black ${segmentStyle.className}`}>{segmentStyle.label}</span></td>
                                    <td className="p-4 font-mono font-bold text-slate-600 text-sm">{c.totalVisits}</td>
                                    <td className="p-4 font-mono font-bold text-indigo-700 text-sm">{c.totalSpent.toLocaleString()}</td>
                                    <td className="p-4 font-mono font-bold text-amber-600 text-sm">{c.loyaltyPoints}</td>
                                    <td className="p-4 text-xs text-slate-500">{timeAgo(c.lastVisit)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            )}
            
            {selectedCustomer && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-50 rounded-[32px] w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-200 bg-white rounded-t-[32px] flex justify-between items-start">
                           <div>
                            <h3 className="text-xl font-black text-slate-800">{selectedCustomer.fullName || selectedCustomer.phoneNumber}</h3>
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-black ${getSegmentStyle(selectedCustomer.segment).className}`}>{getSegmentStyle(selectedCustomer.segment).label}</span>
                                <a href={`tel:${selectedCustomer.phoneNumber}`} className="flex items-center gap-1 text-xs text-slate-500 font-bold hover:text-indigo-600"><Phone className="w-3 h-3" /> تماس</a>
                                <button onClick={() => handleEditName(selectedCustomer.id)} className="flex items-center gap-1 text-xs text-slate-500 font-bold hover:text-indigo-600"><Edit3 className="w-3 h-3" /> ویرایش نام</button>
                                <a href={`sms:${selectedCustomer.phoneNumber}`} className="flex items-center gap-1 text-xs text-slate-500 font-bold hover:text-indigo-600"><Award className="w-3 h-3" /> ارسال پیامک</a>
                                <button onClick={() => handleAddPoints(selectedCustomer.id)} className="flex items-center gap-1 text-xs text-slate-500 font-bold hover:text-indigo-600"><Gift className="w-3 h-3" /> افزودن امتیاز</button>
                            </div>
                           </div>
                           <button onClick={() => setSelectedCustomer(null)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border-b border-slate-200">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100"><p className="text-xs text-slate-400 font-bold">جمع هزینه</p><p className="font-extrabold text-indigo-700 text-lg">{selectedCustomer.totalSpent.toLocaleString()}</p></div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100"><p className="text-xs text-slate-400 font-bold">تعداد مراجعه</p><p className="font-extrabold text-slate-700 text-lg">{selectedCustomer.totalVisits}</p></div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100"><p className="text-xs text-slate-400 font-bold">میانگین فاکتور</p><p className="font-extrabold text-slate-700 text-lg">{Math.round(selectedCustomer.averageOrderValue).toLocaleString()}</p></div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100"><p className="text-xs text-slate-400 font-bold">امتیاز وفاداری</p><p className="font-extrabold text-amber-600 text-lg">{selectedCustomer.loyaltyPoints}</p></div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Star className="w-5 h-5 text-amber-500"/> آیتم‌های محبوب</h4>
                                {favoriteItemsData.length > 0 ? (
                                    <div className="w-full h-40" dir="ltr">
                                        <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={favoriteItemsData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12, fill: '#334155' }} /><Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', fontFamily: 'Vazirmatn' }} formatter={(value: number) => [value, 'تعداد']} /><Bar dataKey="count" fill="#818cf8" radius={[0, 8, 8, 0]} barSize={20} /></BarChart></ResponsiveContainer>
                                    </div>
                                ) : (<p className="text-sm text-slate-400 text-center py-4 bg-white rounded-xl border border-slate-100">هنوز آیتم محبوبی ثبت نشده.</p>)}
                            </div>
                             <div>
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500"/> تاریخچه خرید</h4>
                                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">{sales.filter(s => s.customerId === selectedCustomer.id).slice().reverse().map(sale => (<div key={sale.id} className="bg-white p-3 rounded-xl border border-slate-100"><div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-700">{sale.totalAmount.toLocaleString()} تومان</span><span className="text-xs text-slate-400">{new Date(sale.timestamp).toLocaleDateString('fa-IR')}</span></div><p className="text-xs text-slate-400 mt-1">{sale.items.map(i => menu.find(m=>m.id === i.menuItemId)?.name).join(' • ')}</p></div>))}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {selectedCustomers.size > 0 && (
                <div className="fixed bottom-24 md:bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-30 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-4 text-white shadow-2xl shadow-slate-900/20 flex justify-between items-center">
                        <p className="font-bold text-sm">{selectedCustomers.size} مشتری انتخاب شده</p>
                        <button onClick={() => setIsBulkSmsModalOpen(true)} className="bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-600 active:scale-95 transition-colors">
                            <MessageSquare className="w-4 h-4" />ارسال پیامک گروهی
                        </button>
                    </div>
                </div>
            )}

            <BulkSmsModal 
                isOpen={isBulkSmsModalOpen}
                onClose={() => setIsBulkSmsModalOpen(false)}
                recipients={selectedCustomerObjects}
                onSendComplete={() => {
                    setIsBulkSmsModalOpen(false);
                    setSelectedCustomers(new Set());
                }}
            />
        </div>
    );
};
