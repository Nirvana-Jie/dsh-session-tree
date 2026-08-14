import { describe, expect, it } from 'vitest'
import { compareBranches, importSession } from '../src/index.js'

function branch(id: string, createdAt: number, markerTime: number, text: string) {
  return importSession([
    JSON.stringify({
      type: 'session',
      version: 0,
      id,
      createdAt,
      parentSession: 'root',
      seedLength: 1,
      delegationDepth: 0,
    }),
    JSON.stringify({ type: 'user/message', seq: 0, time: 10, data: { content: 'shared' } }),
    JSON.stringify({ type: 'session/end-seed', seq: 1, time: markerTime, data: {} }),
    JSON.stringify({ type: 'user/message', seq: 2, time: markerTime + 1, data: { content: text } }),
    '',
  ].join('\n'))
}

describe('compareBranches', () => {
  it('compares semantic events without reporting the seed marker as user-visible work', () => {
    const left = branch('left', 20, 20, 'left work')
    const right = branch('right', 30, 30, 'right work')

    expect(compareBranches(left, right)).toEqual({
      commonEventCount: 1,
      commonThroughSeq: 0,
      left: {
        sessionId: 'left',
        events: [{ type: 'user/message', seq: 2, time: 21, data: { content: 'left work' } }],
      },
      right: {
        sessionId: 'right',
        events: [{ type: 'user/message', seq: 2, time: 31, data: { content: 'right work' } }],
      },
    })
  })

  it('does not report a divergence when JSON object keys have a different source order', () => {
    const left = importSession([
      JSON.stringify({
        type: 'session',
        version: 0,
        id: 'left',
        createdAt: 20,
        delegationDepth: 0,
      }),
      '{"type":"user/message","seq":0,"time":10,"data":{"content":"shared","metadata":{"a":1,"b":2}}}',
      '',
    ].join('\n'))
    const right = importSession([
      JSON.stringify({
        type: 'session',
        version: 0,
        id: 'right',
        createdAt: 30,
        delegationDepth: 0,
      }),
      '{"data":{"metadata":{"b":2,"a":1},"content":"shared"},"time":10,"seq":0,"type":"user/message"}',
      '',
    ].join('\n'))

    expect(compareBranches(left, right)).toMatchObject({
      commonEventCount: 1,
      commonThroughSeq: 0,
      left: { events: [] },
      right: { events: [] },
    })
  })
})
