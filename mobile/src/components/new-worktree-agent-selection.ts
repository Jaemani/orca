import type { TuiAgent } from '../../../src/shared/tui-agent'
import { MOBILE_AGENT_CATALOG } from '../tasks/mobile-agent-catalog'
import { pickWorkspaceAgent } from '../tasks/workspace-agent-selection'

export type NewWorktreeRuntimeSettings = {
  defaultTuiAgent?: TuiAgent | 'blank' | null
  disabledTuiAgents?: TuiAgent[]
}

export type NewWorktreeAgentOption = {
  id: TuiAgent | '__blank__'
  label: string
  faviconDomain?: string
}

export const NEW_WORKTREE_AGENT_OPTIONS: NewWorktreeAgentOption[] = MOBILE_AGENT_CATALOG

export const NEW_WORKTREE_BLANK_AGENT: NewWorktreeAgentOption = {
  id: '__blank__',
  label: 'Blank Terminal'
}

export function newWorktreeAgentOptionFor(id: string | null | undefined): NewWorktreeAgentOption {
  if (id === 'blank' || id === '__blank__') {
    return NEW_WORKTREE_BLANK_AGENT
  }
  return NEW_WORKTREE_AGENT_OPTIONS.find((agent) => agent.id === id) ?? NEW_WORKTREE_BLANK_AGENT
}

export function pickPreferredNewWorktreeAgent(
  settings: NewWorktreeRuntimeSettings | null,
  detectedAgentIds: Set<string> | null
): NewWorktreeAgentOption {
  return newWorktreeAgentOptionFor(
    pickWorkspaceAgent(
      {
        defaultTuiAgent: settings?.defaultTuiAgent,
        disabledTuiAgents: settings?.disabledTuiAgents
      },
      detectedAgentIds
    )
  )
}

// A chosen agent stays chosen even when hidden in Settings; only an undetected one is dropped.
function isSelectableAgent(
  agent: NewWorktreeAgentOption,
  detectedAgentIds: Set<string> | null
): boolean {
  return agent.id === '__blank__' || detectedAgentIds === null || detectedAgentIds.has(agent.id)
}

export function resolveNewWorktreeAgentSelection({
  visible,
  selectedAgent,
  agentOverridden,
  runtimeSettings,
  detectedAgentIds
}: {
  visible: boolean
  selectedAgent: NewWorktreeAgentOption
  agentOverridden: boolean
  runtimeSettings: NewWorktreeRuntimeSettings | null
  detectedAgentIds: Set<string> | null
}): { selectedAgent: NewWorktreeAgentOption; agentOverridden: boolean } {
  if (!visible) {
    return { selectedAgent, agentOverridden }
  }

  const preferred = pickPreferredNewWorktreeAgent(runtimeSettings, detectedAgentIds)
  if (!agentOverridden) {
    return { selectedAgent: preferred, agentOverridden: false }
  }

  if (detectedAgentIds !== null && !isSelectableAgent(selectedAgent, detectedAgentIds)) {
    return { selectedAgent: preferred, agentOverridden: false }
  }

  return { selectedAgent, agentOverridden: true }
}
