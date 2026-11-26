/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface MonacoEnvironmentConfig {
  getWorker: (workerId: string, label: string) => Worker;
}

interface Window {
  MonacoEnvironment?: MonacoEnvironmentConfig;
}

declare const self: Window & typeof globalThis;
