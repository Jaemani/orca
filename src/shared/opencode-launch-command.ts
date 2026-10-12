import { getCommandTokenPathBasename, getFirstCommandToken } from './command-token-scanner'
import type { TuiAgent } from './tui-agent'

function openCodeCommandAgent(launchCommand: string | undefined): 'opencode' | 'opencode2' | null {
  const binary = getCommandTokenPathBasename(getFirstCommandToken(launchCommand ?? ''))
    .toLowerCase()
    .replace(/\.(?:cmd|exe|sh)$/, '')
  return binary === 'opencode' || binary === 'opencode2' ? binary : null
}

export function isOpenCode2LaunchCommand(launchCommand: string | undefined): boolean {
  return openCodeCommandAgent(launchCommand) === 'opencode2'
}

export function selectOpenCodeHookAgent(
  launchAgent: TuiAgent | undefined,
  launchCommand: string | undefined,
  hooksEnabled: boolean
): 'opencode' | 'opencode2' | null {
  if (!hooksEnabled) {
    return null
  }
  const explicit =
    launchAgent === 'opencode' || launchAgent === 'opencode2'
      ? launchAgent
      : launchAgent === undefined
        ? openCodeCommandAgent(launchCommand)
        : null
  // An explicit version selects its own integration.
  return explicit ?? 'opencode'
}
