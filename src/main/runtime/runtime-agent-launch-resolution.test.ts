import { describe, expect, it } from 'vitest'
import { resolveBareAgentLaunchCommand } from './runtime-agent-launch-resolution'

describe('resolveBareAgentLaunchCommand', () => {
  it("lets an override claim another agent's default command", () => {
    expect(
      resolveBareAgentLaunchCommand({
        command: 'opencode',
        settings: { agentCmdOverrides: { opencode2: 'opencode' } },
        platform: 'darwin',
        isRemote: false
      })
    ).toBe('opencode2')
  })
})
