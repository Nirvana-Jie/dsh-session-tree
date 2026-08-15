import { describe, expect, it } from 'vitest'
import type { SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { buildSessionTree } from '../src/client/session-tree.js'

function sid(value: string): SessionId {
  return value as SessionId
}

function summary(
  id: string,
  options: Partial<SessionSummary> = {},
): SessionSummary {
  return {
    id: sid(id),
    displayTitle: id,
    running: false,
    blank: false,
    updatedAt: 1,
    ...options,
  }
}

function state(rows: readonly SessionSummary[], current?: string): SessionListState {
  return {
    ids: rows.map(row => row.id),
    byId: Object.fromEntries(rows.map(row => [row.id, row])) as Record<SessionId, SessionSummary>,
    current: current === undefined ? undefined : sid(current),
    phase: 'ready',
    subagentsByParent: {},
    currentAddress: undefined,
  }
}

describe('buildSessionTree', () => {
  it('projects live DSH rows into an ordered forest and reports useful totals', () => {
    const root = summary('root', { displayTitle: 'Main task', running: true, updatedAt: 10 })
    const fork = summary('fork', { parentId: root.id, displayTitle: 'Try cache fix', updatedAt: 20 })
    const subagent = summary('worker', {
      parentId: root.id,
      displayTitle: 'Inspect tests',
      origin: 'subagent',
      completed: true,
      updatedAt: 30,
    })

    const tree = buildSessionTree(state([root, fork, subagent], 'fork'))

    expect(tree.totals).toEqual({ sessions: 3, roots: 1, forks: 1, subagents: 1, running: 1 })
    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0]?.summary.id).toBe(root.id)
    expect(tree.roots[0]?.children.map(node => node.summary.id)).toEqual([fork.id, subagent.id])
    expect(tree.roots[0]?.children[0]).toMatchObject({ depth: 1, current: true, relation: 'fork' })
    expect(tree.roots[0]?.children[1]).toMatchObject({ depth: 1, current: false, relation: 'subagent' })
    expect(tree.roots[0]?.titleQualifier).toBeUndefined()
  })

  it('qualifies only duplicate sibling titles with the shortest unique id suffix', () => {
    const root = summary('root', { displayTitle: 'Main task' })
    const first = summary('session-alpha-123456', {
      parentId: root.id,
      displayTitle: 'Try another approach',
    })
    const second = summary('session-beta-123456', {
      parentId: root.id,
      displayTitle: 'Try another approach',
    })
    const distinct = summary('session-gamma-123456', {
      parentId: root.id,
      displayTitle: 'Inspect the tests',
    })

    const tree = buildSessionTree(state([root, first, second, distinct]))

    expect(tree.nodesById[first.id]?.titleQualifier).toBe('…ha-123456')
    expect(tree.nodesById[second.id]?.titleQualifier).toBe('…ta-123456')
    expect(tree.nodesById[distinct.id]?.titleQualifier).toBeUndefined()
    expect(tree.nodesById[root.id]?.titleQualifier).toBeUndefined()
  })

  it('keeps an orphan visible as a root instead of dropping it', () => {
    const orphan = summary('orphan', { parentId: sid('missing') })

    const tree = buildSessionTree(state([orphan]))

    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0]).toMatchObject({ relation: 'root', depth: 0 })
    expect(tree.totals).toEqual({ sessions: 1, roots: 1, forks: 0, subagents: 0, running: 0 })
  })

  it('omits provisional blank rows unless the blank session is current', () => {
    const durable = summary('durable')
    const staleBlank = summary('stale-blank', { blank: true })
    const currentBlank = summary('current-blank', { blank: true })

    const withoutCurrentBlank = buildSessionTree(state([durable, staleBlank], 'durable'))
    const withCurrentBlank = buildSessionTree(state([durable, staleBlank, currentBlank], 'current-blank'))

    expect(withoutCurrentBlank.roots.map(node => node.summary.id)).toEqual([durable.id])
    expect(withoutCurrentBlank.totals.sessions).toBe(1)
    expect(withCurrentBlank.roots.map(node => node.summary.id)).toEqual([durable.id, currentBlank.id])
    expect(withCurrentBlank.totals.sessions).toBe(2)
  })

  it('includes the current addressed subagent route even when it is not a list row', () => {
    const root = summary('root')
    const worker = summary('worker', {
      parentId: root.id,
      origin: 'subagent',
      displayTitle: 'Investigate cache invalidation',
      running: true,
    })
    const snapshot = state([root])
    const tree = buildSessionTree({
      ...snapshot,
      byId: { ...snapshot.byId, [worker.id]: worker },
      current: worker.id,
      currentAddress: {
        parentSessionId: root.id,
        childSessionId: worker.id,
        mode: 'continuable',
      },
    })

    expect(tree.roots[0]?.children[0]).toMatchObject({
      current: true,
      relation: 'subagent',
      summary: { id: worker.id },
    })
    expect(tree.totals).toEqual({ sessions: 2, roots: 1, forks: 0, subagents: 1, running: 1 })
  })

  it('rejects a cycle instead of recursing forever or hiding rows', () => {
    const left = summary('left', { parentId: sid('right') })
    const right = summary('right', { parentId: sid('left') })

    expect(() => buildSessionTree(state([left, right])))
      .toThrow('session lineage contains a cycle through "left"')
  })
})
