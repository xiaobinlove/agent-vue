/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PULSE_BASE_URL: string
  readonly VITE_BASE_AGENT_PATH: string
  readonly VITE_BASE_AIAGENT_PATH: string
  readonly VITE_FLOW_DIALOG_ID: string
  readonly VITE_ZOV_USER_TOKEN: string
  readonly VITE_ZOV_SHARE_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
