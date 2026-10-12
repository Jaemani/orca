import type { PluginSources } from '../../wsl-guest/plugin-overlay'
import { isAgentStatusHooksEnabled } from '../../shared/agent-status-hooks-setting'
import type { ManagedHookDetectionSettings } from './managed-hook-detection-commands'

export function openCodePluginSettingsKey(settings: ManagedHookDetectionSettings): string {
  return String(isAgentStatusHooksEnabled(settings))
}

export function selectOpenCodePluginSources(
  sources: PluginSources,
  settings: ManagedHookDetectionSettings
): PluginSources {
  if (isAgentStatusHooksEnabled(settings)) {
    return sources
  }
  // Older relays retain omitted sources; an empty string replaces the cache and cannot write a plugin.
  return { ...sources, opencodePluginSource: '', opencode2PluginSource: '' }
}
