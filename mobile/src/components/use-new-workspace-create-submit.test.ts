import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_RETIRED_NAME_REGISTRY } from '../../../src/shared/worktree/retired-name-registry'
import type { RpcClient } from '../transport/rpc-client'
import { newWorktreeAgentOptionFor } from './new-worktree-agent-selection'
import { useNewWorkspaceCreateSubmit } from './use-new-workspace-create-submit'

type SubmitArgs = Parameters<typeof useNewWorkspaceCreateSubmit>[0]

// The host has hidden Claude since the sheet read its settings, when Claude was the default.
function hostClient() {
  const sendRequest = vi.fn(async (method: string, _params?: unknown) => {
    const result =
      method === 'settings.get'
        ? { settings: { defaultTuiAgent: 'claude', disabledTuiAgents: ['claude'] } }
        : { worktree: { id: 'wt-1', displayName: 'recorded' } }
    return { id: 'x', ok: true, result, _meta: { runtimeId: 'r' } }
  })
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a non-replaying create reaches only `sendRequest` on the client.
  return { client: { sendRequest } as unknown as RpcClient, sendRequest }
}

describe('useNewWorkspaceCreateSubmit agent', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  async function createWith(agentOverridden: boolean): Promise<unknown> {
    const { client, sendRequest } = hostClient()
    const args: SubmitArgs = {
      client,
      selectedRepo: { id: 'repo-1', displayName: 'Repo', path: '/repo', kind: 'git' },
      selectedAgent: newWorktreeAgentOptionFor('claude'),
      agentOverridden,
      runtimeSettings: { defaultTuiAgent: 'claude', disabledTuiAgents: [] },
      setRuntimeSettings: () => {},
      detectedAgentIds: new Set(['claude', 'codex']),
      sshGate: { status: null, requiresConnection: false, connectInProgress: false, error: null },
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: create reads only these three composer members.
      composer: { name: 'recorded', createSelection: null, isNameAutoManaged: false } as never,
      note: '',
      retiredWorktreeNames: EMPTY_RETIRED_NAME_REGISTRY,
      setupCommand: null,
      setupTrust: null,
      setupRunPolicy: 'skip-by-default',
      setupDecisionChoice: null,
      runSetup: false,
      trustedOrcaHooks: {},
      setTrustedOrcaHooks: () => {},
      getWorktreeCreateCutoverSupport: async () => false,
      getAgentLaunchSupport: async () => false,
      transitionDrawer: () => {},
      setError: () => {},
      onCreated: () => {},
      onClose: () => {}
    }
    let submit: ReturnType<typeof useNewWorkspaceCreateSubmit> | null = null
    function Harness(): null {
      submit = useNewWorkspaceCreateSubmit(args)
      return null
    }
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    await act(async () => {
      await submit!.create()
    })
    return sendRequest.mock.calls.find(([method]) => method === 'worktree.create')?.[1]
  }

  it('re-picks an automatic agent the host has since hidden', async () => {
    await expect(createWith(false)).resolves.toMatchObject({ startupAgent: 'codex' })
  })

  it('starts an agent the user picked even though it is hidden', async () => {
    await expect(createWith(true)).resolves.toMatchObject({ startupAgent: 'claude' })
  })
})
