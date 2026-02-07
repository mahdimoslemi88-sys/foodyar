import { GoogleGenAI, Type } from "@google/genai";
import { 
    Ingredient, MenuItem, Sale, GeneratedRecipe, Expense, ProcessedInvoiceItem,
    AIRun, OperationalForecast, PrepTask, Supplier,
    DailyBrief, ManagerCopilotResponse, normalizeUnit, WasteRecord
} from "../types";
import { calculateRecipeCost } from "../domain/pricing";
import { calculateInventoryItemValue } from "../domain/costing";
import { generateDailyBrief } from "../utils/dailyBrief";
import * as aiCache from './aiCacheService';
import { validateAIRun } from "../utils/aiValidation";

const RATE_LIMIT_SECONDS = 45;
const CACHE_TTL_SECONDS = 3600; // 1 hour

// Helper to safely get the API key
const getApiKey = () => {
  // The AIView component ensures window.aistudio handles the selection before this is called
  return process.env.API_KEY || '';
};

// Centralized error handler for Gemini API calls
const handleGeminiError = (error: any): never => {
    if (error.message === 'RATE_LIMIT_ERROR') throw error; // Pass rate limit errors through
    
    console.error("Gemini Service Error:", error);
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStatus = error.status;

    // Check for common API key / authentication errors
    if (
        errorStatus === 403 ||
        errorMessage.includes("403") || 
        errorMessage.includes("api key not valid") ||
        errorMessage.includes("requested entity was not found")
    ) {
        throw new Error("AUTH_ERROR");
    }
    
    // For other errors, assume network/timeout
    throw new Error("NETWORK_ERROR");
}


interface FullState {
  inventory: Ingredient[];
  menu: MenuItem[];
  sales: Sale[];
  expenses: Expense[];
  wasteRecords: WasteRecord[];
  prepTasks: PrepTask[];
}

