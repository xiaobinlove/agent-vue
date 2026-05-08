export const DEV_PROXY_PREFIX = '/__pulse_proxy__'

function trimTrailingSlash(value = '') {
  return value.replace(/\/$/, '')
}

function ensureEnv(name: string, value: string | undefined) {
  const resolved = value?.trim()
  if (!resolved) {
    throw new Error(`${name} 未配置，无法初始化流程智能体页面。`)
  }

  return resolved
}

function isAbsoluteUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function resolveOptionalEnv(value: string | undefined) {
  const resolved = value?.trim()
  return resolved || ''
}

export function getRuntimeBaseConfig() {
  const pulseBaseUrl = trimTrailingSlash(
    ensureEnv('VITE_PULSE_BASE_URL', import.meta.env.VITE_PULSE_BASE_URL),
  )
  const agentBasePath = ensureEnv(
    'VITE_BASE_AGENT_PATH',
    import.meta.env.VITE_BASE_AGENT_PATH,
  )
  const aiAgentBasePath = ensureEnv(
    'VITE_BASE_AIAGENT_PATH',
    import.meta.env.VITE_BASE_AIAGENT_PATH,
  )

  const requestBaseUrl =
    import.meta.env.DEV && isAbsoluteUrl(pulseBaseUrl)
      ? DEV_PROXY_PREFIX
      : pulseBaseUrl

  return {
    pulseBaseUrl,
    requestBaseUrl,
    agentBasePath,
    aiAgentBasePath,
  }
}

export function getFlowDialogId() {
  return ensureEnv('VITE_FLOW_DIALOG_ID', import.meta.env.VITE_FLOW_DIALOG_ID)
}

export function getRequestAuthConfig() {
  const userToken = resolveOptionalEnv(import.meta.env.VITE_ZOV_USER_TOKEN)
  const shareToken = resolveOptionalEnv(import.meta.env.VITE_ZOV_SHARE_TOKEN)

  if (!userToken && !shareToken) {
    throw new Error('VITE_ZOV_USER_TOKEN 或 VITE_ZOV_SHARE_TOKEN 未配置，无法初始化流程智能体页面。')
  }

  return {
    userToken,
    shareToken,
  }
}
