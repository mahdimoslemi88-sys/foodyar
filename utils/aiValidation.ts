import { AIRun, AIFeatureType, AIActionType, AITargetType, AIConfidence } from '../types';

const hasKeys = <T extends object>(obj: any, keys: (keyof T)[]): obj is T => {
    if (typeof obj !== 'object' || obj === null) return false;
    return keys.every(key => key in obj);
};

export const validateAIRun = (run: any): { ok: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!run || typeof run !== 'object') {
        return { ok: false, errors: ['ساختار اصلی پاسخ نامعتبر است.'] };
    }

    // Top-level AIRun validation
    if (typeof run.id !== 'string' || !run.id) errors.push('شناسه (`id`) برای اجرای هوش مصنوعی وجود ندارد.');
    if (typeof run.featureType !== 'string' || !['PROCUREMENT', 'MARGIN', 'ALERTS'].includes(run.featureType)) {
        errors.push('نوع قابلیت (`featureType`) نامعتبر است.');
    }
    if (!Array.isArray(run.insights)) errors.push('بخش بینش‌ها (`insights`) باید یک آرایه باشد.');
    if (!Array.isArray(run.actions)) errors.push('بخش اقدامات (`actions`) باید یک آرایه باشد.');

    // Insights validation
    (run.insights || []).forEach((insight: any, index: number) => {
        if (!hasKeys(insight, ['id', 'title', 'detail'])) {
            errors.push(`بینش شماره ${index + 1} فاقد فیلدهای ضروری (id, title, detail) است.`);
        }
    });

    // Actions validation
    (run.actions || []).forEach((action: any, index: number) => {
        if (!hasKeys(action, ['id', 'actionType', 'targetType', 'targetId', 'targetName', 'rationale', 'confidence'])) {
            errors.push(`اقدام شماره ${index + 1} فاقد فیلدهای ضروری است.`);
            return; // Skip further checks for this malformed action
        }
        if (!['BUY', 'PRICE_CHANGE', 'PREP_CHANGE', 'INVESTIGATE'].includes(action.actionType)) {
             errors.push(`نوع اقدام (${action.actionType}) در اقدام شماره ${index + 1} نامعتبر است.`);
        }
        if (!['INGREDIENT', 'MENU_ITEM', 'GENERAL'].includes(action.targetType)) {
             errors.push(`نوع هدف (${action.targetType}) در اقدام شماره ${index + 1} نامعتبر است.`);
        }
        if (!['LOW', 'MED', 'HIGH'].includes(action.confidence)) {
             errors.push(`میزان اطمینان (${action.confidence}) در اقدام شماره ${index + 1} نامعتبر است.`);
        }
    });

    return {
        ok: errors.length === 0,
        errors: errors,
    };
};