// Construct the system prompt with a KPI-driven JSON context
const createSystemInstruction = (state: FullState) => {
  const { inventory, menu, sales, wasteRecords, prepTasks } = state;

  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Today's KPIs
  const salesToday = sales.filter(s => s.timestamp >= todayStart);
  const revenueToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
  const cogsToday = salesToday.reduce((sum, s) => sum + s.totalCost, 0);
  const grossMarginToday = revenueToday > 0 ? ((revenueToday - cogsToday) / revenueToday) * 100 : 0;

  // Last 7 Days KPIs
  const salesLast7Days = sales.filter(s => s.timestamp >= sevenDaysAgo);
  const revenueLast7Days = salesLast7Days.reduce((sum, s) => sum + s.totalAmount, 0);

  const itemSalesQty = new Map<string, number>();
  const itemSalesProfit = new Map<string, number>();

  const menuMap = new Map(menu.map(m => [m.id, m]));
  const inventoryMap = new Map(inventory.map(i => [i.id, i]));
  const prepMap = new Map(prepTasks.map(p => [p.id, p]));

  salesLast7Days.forEach(sale => {
      sale.items.forEach(item => {
          const menuItem = menuMap.get(item.menuItemId);
          if (menuItem) {
              itemSalesQty.set(menuItem.name, (itemSalesQty.get(menuItem.name) || 0) + item.quantity);
              const cost = calculateRecipeCost(menuItem.recipe, inventoryMap, prepMap);
              const profitPerItem = menuItem.price - cost;
              itemSalesProfit.set(menuItem.name, (itemSalesProfit.get(menuItem.name) || 0) + (profitPerItem * item.quantity));
          }
      });
  });

  const top5ByQty = [...itemSalesQty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity }));
  const top5ByProfit = [...itemSalesProfit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, profit]) => ({ name, profit: Math.round(profit) }));

  // Inventory KPIs
  const lowStockItems = inventory
      .filter(i => !i.isDeleted && i.minThreshold > 0 && i.currentStock <= i.minThreshold)
      .sort((a, b) => (a.currentStock / a.minThreshold) - (b.currentStock / b.minThreshold))
      .slice(0, 10)
      .map(i => ({ name: i.name, stock: i.currentStock.toFixed(2), unit: i.usageUnit, threshold: i.minThreshold }));
      
  const highValueItems = inventory
      .filter(i => !i.isDeleted)
      .map(i => ({ name: i.name, value: Math.round(calculateInventoryItemValue(i)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

  // Waste KPI
  const wasteLast7Days = wasteRecords
      .filter(w => w.date >= sevenDaysAgo)
      .reduce((sum, w) => sum + w.costLoss, 0);
      
  // Anomalies
  const brief = generateDailyBrief(state);
  const anomalies = brief.anomalies.map(a => a.description);
  
  const contextPayload = {
      today: {
          revenue: revenueToday,
          invoiceCount: salesToday.length,
          estimatedCOGS: cogsToday,
          grossMarginPercent: grossMarginToday.toFixed(1)
      },
      last7Days: {
          totalRevenue: revenueLast7Days,
          topItemsByQuantity: top5ByQty,
          topItemsByProfit: top5ByProfit
      },
      inventory: {
          lowStockItems: lowStockItems,
          highValueItems: highValueItems
      },
      waste: {
          totalLossLast7Days: wasteLast7Days
      },
      alerts: anomalies
  };
  
  return `
  You are "AssistChef", an AI assistant for the Foodyar 2 restaurant management system.
  Your persona: A professional, data-driven, and concise business analyst for restaurants.
  Your entire analysis MUST be based *only* on the JSON context provided below. Do not invent data.

  **Restaurant KPIs Context:**
  \`\`\`json
  ${JSON.stringify(contextPayload, null, 2)}
  \`\`\`

  **Your Task:**
  Analyze the user's query in light of the provided context. Your response must be in Persian and conform to the AIRun JSON schema.
  - Generate 2-3 key insights based on the data.
  - Generate 1-2 actionable tasks of type 'INVESTIGATE'.
  `;
};

// Base schema for AIRun to be reused
const aiRunSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        featureType: { type: Type.STRING, enum: ['PROCUREMENT', 'MARGIN', 'ALERTS'] },
        model: { type: Type.STRING },
        promptVersion: { type: Type.NUMBER },
        contextHash: { type: Type.STRING },
        dataWindow: { type: Type.OBJECT, properties: { start: { type: Type.NUMBER }, end: { type: Type.NUMBER } } },
        insights: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING }, title: { type: Type.STRING }, detail: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['LOW', 'MED', 'HIGH'], nullable: true },
                    createdAt: { type: Type.NUMBER }
                }
            },
            // FIX: Make insights nullable to handle cases where Gemini might not return it.
            nullable: true 
        },
        actions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    actionType: { type: Type.STRING, enum: ['BUY', 'PRICE_CHANGE', 'PREP_CHANGE', 'INVESTIGATE'] },
                    targetType: { type: Type.STRING, enum: ['INGREDIENT', 'MENU_ITEM', 'GENERAL'] },
                    targetId: { type: Type.STRING },
                    targetName: { type: Type.STRING },
                    recommendedValue: { type: Type.NUMBER, nullable: true }, // For price or quantity
                    unit: { type: Type.STRING, nullable: true },
                    rationale: { type: Type.STRING },
                    expectedImpact: { type: Type.STRING, nullable: true },
                    confidence: { type: Type.STRING, enum: ['LOW', 'MED', 'HIGH'] },
                    createdAt: { type: Type.NUMBER },
                    supplierId: { type: Type.STRING, nullable: true }
                }
            }
        },
        validation: { type: Type.OBJECT, properties: { isValid: { type: Type.BOOLEAN } } },
        createdAt: { type: Type.NUMBER }
    }
};

export const generateRestaurantAdvice = async (
  query: string,
  state: FullState,
): Promise<AIRun> => {
  const cacheKey = aiCache.getCacheKey('advice-v2', { query, ...state });
  if (aiCache.isRateLimited('advice-v2', RATE_LIMIT_SECONDS)) {
      throw new Error('RATE_LIMIT_ERROR');
  }
  const cachedData = aiCache.getFromCache<AIRun>(cacheKey, CACHE_TTL_SECONDS);
  if (cachedData) {
      return cachedData;
  }
  aiCache.recordRequest('advice-v2');

  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Missing");

    const ai = new GoogleGenAI({ apiKey });
    const instruction = createSystemInstruction(state);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: instruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: aiRunSchema
      }
    });

    const result = JSON.parse(response.text || '{}') as AIRun;
    
    // Post-process and validate
    const { ok, errors } = validateAIRun(result);
    result.validation = { isValid: ok, errors };

    aiCache.setInCache(cacheKey, result);
    return result;

  } catch (error: any) {
    handleGeminiError(error);
  }
};


