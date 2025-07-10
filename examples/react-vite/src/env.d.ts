/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WAAS_APP_ID: string;
  readonly VITE_GELATO_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
