import type { GlobalSettings } from './global-settings-types'

// Why shared: the CLI compiles shared/ itself, so its per-launch Codex preflight needs no out/main entry.
export function isAgentStatusHooksEnabled(
  settings: Partial<Pick<GlobalSettings, 'agentStatusHooksEnabled'>> | null | undefined
): boolean {
  return settings?.agentStatusHooksEnabled !== false
}
