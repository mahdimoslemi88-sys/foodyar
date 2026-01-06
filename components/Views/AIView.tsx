import React, { useState, useRef, useEffect } from 'react';
import { MenuItem, GeneratedRecipe, ManagerCopilotResponse, CopilotTask, AIRun, AIInsight, AIAction } from '../../types';
import { generateRestaurantAdvice, generateDailySpecial, generateManagerCopilotResponse } from '../../services/geminiService';
import { useRestaurantStore } from '../../store/restaurantStore';
import { Sparkles, Send, Bot, User, StopCircle, ChefHat, PlusCircle, CheckCircle, Key, TrendingUp, BrainCircuit, MessageSquare, ListTodo, Loader2, RefreshCw, AlertTriangle, Lightbulb, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '../../contexts/ToastContext';
import { validateAIRun } from '../../utils/aiValidation';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string | ManagerCopilotResponse | AIRun;
    timestamp: number;
    isError?: boolean;
    originalQuery?: string;
    validationErrors?: string[];
}

const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => (
    <div className="bg-white/10 p-4 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg shrink-0 text-indigo-200"><Lightbulb className="w-5 h-5"/></div>
        <div>
           <p className="font-bold text-slate-700 text-sm">{insight.title}</p>
           <p className="text-xs text-slate-500 mt-1">{insight.detail}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ action: AIAction }> = ({ action }) => (
    <div className="bg-white/10 p-4 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg shrink-0 text-indigo-200"><Wrench className="w-5 h-5"/></div>
        <div>
           <p className="font-bold text-slate-700 text-sm">{action.targetName}</p>
           <p className="text-xs text-slate-500 mt-1">{action.rationale}</p>
           {action.recommendedValue && <p className="text-xs text-amber-600 font-bold mt-1">مقدار پیشنهادی: {action.recommendedValue.toLocaleString()}</p>}
        </div>
    </div>
);


