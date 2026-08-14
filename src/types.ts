/** A JSON value preserved from a DeepSeek Harness session artifact. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue }

/** Immutable DeepSeek Harness session metadata used for lineage operations. */
export interface SessionHeader {
  readonly type: 'session'
  readonly version: 0
  readonly id: string
  readonly createdAt: number
  readonly cwd?: string
  readonly parentSession?: string
  readonly seedLength?: number
  readonly origin?: 'subagent'
  readonly delegationDepth: number
  readonly agentPreset?: string
}

/** One immutable event in a loaded session. */
export interface SessionEvent {
  readonly type: string
  readonly seq: number
  readonly time: number
  readonly data: JsonValue
  readonly ignorable?: true
}

/** A complete imported plaintext session artifact. */
export interface ImportedSession {
  readonly header: SessionHeader
  readonly events: readonly SessionEvent[]
}

/** One presentation node in a deterministic session lineage forest. */
export interface SessionTreeNode {
  readonly id: string
  readonly createdAt: number
  readonly parentSession?: string
  readonly seedLength?: number
  readonly children: readonly SessionTreeNode[]
}
