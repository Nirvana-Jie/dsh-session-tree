import { isDeepStrictEqual } from 'node:util'
import type { ImportedSession, SessionEvent } from './types.js'

/** One side of a semantic branch comparison. */
export interface BranchDifference {
  readonly sessionId: string
  readonly events: readonly SessionEvent[]
}

/** Common prefix and side-specific work for two session branches. */
export interface BranchComparison {
  readonly commonEventCount: number
  readonly commonThroughSeq: number | null
  readonly left: BranchDifference
  readonly right: BranchDifference
}

function semanticEvents(session: ImportedSession): readonly SessionEvent[] {
  return session.events.filter(event => event.type !== 'session/end-seed')
}

/** Compare two branches while hiding the persistence-only seed marker. */
export function compareBranches(left: ImportedSession, right: ImportedSession): BranchComparison {
  const leftEvents = semanticEvents(left)
  const rightEvents = semanticEvents(right)
  const limit = Math.min(leftEvents.length, rightEvents.length)
  let commonEventCount = 0
  while (commonEventCount < limit
    && isDeepStrictEqual(leftEvents[commonEventCount], rightEvents[commonEventCount])) {
    commonEventCount += 1
  }
  const commonThroughSeq = commonEventCount === 0
    ? null
    : (leftEvents[commonEventCount - 1] as SessionEvent).seq
  return Object.freeze({
    commonEventCount,
    commonThroughSeq,
    left: Object.freeze({
      sessionId: left.header.id,
      events: Object.freeze(leftEvents.slice(commonEventCount)),
    }),
    right: Object.freeze({
      sessionId: right.header.id,
      events: Object.freeze(rightEvents.slice(commonEventCount)),
    }),
  })
}