export const AIView: React.FC = () => {
    const store = useRestaurantStore();
    const { setMenu, addManagerTask } = store;
    const { showToast } = useToast();

    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const [hasApiKey, setHasApiKey] = useState(false);
    const [copilotMode, setCopilotMode] = useState(false);
    
    const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
    const [recipeAdded, setRecipeAdded] = useState(false);
    const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());

    const quickPrompts = [
        { text: "تحلیل سود و زیان این هفته", icon: "💰" },
        { text: "کدام مواد اولیه در حال فساد هستند؟", icon: "🥦" },
        { text: "راهکار کاهش هزینه منو", icon: "📉" }
    ];

    const getAIStudio = (): any | undefined => (window as any).aistudio;

    useEffect(() => {
        checkApiKey();
    }, []);

    const checkApiKey = async () => {
        const studio = getAIStudio();
        if (studio) {
            const hasKey = await studio.hasSelectedApiKey();
            setHasApiKey(hasKey);
        } else {
            // If aistudio is not available, assume API key is handled by env var and proceed.
            setHasApiKey(true);
        }
    };

    const handleSelectKey = async () => {
        const studio = getAIStudio();
        if (studio) {
            await studio.openSelectKey();
            setHasApiKey(true); // Assume success to avoid race condition
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading, generatedRecipe]);

    const handleSend = async (text: string) => {
        if (!text.trim() || loading) return;
        if (!hasApiKey && getAIStudio()) {
            handleSelectKey();
            return;
        }
        
        setGeneratedRecipe(null);
        setRecipeAdded(false);
        
        const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            let result: ManagerCopilotResponse | AIRun;
            if (copilotMode) {
                result = await generateManagerCopilotResponse(text, store);
            } else {
                result = await generateRestaurantAdvice(text, store);
            }

            const { ok, errors } = 'featureType' in result ? validateAIRun(result) : { ok: true, errors: [] };
            
            const aiMsg: Message = { 
                id: crypto.randomUUID(), 
                role: 'ai', 
                content: result, 
                timestamp: Date.now(),
                validationErrors: ok ? undefined : errors
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error: any) {
            if (error.message === 'RATE_LIMIT_ERROR') {
                showToast('لطفاً کمی بعد دوباره تلاش کنید.', 'warning');
                setMessages(prev => prev.slice(0, -1)); 
                setQuery(text);
                return;
            }

            let errorMessage = "خطا در برقراری ارتباط با هوش مصنوعی. لطفا اتصال اینترنت خود را بررسی کنید.";
            
            if (error.message === 'AUTH_ERROR') {
                errorMessage = "خطا در احراز هویت. کلید API شما معتبر نیست یا منقضی شده است. لطفا کلید خود را بررسی کرده و مجددا انتخاب کنید.";
                if (getAIStudio()) {
                    setHasApiKey(false);
                }
            }
            
            const aiMsg: Message = { 
                id: crypto.randomUUID(),
                role: 'ai', 
                content: errorMessage,
                timestamp: Date.now(),
                isError: true,
                originalQuery: text
            };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };
  
    const handleAddTask = (task: CopilotTask) => {
        const taskId = `${task.title}-${task.priority}`;
        if (addedTaskIds.has(taskId)) return;
        
        let dueAt: number | null = null;
        if (task.dueInHours) {
            dueAt = Date.now() + task.dueInHours * 60 * 60 * 1000;
        }

        addManagerTask({
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            evidence: task.evidence || [],
            source: 'copilot',
            assignedToUserId: null,
            createdByUserId: 'ai-copilot',
            dueAt: dueAt,
        });
        setAddedTaskIds(prev => new Set(prev.add(taskId)));
        showToast('وظیفه به مرکز عملیات اضافه شد.');
    };

    const handleGenerateSpecial = async () => {
        if (!hasApiKey && getAIStudio()) {
            handleSelectKey();
            return;
        }
        setLoading(true);
        setGeneratedRecipe(null);
        setRecipeAdded(false);
        try {
            const recipe = await generateDailySpecial(store.inventory);
            if (recipe) {
                const matchedIngredients = recipe.ingredients.map(ing => {
                    const found = store.inventory.find(inv => inv.name.toLowerCase() === ing.name.toLowerCase());
                    return { ...ing, ingredientId: found?.id || '' };
                }).filter(ing => ing.ingredientId);
                setGeneratedRecipe({ ...recipe, ingredients: matchedIngredients as any });
            }
        } catch (error: any) {
            if (error.message === 'AUTH_ERROR') {
                showToast("خطا در احراز هویت. لطفا کلید API خود را مجددا انتخاب کنید.", 'error');
                if (getAIStudio()) {
                    setHasApiKey(false);
                }
            } else {
                showToast("خطا در تولید پیشنهاد ویژه. اتصال اینترنت را بررسی کنید.", 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddRecipeToMenu = () => {
        if (!generatedRecipe) return;

        const newMenuItem: MenuItem = {
            id: crypto.randomUUID(),
            name: generatedRecipe.name,
            category: generatedRecipe.category,
            price: generatedRecipe.suggestedPrice,
            recipe: generatedRecipe.ingredients,
            isDeleted: false,
        };
        setMenu(prev => [...prev, newMenuItem]);
        setRecipeAdded(true);
        showToast(`${generatedRecipe.name} با موفقیت به منو اضافه شد.`, 'success');
    };

    if (!hasApiKey && getAIStudio()) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <Key className="w-16 h-16 text-slate-300 mb-6"/>
              <h2 className="text-2xl font-black text-slate-800 mb-2">کلید API گوگل مورد نیاز است</h2>
              <p className="text-slate-500 max-w-md mb-8">برای استفاده از قابلیت‌های هوش مصنوعی، لطفا کلید API خود را از Google AI Studio انتخاب کنید. این کلید فقط در مرورگر شما ذخیره می‌شود.</p>
              <button onClick={handleSelectKey} className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-xl shadow-slate-300 hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5"/>
                  انتخاب کلید API
              </button>
          </div>
      );
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-8 pt-24 pb-32 md:pb-8 md:pt-8 max-w-5xl mx-auto animate-in fade-in duration-500">
           <div className="flex flex-col md:flex-row items-center justify-between mb-8 px-2 gap-4">
             <div className="flex items-center gap-4 self-start md:self-auto">
                <div className={`w-14 h-14 bg-white border rounded-[20px] flex items-center justify-center shadow-lg ${copilotMode ? 'border-purple-100 shadow-purple-100/50' : 'border-slate-100 shadow-indigo-100/50'}`}>
                    {copilotMode ? <BrainCircuit className="w-7 h-7 text-purple-600" /> : <Sparkles className="w-7 h-7 text-indigo-600" />}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{copilotMode ? 'Manager Copilot' : 'AssistChef'}</h2>
                    <p className="text-sm font-bold text-slate-400">{copilotMode ? 'تحلیلگر و دستیار اجرایی شما' : 'دستیار هوشمند رستوران'}</p>
                </div>
             </div>
           </div>
    
           <div className="flex-1 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-50 overflow-hidden flex flex-col relative min-h-0">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar scroll-smooth">
                 {messages.length === 0 && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-0 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100 fill-mode-forwards">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                           <Bot className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">چطور می‌توانم کمک کنم؟</h3>
                        <p className="text-slate-400 font-medium max-w-md mb-10 leading-relaxed">من تمام داده‌های مالی و انبار شما را تحلیل می‌کنم تا بهترین تصمیم را بگیرید.</p>
                         {!copilotMode && (
                          <div className="flex flex-wrap justify-center gap-3">
                              {quickPrompts.map((p, i) => (
                                  <button key={i} onClick={() => handleSend(p.text)} className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                      {p.icon} {p.text}
                                  </button>
                              ))}
                              <button onClick={handleGenerateSpecial} className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                  <ChefHat className="w-4 h-4 text-indigo-500" /> پیشنهاد ویژه روز
                              </button>
                          </div>
                        )}
                   </div>
                 ) : (
                    <>
                    {messages.map((msg) => {
                        const isCopilotResponse = !msg.isError && typeof msg.content === 'object' && 'answerText' in msg.content;
                        const isAIRun = !msg.isError && typeof msg.content === 'object' && 'featureType' in msg.content;
                        const copilotData = isCopilotResponse ? (msg.content as ManagerCopilotResponse) : null;
                        const aiRunData = isAIRun ? (msg.content as AIRun) : null;
                        
                        const textContent = typeof msg.content === 'string' ? msg.content : 
                                            isCopilotResponse ? copilotData.answerText :
                                            isAIRun ? `تحلیل هوش مصنوعی برای ${aiRunData.featureType} دریافت شد.` :
                                            "خطا در پردازش پاسخ";

                        return (
                        <div key={msg.id}>
                            <div className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-100 ${msg.role === 'ai' ? (copilotMode ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600') : 'bg-slate-900 text-white'}`}>
                                    {msg.role === 'ai' ? (copilotMode ? <BrainCircuit className="w-5 h-5"/> : <Sparkles className="w-5 h-5" />) : <User className="w-5 h-5" />}
                               </div>
                               <div className={`max-w-[85%] rounded-[24px] px-6 py-5 leading-7 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : msg.isError || msg.validationErrors ? 'bg-rose-50 border border-rose-100 text-rose-700 rounded-tl-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
                                   {msg.validationErrors ? (
                                     <div>
                                         <p className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/>خطای اعتبارسنجی</p>
                                         <p className="text-xs mb-2">پاسخ هوش مصنوعی با ساختار مورد انتظار مطابقت ندارد:</p>
                                         <ul className="text-xs list-disc list-inside bg-rose-100 p-2 rounded-md">
                                             {msg.validationErrors.map((e,i) => <li key={i}>{e}</li>)}
                                         </ul>
                                     </div>
                                   ) : (
                                       <ReactMarkdown className="prose prose-sm prose-slate max-w-none">{textContent}</ReactMarkdown>
                                   )}
                               </div>
                            </div>
    
                            {msg.isError && msg.originalQuery && (
                                <div className={`mt-2 ${msg.role === 'user' ? 'mr-14' : 'ml-14'}`}>
                                    <button
                                        onClick={() => handleSend(msg.originalQuery!)}
                                        className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3"/>
                                        تلاش مجدد
                                    </button>
                                </div>
                            )}

                            {aiRunData && !msg.validationErrors && (
                                <div className="mt-4 ml-14 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {aiRunData.insights.length > 0 && (
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-indigo-500"/> بینش‌های کلیدی</h4>
                                            <div className="space-y-2">
                                                {aiRunData.insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}
                                            </div>
                                        </div>
                                    )}
                                    {aiRunData.actions.length > 0 && (
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2"><Wrench className="w-4 h-4 text-indigo-500"/> اقدامات پیشنهادی</h4>
                                            <div className="space-y-2">
                                                {aiRunData.actions.map((action) => <ActionCard key={action.id} action={action} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )})}
                    {generatedRecipe && (
                      <div className="ml-14 animate-in fade-in duration-500">
                          <div className="bg-white border border-slate-100 rounded-2xl p-4">
                              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2"><ChefHat className="w-4 h-4 text-indigo-500"/> پیشنهاد ویژه روز</h4>
                              <p className="font-bold text-indigo-700">{generatedRecipe.name}</p>
                              <p className="text-xs text-slate-500">{generatedRecipe.description}</p>
                              <button onClick={handleAddRecipeToMenu} disabled={recipeAdded} className={`mt-3 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${recipeAdded ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                                  {recipeAdded ? <CheckCircle className="w-3.5 h-3.5"/> : <PlusCircle className="w-3.5 h-3.5"/>}
                                  {recipeAdded ? 'اضافه شد' : 'افزودن به منو'}
                              </button>
                          </div>
                      </div>
                    )}
                    {loading && (
                        <div className="flex gap-5 animate-in fade-in duration-500">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-100 ${copilotMode ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}><Sparkles className="w-5 h-5 animate-pulse" /></div>
                            <div className="max-w-[85%] rounded-[24px] px-6 py-5 leading-7 shadow-sm bg-white border border-slate-100 text-slate-700 rounded-tl-none"><Loader2 className="w-5 h-5 animate-spin" /></div>
                        </div>
                    )}
                    </>
                 )}
              </div>
    
              <div className="p-4 md:p-6 bg-white border-t border-slate-50">
                 <div className="flex items-center justify-center mb-3 gap-2">
                     <span className={`text-xs font-bold ${!copilotMode ? 'text-slate-800' : 'text-slate-400'}`}>AssistChef</span>
                     <button onClick={() => setCopilotMode(!copilotMode)} className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors ${copilotMode ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                         <span className="w-4 h-4 bg-white rounded-full shadow-md"></span>
                     </button>
                     <span className={`text-xs font-bold ${copilotMode ? 'text-purple-700' : 'text-slate-400'}`}>Manager Copilot</span>
                 </div>
                 <div className="relative max-w-4xl mx-auto">
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend(query)} placeholder={copilotMode ? 'دستور خود را وارد کنید...' : 'سوال خود را بپرسید...'} className={`w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-none rounded-3xl pl-6 pr-16 py-5 focus:ring-2 ${copilotMode ? 'focus:ring-purple-100' : 'focus:ring-indigo-100'} transition-all font-bold text-slate-800 placeholder:text-slate-300 shadow-sm`} disabled={loading}/>
                    <button onClick={() => handleSend(query)} disabled={!query.trim() || loading} className={`absolute right-2 top-2 bottom-2 aspect-square rounded-[20px] flex items-center justify-center transition-all ${loading ? 'bg-transparent text-slate-400' : query ? `${copilotMode ? 'bg-purple-600' : 'bg-slate-900'} text-white shadow-lg hover:scale-105 active:scale-95` : 'bg-transparent text-slate-300 cursor-not-allowed'}`}>
                      {loading ? <StopCircle className="w-6 h-6 animate-pulse" /> : <Send className="w-5 h-5" />}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      );
};