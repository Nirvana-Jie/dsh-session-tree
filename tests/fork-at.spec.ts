import { describe, expect, it } from 'vitest'
import { forkAt, importSession } from '../src/index.js'

describe('forkAt', () => {
  it('creates a detached child through an inclusive stable event boundary', () => {
    const source = importSession([
      JSON.stringify({
        type: 'session',
        version: 0,
        id: 'parent',
        createdAt: 10,
        cwd: '/workspace',
        delegationDepth: 0,
        agentPreset: 'minimal',
      }),
      JSON.stringify({ type: 'turn/start', seq: 0, time: 11, data: { turn: 1 } }),
      JSON.stringify({ type: 'user/message', seq: 1, time: 12, data: { content: 'first' } }),
      JSON.stringify({ type: 'turn/end', seq: 2, time: 13, data: { turn: 1, reason: { kind: 'completed' } } }),
      JSON.stringify({ type: 'turn/start', seq: 3, time: 14, data: { turn: 2 } }),
      '',
    ].join('\n'))
    const sourceBefore = JSON.stringify(source)

    const child = forkAt(source, 2, { id: 'child', createdAt: 20 })

    expect(child.header).toEqual({
      type: 'session',
      version: 0,
      id: 'child',
      createdAt: 20,
      cwd: '/workspace',
      parentSession: 'parent',
      seedLength: 3,
      delegationDepth: 0,
      agentPreset: 'minimal',
    })
    expect(child.events).toEqual([
      { type: 'turn/start', seq: 0, time: 11, data: { turn: 1 } },
      { type: 'user/message', seq: 1, time: 12, data: { content: 'first' } },
      { type: 'turn/end', seq: 2, time: 13, data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'session/end-seed', seq: 3, time: 20, data: {} },
    ])
    expect(child.events[0]).not.toBe(source.events[0])
    expect(JSON.stringify(source)).toBe(sourceBefore)
  })
})
