import { useState } from 'react'
import { isMobileTuiAgentEnabled } from '../tasks/mobile-tui-agents'
import {
  NEW_WORKTREE_AGENT_OPTIONS,
  NEW_WORKTREE_BLANK_AGENT,
  resolveNewWorktreeAgentSelection,
  type NewWorktreeAgentOption,
  type NewWorktreeRuntimeSettings
} from './new-worktree-agent-selection'

export function useNewWorkspaceAgentSelection(args: {
  visible: boolean
  runtimeSettings: NewWorktreeRuntimeSettings | null
  detectedAgentIds: Set<string> | null
}): {
  selectedAgent: NewWorktreeAgentOption
  /** True when the user picked the agent; otherwise it is the automatic pick. */
  agentOverridden: boolean
  setSelectedAgent: (agent: NewWorktreeAgentOption) => void
  setAgentOverridden: (overridden: boolean) => void
  pickerAgentOptions: NewWorktreeAgentOption[]
} {
  const [selectedAgentState, setSelectedAgent] = useState<NewWorktreeAgentOption>(
    NEW_WORKTREE_AGENT_OPTIONS[0]!
  )
  const [agentOverriddenState, setAgentOverridden] = useState(false)
  const resolution = resolveNewWorktreeAgentSelection({
    visible: args.visible,
    selectedAgent: selectedAgentState,
    agentOverridden: agentOverriddenState,
    runtimeSettings: args.runtimeSettings,
    detectedAgentIds: args.detectedAgentIds
  })
  if (
    selectedAgentState.id !== resolution.selectedAgent.id ||
    agentOverriddenState !== resolution.agentOverridden
  ) {
    setSelectedAgent(resolution.selectedAgent)
    setAgentOverridden(resolution.agentOverridden)
  }
  // The current choice stays listed even when hidden in Settings, so the picker can show it.
  const visibleAgentOptions = NEW_WORKTREE_AGENT_OPTIONS.filter(
    (agent) =>
      agent.id !== '__blank__' &&
      (args.detectedAgentIds === null || args.detectedAgentIds.has(agent.id)) &&
      (agent.id === resolution.selectedAgent.id ||
        isMobileTuiAgentEnabled(agent.id, args.runtimeSettings?.disabledTuiAgents))
  )
  return {
    selectedAgent: resolution.selectedAgent,
    agentOverridden: resolution.agentOverridden,
    setSelectedAgent,
    setAgentOverridden,
    pickerAgentOptions: [...visibleAgentOptions, NEW_WORKTREE_BLANK_AGENT]
  }
}
