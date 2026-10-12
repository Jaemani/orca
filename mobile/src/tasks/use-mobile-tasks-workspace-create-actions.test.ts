import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RpcClient } from '../transport/rpc-client'

// Why: the tasks barrel pulls the whole react-native screen graph in; re-export only what create
// uses, straight from its leaf modules.
vi.mock('./mobile-tasks-dependencies', async () => ({
  useCallback: (await import('react')).useCallback,
  ...(await import('./workspace-create-params')),
  ...(await import('./workspace-agent-selection')),
  ...(await import('./hosted-review-start-point')),
  ...(await import('./workspace-create-timeout')),
  ...(await import('./setup-hook-trust'))
}))

const { useMobileTasksWorkspaceCreateActions } =
  await import('./use-mobile-tasks-workspace-create-actions')

type CreateModel = Parameters<typeof useMobileTasksWorkspaceCreateActions>[0]

// The host has hidden Claude since the Tasks screen read its settings, when Claude was the default.
function hostClient() {
  const sendRequest = vi.fn(async (method: string, _params?: unknown) => {
    const result =
      method === 'settings.get'
        ? { settings: { defaultTuiAgent: 'claude', disabledTuiAgents: ['claude'] } }
        : { worktree: { id: 'wt-1', displayName: 'ORC-1 Recorded issue' } }
    return { id: 'x', ok: true, result, _meta: { runtimeId: 'r' } }
  })
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: settings.get and worktree.create reach only `sendRequest` on the client.
  return { client: { sendRequest } as unknown as RpcClient, sendRequest }
}

describe('useMobileTasksWorkspaceCreateActions agent', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  async function createWith(agentOverride: 'claude' | undefined): Promise<unknown> {
    const { client, sendRequest } = hostClient()
    const model = {
      client,
      hostId: 'host-1',
      tasksSupported: true,
      taskStateHydrated: true,
      runtimeTaskSettings: { defaultTuiAgent: 'claude', disabledTuiAgents: [] },
      setRuntimeTaskSettings: () => {},
      trustedOrcaHooks: {},
      workspaceDetectedAgentIds: new Set(['claude', 'codex']),
      workspaceLastAutoName: '',
      ensureWorkspaceSshReady: async () => {},
      getWorkspaceTargetRepo: () => ({ id: 'repo-1', displayName: 'Repo' }),
      resolveCreateSetupDecision: async () => ({ kind: 'decision', decision: 'inherit' }),
      setCreatingKey: () => {},
      setError: () => {},
      setActionItem: () => {},
      setWorkspaceCreateDraft: () => {},
      setSetupPrompt: () => {},
      setOrcaYamlTrustPrompt: () => {},
      router: { push: () => {} }
    }
    let actions: ReturnType<typeof useMobileTasksWorkspaceCreateActions> | null = null
    function Harness(): null {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: createWorkspace reads only the members supplied above.
      actions = useMobileTasksWorkspaceCreateActions(model as unknown as CreateModel)
      return null
    }
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    await act(async () => {
      await actions!.createWorkspace(
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a Linear create reads only the key, title and these source members.
        {
          key: 'linear:1',
          provider: 'linear',
          title: 'Recorded issue',
          source: { identifier: 'ORC-1', title: 'Recorded issue', url: 'https://linear.app/orc-1' }
        } as never,
        undefined,
        undefined,
        agentOverride
      )
    })
    return sendRequest.mock.calls.find(([method]) => method === 'worktree.create')?.[1]
  }

  it('re-picks an automatic agent the host has since hidden', async () => {
    await expect(createWith(undefined)).resolves.toMatchObject({ createdWithAgent: 'codex' })
  })

  it('starts an agent the user picked even though it is hidden', async () => {
    await expect(createWith('claude')).resolves.toMatchObject({ createdWithAgent: 'claude' })
  })
})
