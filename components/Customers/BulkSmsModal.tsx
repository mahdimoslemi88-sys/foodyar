import React, { useState } from 'react';
import { Customer } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { X, MessageSquare, Send, Loader2 } from 'lucide-react';

interface BulkSmsModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipients: Customer[];
    onSendComplete: () => void;
}

export const BulkSmsModal: React.FC<BulkSmsModalProps> = ({ isOpen, onClose, recipients, onSendComplete }) => {
    const { showToast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;
    
    const insertPlaceholder = (placeholder: string) => {
        setMessage(prev => `${prev} ${placeholder} `);
    };

    const handleSend = async () => {
        if (!message.trim() || recipients.length === 0) {
            showToast('متن پیام خالی است یا گیرنده‌ای انتخاب نشده.', 'error');
            return;
        }

        setIsSending(true);
        // Simulate sending SMS
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log(`Simulating bulk SMS send to ${recipients.length} customers.`);
        recipients.forEach(customer => {
            const personalizedMessage = message.replace(/{{نام}}/g, customer.fullName || customer.phoneNumber);
            console.log(`To: ${customer.phoneNumber}, Message: ${personalizedMessage}`);
        });

        setIsSending(false);
        showToast(`پیامک گروهی برای ${recipients.length} مشتری با موفقیت ارسال شد.`, 'success');
        onSendComplete();
    };


    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="w-6 h-6 text-indigo-500" />ارسال پیامک گروهی</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm font-bold text-slate-600">ارسال به <span className="text-indigo-600 font-extrabold">{recipients.length}</span> مشتری انتخاب شده</p>
                    <textarea 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="متن پیامک خود را اینجا بنویسید..."
                        className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">افزودن متغیر:</span>
                        <button onClick={() => insertPlaceholder('{{نام}}')} className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">نام مشتری</button>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">انصراف</button>
                    <button 
                        onClick={handleSend}
                        disabled={isSending}
                        className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
                        {isSending ? 'در حال ارسال...' : 'ارسال پیامک'}
                    </button>
                </div>
            </div>
        </div>
    );
};
