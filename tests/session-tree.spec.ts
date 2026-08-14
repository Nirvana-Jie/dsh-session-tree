import { describe, expect, it } from 'vitest'
import { getTree, importSession } from '../src/index.js'

function sessionLog(header: Record<string, unknown>, events: readonly Record<string, unknown>[] = []): string {
  return [header, ...events].map(value => JSON.stringify(value)).join('\n') + '\n'
}

describe('session import and tree', () => {
  it('builds deterministic lineage from DeepSeek Harness session headers', () => {
    const root = importSession(sessionLog({
      type: 'session',
      version: 0,
      id: 'root',
      createdAt: 10,
      delegationDepth: 0,
    }))
    const youngerChild = importSession(sessionLog({
      type: 'session',
      version: 0,
      id: 'child-b',
      createdAt: 30,
      parentSession: 'root',
      seedLength: 0,
      delegationDepth: 0,
    }))
    const olderChild = importSession(sessionLog({
      type: 'session',
      version: 0,
      id: 'child-a',
      createdAt: 20,
      parentSession: 'root',
      seedLength: 0,
      delegationDepth: 0,
    }))
    const grandchild = importSession(sessionLog({
      type: 'session',
      version: 0,
      id: 'grandchild',
      createdAt: 40,
      parentSession: 'child-a',
      seedLength: 0,
      delegationDepth: 0,
    }))

    expect(getTree([youngerChild, grandchild, root, olderChild])).toEqual([
      {
        id: 'root',
        createdAt: 10,
        children: [
          {
            id: 'child-a',
            createdAt: 20,
            parentSession: 'root',
            seedLength: 0,
            children: [
              {
                id: 'grandchild',
                createdAt: 40,
                parentSession: 'child-a',
                seedLength: 0,
                children: [],
              },
            ],
          },
          {
            id: 'child-b',
            createdAt: 30,
            parentSession: 'root',
            seedLength: 0,
            children: [],
          },
        ],
      },
    ])
  })

  it('imports the packed chunk rows produced by the default Harness backend', () => {
    const session = importSession(sessionLog({
      type: 'session',
      version: 0,
      id: 'packed',
      createdAt: 10,
      delegationDepth: 0,
    }, [
      {
        type: 'reasoning-chunks',
        seq0: 0,
        time0: 11,
        data: { turn: 1, step: 1, index: 0, dt: [1], texts: ['a', 'b'] },
      },
      {
        type: 'tool-call-chunks',
        seq0: 2,
        time0: 20,
        data: { turn: 1, step: 1, index: 1, id: 'call-1', dt: [2], args: ['{', '}'] },
      },
    ]))

    expect(session.events).toEqual([
      {
        type: 'assistant/chunk',
        seq: 0,
        time: 11,
        data: { turn: 1, step: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'a' } },
      },
      {
        type: 'assistant/chunk',
        seq: 1,
        time: 12,
        data: { turn: 1, step: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'b' } },
      },
      {
        type: 'assistant/chunk',
        seq: 2,
        time: 20,
        data: {
          turn: 1,
          step: 1,
          chunk: { type: 'tool-call-delta', index: 1, id: 'call-1', argumentsDelta: '{' },
        },
      },
      {
        type: 'assistant/chunk',
        seq: 3,
        time: 22,
        data: {
          turn: 1,
          step: 1,
          chunk: { type: 'tool-call-delta', index: 1, id: 'call-1', argumentsDelta: '}' },
        },
      },
    ])
  })

  it('rejects a target-connected lineage cycle instead of hiding every node', () => {
    const a = importSession(sessionLog({
      type: 'session', version: 0, id: 'a', createdAt: 1, parentSession: 'b', seedLength: 0, delegationDepth: 0,
    }))
    const b = importSession(sessionLog({
      type: 'session', version: 0, id: 'b', createdAt: 2, parentSession: 'a', seedLength: 0, delegationDepth: 0,
    }))

    expect(() => getTree([a, b])).toThrow('session lineage contains a cycle through "a"')
  })
})