export const generateManagerCopilotResponse = async (
  query: string,
  state: { inventory: Ingredient[], menu: MenuItem[], sales: Sale[], expenses: Expense[] }
): Promise<ManagerCopilotResponse> => {
    const cacheKey = aiCache.getCacheKey('copilot', { query, ...state });
    if (aiCache.isRateLimited('copilot', RATE_LIMIT_SECONDS)) {
        throw new Error('RATE_LIMIT_ERROR');
    }
    const cachedData = aiCache.getFromCache<ManagerCopilotResponse>(cacheKey, CACHE_TTL_SECONDS);
    if (cachedData) {
        return cachedData;
    }
    aiCache.recordRequest('copilot');

    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key Missing");
        const ai = new GoogleGenAI({ apiKey });

        const stateSummary = `
            Inventory count: ${state.inventory.length}, 
            Menu items: ${state.menu.length}, 
            Today's sales count: ${state.sales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).length}
        `;

        const systemInstruction = `
            You are "Manager Copilot", an AI assistant for restaurant managers. Your persona is a senior business analyst: data-driven, strategic, and action-oriented.
            You will receive a user query and a summary of the current restaurant state.
            Your task is to analyze the query in the context of the data and provide a structured JSON response.

            RULES:
            1.  Your entire output MUST be a single, valid JSON object that conforms to the provided schema.
            2.  'answerText': Provide a concise, professional answer in Persian. Address the manager directly.
            3.  'tasks': Based on your analysis, generate a list of actionable tasks. If no tasks are necessary, return an empty array [].
            4.  'questionsToAsk': Provide 2-3 relevant follow-up questions in Persian to guide the manager towards deeper insights.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                answerText: { type: Type.STRING, description: "A conversational, insightful answer in Persian." },
                tasks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            category: { type: Type.STRING, enum: ['sales', 'inventory', 'procurement', 'staff', 'quality', 'finance', 'other'] },
                            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                            dueInHours: { type: Type.NUMBER, nullable: true },
                            evidence: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING, enum: ['metric', 'link', 'text'] },
                                        label: { type: Type.STRING },
                                        value: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                },
                questionsToAsk: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `User Query: "${query}"\nState Summary: ${stateSummary}`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
                temperature: 0.5,
            }
        });
        
        const text = response.text || '{}';
        const result = JSON.parse(text) as ManagerCopilotResponse;
        aiCache.setInCache(cacheKey, result);
        return result;

    } catch (error: any) {
        handleGeminiError(error);
    }
};


export const explainDailyBrief = async (briefData: DailyBrief): Promise<string> => {
    const cacheKey = aiCache.getCacheKey('brief-explain', briefData);
    if (aiCache.isRateLimited('brief-explain', RATE_LIMIT_SECONDS)) {
        throw new Error('RATE_LIMIT_ERROR');
    }
    const cachedData = aiCache.getFromCache<string>(cacheKey, CACHE_TTL_SECONDS);
    if (cachedData) {
        return cachedData;
    }
    aiCache.recordRequest('brief-explain');

    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key Missing");

        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `
            You are "AssistChef", an AI restaurant management consultant.
            You will be given a JSON object containing a daily brief of the restaurant's performance.
            Your task is to provide a short, insightful, and actionable summary for the manager, in Persian.
            Address the manager directly. Be encouraging but also direct about problems.
            Keep the response under 100 words.
        `;
        
        const simplifiedBrief = {
            ...briefData,
            lowStockItems: briefData.lowStockItems.map(i => i.name),
            topSellingItemsToday: briefData.topSellingItemsToday.map(i => i.item.name),
        };

        const prompt = `Here is today's brief:\n${JSON.stringify(simplifiedBrief, null, 2)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.8
            }
        });
        
        const result = response.text || "تحلیل هوش مصنوعی در حال حاضر ممکن نیست.";
        aiCache.setInCache(cacheKey, result);
        return result;

    } catch (error: any) {
        handleGeminiError(error);
    }
};

