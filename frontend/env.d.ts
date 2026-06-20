/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** ws(s)://host:port/websocket — defaults to the current host on :7125 */
  readonly VITE_MOONRAKER_WS_URL?: string
  /** Optional document-title override. */
  readonly VITE_APP_TITLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Injected by Vite at build time from package.json. */
declare const __APP_VERSION__: string
