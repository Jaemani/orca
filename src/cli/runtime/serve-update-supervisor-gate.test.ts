import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
const { spawnChild } = vi.hoisted(() => ({ spawnChild: vi.fn() }))
vi.mock('child_process', () => ({ spawn: spawnChild, spawnSync: vi.fn() }))

import { requestSupervisedServeStop, resetSupervisedServeStop } from './serve-supervised-stop'
import { resumeInterruptedServeUpdate } from './serve-update-supervisor'

const HANDOFF = {
  schemaVersion: 1 as const,
  phase: 'install-requested' as const,
  fromVersion: '1.0.0',
  targetVersion: '1.1.0',
  servingPid: 42
}

describe('supervised update replacement spawns', () => {
  afterEach(() => {
    resetSupervisedServeStop()
    vi.restoreAllMocks()
    spawnChild.mockReset()
  })

  async function resume(): Promise<number> {
    const root = await mkdtemp(join(tmpdir(), 'orca-update-gate-'))
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      const code = await resumeInterruptedServeUpdate({
        spec: { program: join(root, 'orca') },
        handoffPath: join(root, 'handoff.json'),
        handoff: HANDOFF
      })
      return code
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }

  it('does not spawn a replacement when the install hold says stop', async () => {
    const gate = vi.fn(async () => false)
    resetSupervisedServeStop(gate)
    const code = await resume()
    expect(code).toBe(0)
    expect(gate).toHaveBeenCalledOnce()
    expect(spawnChild).not.toHaveBeenCalled()
  })

  it('does not spawn a replacement after a stop request', async () => {
    resetSupervisedServeStop(async () => true)
    requestSupervisedServeStop()
    const code = await resume()
    expect(code).toBe(0)
    expect(spawnChild).not.toHaveBeenCalled()
  })
})