export const generateDailySpecial = async (
  inventory: Ingredient[]
): Promise<GeneratedRecipe> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Missing");

    const ai = new GoogleGenAI({ apiKey });

    // Identify overstocked or high-value items to push
    const stockInfo = inventory.map(i => ({
      name: i.name,
      stock: i.currentStock,
      unit: i.usageUnit
    }));

    const prompt = `
      به عنوان سرآشپز خلاق، موجودی زیر را بررسی کن:
      ${JSON.stringify(stockInfo)}

      ماموریت:
      یک "پیشنهاد ویژه روز" (Daily Special) بساز که مواد با موجودی بالا را مصرف کند.
      
      خروجی فقط JSON باشد:
      {
        "name": "نام غذا",
        "description": "توضیح کوتاه و جذاب",
        "category": "غذا/پیش‌غذا",
        "suggestedPrice": 0,
        "ingredients": [ {"name": "ماده", "amount": 0, "unit": "..."} ],
        "reasoning": "چرا این غذا؟"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8, 
      }
    });

    const text = (response.text || '').trim().replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) throw new Error("No response from AI.");
    
    return JSON.parse(text) as GeneratedRecipe;

  } catch (error: any) {
    handleGeminiError(error);
  }
};

export interface ProcessedSalesData {
  processedSales: {
    itemName: string;
    quantity: number;
    pricePerItem: number;
  }[];
  newItemsFound: {
    name: string;
    price: number;
    category: string;
  }[];
}

export const processSalesFile = async (
  csvContent: string,
  currentMenu: MenuItem[]
): Promise<ProcessedSalesData> => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key is missing");

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `
          You are an AI assistant for a restaurant POS system. Your task is to process the content of an uploaded file, which is provided to you as a CSV string, representing daily sales.
          You will receive the CSV content and the restaurant's current menu as a JSON array.

          Your instructions:
          1. Analyze the CSV content to identify sales records. Each record should have an item name, quantity sold, and price per item. The first row is likely the header. Common headers might be 'Product', 'Qty', 'Price', 'Total'. Be flexible with header names in any language, especially Persian (نام کالا, تعداد, قیمت).
          2. For each sold item, compare its name to the 'name' field in the provided menu JSON.
          3. Create a JSON output with two keys: "processedSales" and "newItemsFound".
          4. "processedSales" must be an array of objects, each with "itemName" (string), "quantity" (number), and "pricePerItem" (number).
          5. If you find an item in the sales data that is NOT in the current menu, add it to the "newItemsFound" array. This should be an object with "name" (string), "price" (number), and "category" (string, guess from 'غذا', 'نوشیدنی', 'دسر', 'پیش‌غذا').
          6. Handle potential inconsistencies gracefully. If a row is malformed, skip it. Ensure all numbers are parsed correctly, removing currency symbols or commas.
          7. Your entire response MUST be a single valid JSON object adhering to the specified schema. Do not add any explanatory text outside the JSON.
        `;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
              processedSales: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemName: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    pricePerItem: { type: Type.NUMBER }
                  },
                  required: ["itemName", "quantity", "pricePerItem"]
                }
              },
              newItemsFound: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ["name", "price", "category"]
                }
              }
            }
        };

        const prompt = `
          Current Menu for reference:
          ${JSON.stringify(currentMenu.map(m => ({name: m.name, id: m.id})))}

          Please process the following sales data in CSV format:
          --- CSV START ---
          ${csvContent}
          --- CSV END ---
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
                temperature: 0.1
            }
        });

        const text = (response.text || '').trim().replace(/```json/g, '').replace(/```/g, '').trim();
        if (!text) throw new Error("No response from AI.");

        return JSON.parse(text) as ProcessedSalesData;

    } catch (error: any) {
        handleGeminiError(error);
    }
};

