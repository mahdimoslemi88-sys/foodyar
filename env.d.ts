interface ImportMetaEnv {
  readonly VITE_ENABLE_AI?: string;
  readonly VITE_ENABLE_PROCUREMENT?: string;
  readonly VITE_ENABLE_KITCHENPREP?: string;
  readonly VITE_ENABLE_USERS?: string;
  readonly VITE_ENABLE_CRM?: string;
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
