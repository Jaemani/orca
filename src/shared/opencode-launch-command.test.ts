import { describe, expect, it } from 'vitest'
import { isOpenCode2LaunchCommand, selectOpenCodeHookAgent } from './opencode-launch-command'

describe('isOpenCode2LaunchCommand', () => {
  it.each(['opencode2', '/usr/local/bin/opencode2', 'opencode2.exe', 'opencode2.cmd'])(
    'recognizes %s',
    (command) => {
      expect(isOpenCode2LaunchCommand(command)).toBe(true)
    }
  )

  it.each(['opencode', 'echo opencode2', 'opencode2-helper'])('rejects %s', (command) => {
    expect(isOpenCode2LaunchCommand(command)).toBe(false)
  })
})

describe('OpenCode hook selection', () => {
  it.each([
    'opencode --session fixture',
    '"C:\\tools\\opencode.exe" --session fixture',
    '/usr/local/bin/opencode'
  ])('reads the v1 identity from %s', (command) => {
    expect(selectOpenCodeHookAgent(undefined, command, true)).toBe('opencode')
  })
  it('selects nothing when status hooks are off', () => {
    expect(selectOpenCodeHookAgent('opencode2', 'opencode2', false)).toBeNull()
  })
  it('trusts the supplied identity for wrapped or renamed commands', () => {
    expect(selectOpenCodeHookAgent('opencode', 'opencode2', true)).toBe('opencode')
    expect(selectOpenCodeHookAgent('opencode2', 'my-wrapper', true)).toBe('opencode2')
  })
})
