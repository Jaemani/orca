import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_RETIRED_NAME_REGISTRY } from '../../../src/shared/worktree/retired-name-registry'
import type { RpcClient } from '../transport/rpc-client'
import { newWorktreeAgentOptionFor } from './new-worktree-agent-selection'
import {
  hiddenAgentRefusedMessage,
  useNewWorkspaceCreateSubmit
} from './use-new-workspace-create-submit'

type SubmitArgs = Parameters<typeof useNewWorkspaceCreateSubmit>[0]

// The host has hidden Claude since the sheet read its settings, when Claude was the default.
function hostClient() {
  const sendRequest = vi.fn(async (method: string, _params?: unknown) => {
    if (method === 'agent.launchReplay') {
      // A computer from before hidden agents could start refuses one with only this code.
      const code = 'agent_session_operation_unknown'
      return { id: 'x', ok: false, error: { code, message: code }, _meta: { runtimeId: 'r' } }
    }
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

  async function createWith(
    agentOverridden: boolean,
    launchRoute = false
  ): Promise<{ sent: unknown; error: string }> {
    const { client, sendRequest } = hostClient()
    let error = ''
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
      getAgentLaunchSupport: async () => (launchRoute ? { replay: true } : false),
      transitionDrawer: () => {},
      setError: (message) => {
        error = typeof message === 'function' ? message(error) : message
      },
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
    const sent = sendRequest.mock.calls.find(([method]) => method === 'worktree.create')?.[1]
    return { sent, error }
  }

  it('re-picks an automatic agent the host has since hidden', async () => {
    expect((await createWith(false)).sent).toMatchObject({ startupAgent: 'codex' })
  })

  it('starts an agent the user picked even though it is hidden', async () => {
    expect((await createWith(true)).sent).toMatchObject({ startupAgent: 'claude' })
  })

  it('names the hidden agent when an older computer refuses it with only a code', async () => {
    expect((await createWith(true, true)).error).toBe(hiddenAgentRefusedMessage('Claude'))
  })
})