export const analyzeRecipe = async (
  menuItem: MenuItem,
  inventory: Ingredient[]
): Promise<string> => {
  const cacheKey = aiCache.getCacheKey('recipe-analysis', { menuItem, inventory });
  if (aiCache.isRateLimited('recipe-analysis', RATE_LIMIT_SECONDS)) {
    throw new Error('RATE_LIMIT_ERROR');
  }
  const cachedData = aiCache.getFromCache<string>(cacheKey, CACHE_TTL_SECONDS);
  if (cachedData) {
    return cachedData;
  }
  aiCache.recordRequest('recipe-analysis');
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Missing");

    const ai = new GoogleGenAI({ apiKey });

    const recipeDetails = menuItem.recipe.map(r => {
      const ing = inventory.find(i => i.id === r.ingredientId);
      return {
        name: ing?.name || 'ماده اولیه ناشناس',
        amount: r.amount,
        unit: r.unit,
        cost: ing ? ing.costPerUnit * r.amount : 0 // Simplified cost
      };
    });

    const inventoryStatus = inventory.map(i => ({
        name: i.name,
        stock: i.currentStock,
        unit: i.usageUnit,
        cost: i.costPerUnit
    }));

    const prompt = `
      شما یک مشاور هوشمند رستوران به نام AssistChef هستید.
      وظیفه شما تحلیل دستور پخت یک آیتم منو و ارائه پیشنهادات عملی برای بهبود آن است.

      آیتم منو برای تحلیل:
      - نام: ${menuItem.name}
      - قیمت فروش: ${menuItem.price}
      - دستور پخت فعلی: ${JSON.stringify(recipeDetails)}

      وضعیت فعلی انبار:
      ${JSON.stringify(inventoryStatus)}

      اهداف تحلیل (پاسخ خود را به فارسی ارائه دهید):
      1.  **بهینه‌سازی هزینه:** آیا می‌توان مواد اولیه گران‌قیمت را با جایگزین‌های ارزان‌تر از انبار تعویض کرد بدون اینکه کیفیت به شدت افت کند؟ آیا مقدار برخی مواد اولیه بیش از حد است؟
      2.  **استفاده از موجودی انبار:** آیا مواد اولیه‌ای با موجودی بالا در انبار وجود دارد که بتوان آن‌ها را در این دستور پخت گنجاند تا ضایعات کاهش یابد؟
      3.  **بهبود طعم و کیفیت:** پیشنهاداتی خلاقانه برای بهتر کردن طعم غذا ارائه دهید. به ترکیب طعم‌ها، بافت و ظاهر غذا فکر کنید.
      4.  **سودآوری:** به طور خلاصه در مورد سودآوری این آیتم بر اساس قیمت تمام شده و قیمت فروش آن نظر دهید.

      یک پاسخ کوتاه، بولت‌پوینت و در قالب Markdown ارائه دهید. خلاق و کاربردی باشید.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            temperature: 0.8,
        }
    });
    
    const result = response.text || "در حال حاضر امکان ارائه پیشنهاد وجود ندارد.";
    aiCache.setInCache(cacheKey, result);
    return result;

  } catch (error: any) {
    handleGeminiError(error);
  }
};

export const processInvoiceImage = async (
  base64Image: string,
  mimeType: string,
  currentInventory: Ingredient[]
): Promise<{ invoiceDate: string | null; items: ProcessedInvoiceItem[] }> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are an expert data extraction AI for restaurant purchase invoices. Your task is to analyze the provided image of a purchase invoice and extract all line items.
    For each line item, you must identify:
    1.  The name of the item (e.g., "گوجه فرنگی", "پیاز").
    2.  The quantity purchased.
    3.  The unit of measurement (e.g., "kg", "gram", "عدد", "بسته"). Standardize common units.
    4.  The price PER UNIT (not the total price for the line).
    5.  Also, find the invoice date from anywhere on the document.

    You will be given a list of existing inventory items for reference. Use this list to match names if possible, but prioritize what is written on the invoice.
    Your entire response MUST be a single, valid JSON object that conforms to the provided schema. Do not include any text outside of the JSON structure.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        invoiceDate: { 
          type: Type.STRING, 
          description: "Date from invoice in YYYY-MM-DD format, if found. Otherwise null." 
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              costPerUnit: { type: Type.NUMBER }
            },
            required: ["name", "quantity", "unit", "costPerUnit"]
          }
        }
      }
    };
    
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const textPart = {
      text: `
        Existing inventory names for reference (use for matching if names are similar):
        ${JSON.stringify(currentInventory.map(i => i.name))}
        
        Please process the invoice image.
      `
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1,
      }
    });

    const text = (response.text || '').trim().replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) throw new Error("No response from AI.");

    const extractedData = JSON.parse(text) as { invoiceDate: string | null; items: Omit<ProcessedInvoiceItem, 'isNew' | 'matchedId'>[] };

    if (!extractedData.items) return { invoiceDate: null, items: [] };

    // Normalize units before matching
    const itemsWithNormalizedUnits = extractedData.items.map(item => ({
        ...item,
        unit: normalizeUnit(item.unit),
    }));

    // Client-side matching logic
    const processedItems = itemsWithNormalizedUnits.map(item => {
      const lowerCaseItemName = item.name.toLowerCase().trim();
      const match = currentInventory.find(invItem =>
        lowerCaseItemName.includes(invItem.name.toLowerCase().trim()) ||
        invItem.name.toLowerCase().trim().includes(lowerCaseItemName)
      );

      if (match) {
        return { ...item, isNew: false, matchedId: match.id };
      } else {
        return { ...item, isNew: true, matchedId: undefined };
      }
    });

    return { invoiceDate: extractedData.invoiceDate, items: processedItems };

  } catch (error: any) {
    handleGeminiError(error);
  }
};


// --- ADVANCED AI FUNCTIONS ---

export const generateMenuEngineeringAnalysis = async (
  menu: MenuItem[],
  sales: Sale[],
  inventory: Ingredient[],
  prepTasks: PrepTask[]
): Promise<AIRun> => {
    const context = {
        menu: menu.map(m => ({ id: m.id, name: m.name, price: m.price, recipeCount: m.recipe.length })),
        sales: sales.map(s => ({ itemsCount: s.items.length, total: s.totalAmount })),
    };
    const cacheKey = aiCache.getCacheKey('menu-eng-v2', context);
    if(aiCache.isRateLimited('menu-eng-v2', RATE_LIMIT_SECONDS)) throw new Error('RATE_LIMIT_ERROR');
    const cachedData = aiCache.getFromCache<AIRun>(cacheKey, CACHE_TTL_SECONDS);
    if(cachedData) return cachedData;
    aiCache.recordRequest('menu-eng-v2');

  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key Missing");
    const ai = new GoogleGenAI({ apiKey });

    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    const prepMap = new Map(prepTasks.map(p => [p.id, p]));

    // Pre-aggregate sales by menuItemId
    const salesByItem = new Map<string, number>();
    sales.forEach(sale => {
      sale.items.forEach(si => {
        salesByItem.set(si.menuItemId, (salesByItem.get(si.menuItemId) || 0) + si.quantity);
      });
    });

    const salesData = menu.map(item => {
      const salesCount = salesByItem.get(item.id) || 0;
      const cost = calculateRecipeCost(item.recipe, inventoryMap, prepMap);
      return { id: item.id, name: item.name, salesCount, profit: item.price - cost };
    });

    const systemInstruction = `
      You are an expert restaurant consultant AI. Your task is to perform a "Menu Engineering" analysis based on the provided sales data.
      You must classify each menu item into one of four categories based on its profitability (profit) and popularity (salesCount): star, plowhorse, puzzle, dog.
      For each item, provide one insight and one actionable recommendation of type 'PRICE_CHANGE' or 'INVESTIGATE'.
      Your entire response MUST be a single valid JSON object and be in Persian.
    `;
    
    const prompt = `Sales Data:\n${JSON.stringify(salesData)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction, responseMimeType: 'application/json', responseSchema: aiRunSchema, temperature: 0.3 }
    });

    const result = JSON.parse(response.text || '{}') as AIRun;
    const { ok, errors } = validateAIRun(result);
    result.validation = { isValid: ok, errors };

    aiCache.setInCache(cacheKey, result);
    return result;

  } catch (error: any) {
    handleGeminiError(error);
  }
};

