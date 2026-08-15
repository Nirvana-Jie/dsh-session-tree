import type {
  ISessions,
  SessionId,
  SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'

/** A fork that exists durably but could not receive its lineage title. */
export class LineageTitleError extends Error {
  override readonly name = 'LineageTitleError'

  /**
   * @param childId - durable child created before title persistence failed.
   * @param message - DSH addressability or rename failure detail.
   */
  constructor(readonly childId: SessionId, message: string) {
    super(message)
  }
}

/**
 * Return the next durable title below one parent.
 * @param state - latest DSH session-list snapshot.
 * @param parentId - selected source session.
 * @returns path-style title, or `undefined` when the parent has no durable title.
 */
export function nextLineageForkTitle(
  state: SessionListState,
  parentId: SessionId,
): string | undefined {
  const parentTitle = state.byId[parentId]?.title
  if (parentTitle === undefined) return undefined

  const prefix = `${parentTitle} (`
  let greatestOrdinal = 0n
  for (const id of state.ids) {
    const sibling = state.byId[id]
    if (sibling?.parentId !== parentId || sibling.origin === 'subagent') continue
    const title = sibling.title
    if (title === undefined || !title.startsWith(prefix) || !title.endsWith(')')) continue
    const digits = title.slice(prefix.length, -1)
    if (!/^[1-9]\d*$/u.test(digits)) continue
    const ordinal = BigInt(digits)
    if (ordinal > greatestOrdinal) greatestOrdinal = ordinal
  }
  return `${parentTitle} (${greatestOrdinal + 1n})`
}

/**
 * Fork through DSH, then persist the child's path-style lineage title.
 * @param sessions - documented DSH session operations and read model.
 * @param parentId - source session cut at its latest stable turn.
 * @returns durable child id after a successful optional rename.
 * @throws {LineageTitleError} when the child exists but title persistence fails.
 */
export async function forkLineageSession(
  sessions: Pick<ISessions, 'binding' | 'fork' | 'list'>,
  parentId: SessionId,
): Promise<SessionId> {
  const childId = await sessions.fork({ sessionId: parentId })
  const title = nextLineageForkTitle(sessions.list.getSnapshot(), parentId)
  if (title === undefined) return childId

  const child = sessions.binding(childId)?.session
  if (child === undefined) {
    throw new LineageTitleError(childId, `fork child "${childId}" is not locally addressable`)
  }
  const renamed = await child.rename(title)
  if (!renamed.ok) {
    throw new LineageTitleError(
      childId,
      `fork child rename failed: ${renamed.error.code}: ${renamed.error.message}`,
    )
  }
  return childId
}
