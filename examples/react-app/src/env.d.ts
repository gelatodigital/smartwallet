/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DYNAMIC_ENVIRONMENT_ID: string;
  readonly VITE_SPONSOR_API_KEY: string;
  readonly VITE_PRIVY_ENVIRONMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