export const generateProcurementForecast = async (
    sales: Sale[],
    inventory: Ingredient[],
    suppliers: Supplier[]
): Promise<AIRun> => {
    const cacheKey = aiCache.getCacheKey('procurement-v2', { sales, inventory, suppliers });
    if(aiCache.isRateLimited('procurement-v2', RATE_LIMIT_SECONDS)) throw new Error('RATE_LIMIT_ERROR');
    const cachedData = aiCache.getFromCache<AIRun>(cacheKey, CACHE_TTL_SECONDS);
    if(cachedData) return cachedData;
    aiCache.recordRequest('procurement-v2');

    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key Missing");
        const ai = new GoogleGenAI({ apiKey });

        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentSales = sales.filter(s => s.timestamp > thirtyDaysAgo);
        const inventoryData = inventory.map(i => ({ id: i.id, name: i.name, stock: i.currentStock, unit: i.usageUnit, supplierId: i.supplierId, minThreshold: i.minThreshold }));

        const systemInstruction = `
            You are an AI procurement expert for a restaurant. Your task is to generate a smart shopping list as a series of 'BUY' actions.
            You will receive historical sales data and current inventory levels.
            Your goal is to forecast necessary ingredients for the next 7 days.
            1. Analyze sales data to understand consumption patterns.
            2. For each inventory item that is below its minimum threshold or that you forecast will run out, create one 'BUY' action.
            3. The 'recommendedValue' should be the quantity to order. It should be a sensible amount for about 7-10 days of operations.
            4. Include the 'supplierId' in the action if it's available for the ingredient.
            Your entire response MUST be a single valid JSON object and in Persian.
        `;

        const prompt = `
            Recent Sales Count: ${recentSales.length}
            Current Inventory: ${JSON.stringify(inventoryData)}
            Suppliers: ${JSON.stringify(suppliers)}
            Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}. Generate the shopping list.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { systemInstruction, responseMimeType: 'application/json', responseSchema: aiRunSchema, temperature: 0.2 }
        });
        
        const result = JSON.parse(response.text || '{}') as AIRun;
        const { ok, errors } = validateAIRun(result);
        result.validation = { isValid: ok, errors };

        aiCache.setInCache(cacheKey, result);
        return result;

    } catch (error: any) {
        handleGeminiError(error);
    }
};

export const generateOperationalForecast = async (
    sales: Sale[],
    prepTasks: PrepTask[]
): Promise<OperationalForecast> => {
    const cacheKey = aiCache.getCacheKey('operational', { sales, prepTasks });
    if(aiCache.isRateLimited('operational', RATE_LIMIT_SECONDS)) throw new Error('RATE_LIMIT_ERROR');
    const cachedData = aiCache.getFromCache<OperationalForecast>(cacheKey, CACHE_TTL_SECONDS);
    if(cachedData) return cachedData;
    aiCache.recordRequest('operational');

    try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API Key Missing");
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `
            You are an AI Sous-Chef. Your task is to generate a prioritized prep list for tomorrow's service.
            Analyze the historical sales data to forecast which menu items will be popular tomorrow.
            Based on this forecast, create a list of prep tasks (Mise en place) that the kitchen staff needs to complete.
            Assign a priority ('high', 'medium', 'low') to each task based on the forecasted demand and the complexity of the prep item.
            Your entire response MUST be a single valid JSON object.
        `;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            forecastDate: { type: Type.NUMBER },
            summary: { type: Type.STRING, description: "A brief summary of the forecast for tomorrow in Persian." },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  prepTaskId: { type: Type.STRING },
                  prepTaskName: { type: Type.STRING },
                  quantityToPrep: { type: Type.NUMBER },
                  priority: { type: Type.STRING },
                  reasoning: { type: Type.STRING, description: "Brief reasoning for the priority in Persian." }
                },
                required: ["prepTaskId", "prepTaskName", "quantityToPrep", "priority", "reasoning"]
              }
            }
          }
        };
        
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentSales = sales.filter(s => s.timestamp > thirtyDaysAgo);

        const prompt = `
            Recent Sales: ${JSON.stringify(recentSales.map(s => ({ timestamp: s.timestamp, items: s.items.length })))}
            Available Prep Tasks: ${JSON.stringify(prepTasks.map(p => ({ id: p.id, name: p.item, unit: p.unit, onHand: p.onHand, parLevel: p.parLevel })))}
            Tomorrow will be ${new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' })}. Generate the prioritized prep list.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { systemInstruction, responseMimeType: 'application/json', responseSchema, temperature: 0.4 }
        });

        const text = (response.text || '').trim().replace(/```json/g, '').replace(/```/g, '').trim();
        if (!text) throw new Error("No response from AI.");
        const result = JSON.parse(text) as OperationalForecast;
        const resultWithTimestamp = { ...result, forecastDate: Date.now() };
        aiCache.setInCache(cacheKey, resultWithTimestamp);
        return resultWithTimestamp;

    } catch (error: any) {
        handleGeminiError(error);
    }
};