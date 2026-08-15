import type {
  SessionId,
  SessionListState,
  SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'

/** How a visible session relates to the tree that contains it. */
export type SessionRelation = 'root' | 'fork' | 'subagent'

/** One immutable row in the Session Tree view model. */
export interface SessionTreeNode {
  readonly summary: SessionSummary
  readonly relation: SessionRelation
  readonly depth: number
  readonly current: boolean
  /** Smallest readable id suffix needed to distinguish an equal-titled sibling. */
  readonly titleQualifier?: string
  readonly children: readonly SessionTreeNode[]
}

/** Counts summarized in the live lineage toolbar. */
export interface SessionTreeTotals {
  readonly sessions: number
  readonly roots: number
  readonly forks: number
  readonly subagents: number
  readonly running: number
}

/** Immutable projection of the DSH session-list snapshot. */
export interface SessionTreeModel {
  readonly roots: readonly SessionTreeNode[]
  readonly nodesById: Readonly<Record<string, SessionTreeNode>>
  readonly totals: SessionTreeTotals
}

function assertAcyclic(
  summaries: readonly SessionSummary[],
  byId: ReadonlyMap<SessionId, SessionSummary>,
): void {
  for (const summary of summaries) {
    const seen = new Set<SessionId>()
    let current: SessionSummary | undefined = summary
    while (current !== undefined) {
      if (seen.has(current.id)) {
        throw new Error(`session lineage contains a cycle through "${current.id}"`)
      }
      seen.add(current.id)
      current = current.parentId === undefined ? undefined : byId.get(current.parentId)
    }
  }
}

const MINIMUM_QUALIFIER_LENGTH = 6

function addTitleQualifiers(
  siblings: readonly SessionSummary[],
  qualifiers: Map<SessionId, string>,
): void {
  const byTitle = new Map<string, SessionSummary[]>()
  for (const summary of siblings) {
    const matches = byTitle.get(summary.displayTitle) ?? []
    matches.push(summary)
    byTitle.set(summary.displayTitle, matches)
  }
  for (const matches of byTitle.values()) {
    if (matches.length < 2) continue
    for (const summary of matches) {
      const id = summary.id as string
      const minimum = Math.min(MINIMUM_QUALIFIER_LENGTH, id.length)
      for (let length = minimum; length <= id.length; length += 1) {
        const suffix = id.slice(-length)
        if (matches.some(other => other.id !== summary.id && other.id.endsWith(suffix))) continue
        qualifiers.set(summary.id, length === id.length ? id : `…${suffix}`)
        break
      }
    }
  }
}

/** Project the live DSH session list into a deterministic lineage forest. */
export function buildSessionTree(state: SessionListState): SessionTreeModel {
  const summaries: SessionSummary[] = []
  const byId = new Map<SessionId, SessionSummary>()
  for (const id of state.ids) {
    const summary = state.byId[id]
    if (summary === undefined) continue
    if (summary.blank && summary.id !== state.current) continue
    if (byId.has(id)) throw new Error(`duplicate session id "${id}"`)
    summaries.push(summary)
    byId.set(id, summary)
  }

  const currentRoute: SessionSummary[] = []
  const routeSeen = new Set<SessionId>()
  let currentId = state.current
  while (currentId !== undefined) {
    if (routeSeen.has(currentId)) break
    routeSeen.add(currentId)
    const summary = state.byId[currentId]
    if (summary === undefined) break
    currentRoute.push(summary)
    currentId = summary.parentId
  }
  for (const summary of currentRoute.reverse()) {
    if (byId.has(summary.id)) continue
    summaries.push(summary)
    byId.set(summary.id, summary)
  }
  assertAcyclic(summaries, byId)

  const roots: SessionSummary[] = []
  const childrenByParent = new Map<SessionId, SessionSummary[]>()
  for (const summary of summaries) {
    const parent = summary.parentId === undefined ? undefined : byId.get(summary.parentId)
    if (parent === undefined) {
      roots.push(summary)
      continue
    }
    const children = childrenByParent.get(parent.id) ?? []
    children.push(summary)
    childrenByParent.set(parent.id, children)
  }

  const titleQualifiers = new Map<SessionId, string>()
  addTitleQualifiers(roots, titleQualifiers)
  for (const siblings of childrenByParent.values()) addTitleQualifiers(siblings, titleQualifiers)

  const nodesById: Record<string, SessionTreeNode> = {}
  const project = (summary: SessionSummary, depth: number): SessionTreeNode => {
    const relation: SessionRelation = depth === 0
      ? 'root'
      : summary.origin === 'subagent' ? 'subagent' : 'fork'
    const titleQualifier = titleQualifiers.get(summary.id)
    const node = Object.freeze({
      summary,
      relation,
      depth,
      current: state.current === summary.id,
      ...(titleQualifier === undefined ? {} : { titleQualifier }),
      children: Object.freeze(
        (childrenByParent.get(summary.id) ?? []).map(child => project(child, depth + 1)),
      ),
    })
    nodesById[summary.id] = node
    return node
  }

  const projectedRoots = Object.freeze(roots.map(root => project(root, 0)))
  const totals = Object.freeze({
    sessions: summaries.length,
    roots: roots.length,
    forks: summaries.filter(summary => summary.parentId !== undefined
      && byId.has(summary.parentId)
      && summary.origin !== 'subagent').length,
    subagents: summaries.filter(summary => summary.origin === 'subagent').length,
    running: summaries.filter(summary => summary.running).length,
  })
  return Object.freeze({
    roots: projectedRoots,
    nodesById: Object.freeze(nodesById),
    totals,
  })
}
