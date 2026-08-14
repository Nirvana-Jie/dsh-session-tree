import { importSession } from './import-session.js'
import type { ImportedSession, SessionEvent } from './types.js'

/** Identity and deterministic timestamp for a new branch. */
export interface ForkAtOptions {
  readonly id: string
  readonly createdAt: number
}

function assertStableBoundary(source: ImportedSession, boundary: number): void {
  if (!Number.isSafeInteger(boundary) || boundary < 0 || source.events[boundary]?.seq !== boundary) {
    throw new Error(`fork boundary ${String(boundary)} does not exist in session "${source.header.id}"`)
  }
  let openTurn = false
  for (const event of source.events.slice(0, boundary + 1)) {
    if (event.type === 'turn/start') {
      if (openTurn) throw new Error(`session "${source.header.id}" contains nested turns before boundary ${boundary}`)
      openTurn = true
    } else if (event.type === 'turn/end') {
      if (!openTurn) throw new Error(`session "${source.header.id}" closes no turn before boundary ${boundary}`)
      openTurn = false
    }
  }
  if (openTurn) throw new Error(`fork boundary ${boundary} is inside an open turn in session "${source.header.id}"`)
}

function serialize(header: Record<string, unknown>, events: readonly SessionEvent[]): string {
  return [JSON.stringify(header), ...events.map(event => JSON.stringify(event))].join('\n') + '\n'
}

/** Create a detached child through an inclusive, between-turn source event sequence. */
export function forkAt(source: ImportedSession, boundary: number, options: ForkAtOptions): ImportedSession {
  if (options.id.length === 0) throw new Error('fork child id must be non-empty')
  if (!Number.isSafeInteger(options.createdAt) || options.createdAt < 0) {
    throw new Error('fork child createdAt must be a non-negative safe integer')
  }
  assertStableBoundary(source, boundary)
  const inherited = source.events.slice(0, boundary + 1)
  const marker: SessionEvent = {
    type: 'session/end-seed',
    seq: inherited.length,
    time: options.createdAt,
    data: {},
  }
  const events = inherited.at(-1)?.type === 'session/end-seed' ? inherited : [...inherited, marker]
  return importSession(serialize({
    type: 'session',
    version: 0,
    id: options.id,
    createdAt: options.createdAt,
    ...(source.header.cwd === undefined ? {} : { cwd: source.header.cwd }),
    parentSession: source.header.id,
    seedLength: inherited.length,
    delegationDepth: 0,
    ...(source.header.agentPreset === undefined ? {} : { agentPreset: source.header.agentPreset }),
  }, events))
}
