// config/features.ts

// Helper to parse boolean from environment variables
const getFlag = (envVar: string | undefined, defaultValue: boolean): boolean => {
  if (envVar === undefined) return defaultValue;
  return envVar === 'true';
};

// --- Feature Flags ---
// Use these flags to conditionally enable/disable features across the app.
// This is useful for phased rollouts, A/B testing, or simplifying the UI for certain tenants.

// Enables the AI Assistant (AssistChef) view and features.
export const enableAI: boolean = getFlag(import.meta?.env?.VITE_ENABLE_AI, true);

// Enables the smart procurement and supplier management view.
export const enableProcurement: boolean = getFlag(import.meta?.env?.VITE_ENABLE_PROCUREMENT, true);

// Enables the kitchen prep (Mise en place) view.
export const enableKitchenPrep: boolean = getFlag(import.meta?.env?.VITE_ENABLE_KITCHENPREP, true);

// Enables the user management view for managers.
export const enableUsers: boolean = getFlag(import.meta?.env?.VITE_ENABLE_USERS, true);

// Enables the Customer Relationship Management (CRM) view.
export const enableCRM: boolean = getFlag(import.meta?.env?.VITE_ENABLE_CRM, true);

// Controls the demo mode behavior (e.g., password validation for demo accounts).
export const isDemoMode: boolean = getFlag(import.meta?.env?.VITE_DEMO_MODE, true);