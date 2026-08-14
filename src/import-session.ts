import type { ImportedSession, JsonValue, SessionEvent, SessionHeader } from './types.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLine(line: string, lineNumber: number): unknown {
  try {
    return JSON.parse(line) as unknown
  } catch (error) {
    throw new Error(`invalid JSON on session log line ${lineNumber}`, { cause: error })
  }
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`session header ${key} must be a string`)
  return value
}

function optionalNonNegativeInteger(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`session header ${key} must be a non-negative safe integer`)
  }
  return value as number
}

function readHeader(value: unknown): SessionHeader {
  if (!isRecord(value)
    || value.type !== 'session'
    || value.version !== 0
    || typeof value.id !== 'string'
    || value.id.length === 0
    || !Number.isSafeInteger(value.createdAt)
    || (value.createdAt as number) < 0
    || !Number.isSafeInteger(value.delegationDepth)
    || (value.delegationDepth as number) < 0) {
    throw new Error('session log line 1 must be a supported DeepSeek Harness v0 header')
  }
  const origin = value.origin
  if (origin !== undefined && origin !== 'subagent') throw new Error('session header origin must be "subagent"')
  return Object.freeze({
    type: 'session' as const,
    version: 0 as const,
    id: value.id,
    createdAt: value.createdAt as number,
    ...optionalString(value, 'cwd') === undefined ? {} : { cwd: optionalString(value, 'cwd') },
    ...optionalString(value, 'parentSession') === undefined
      ? {}
      : { parentSession: optionalString(value, 'parentSession') },
    ...optionalNonNegativeInteger(value, 'seedLength') === undefined
      ? {}
      : { seedLength: optionalNonNegativeInteger(value, 'seedLength') },
    ...(origin === undefined ? {} : { origin }),
    delegationDepth: value.delegationDepth as number,
    ...optionalString(value, 'agentPreset') === undefined
      ? {}
      : { agentPreset: optionalString(value, 'agentPreset') },
  }) as SessionHeader
}

function freezeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeJson))
  if (value === null || typeof value !== 'object') return value
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, freezeJson(child)])))
}

function readEvent(value: unknown, expectedSequence: number, lineNumber: number): SessionEvent {
  if (!isRecord(value)
    || typeof value.type !== 'string'
    || value.seq !== expectedSequence
    || !Number.isSafeInteger(value.time)
    || !Object.hasOwn(value, 'data')
    || (value.ignorable !== undefined && value.ignorable !== true)) {
    throw new Error(`invalid or non-contiguous session event on line ${lineNumber}`)
  }
  return Object.freeze({
    type: value.type,
    seq: expectedSequence,
    time: value.time as number,
    data: freezeJson(value.data as JsonValue),
    ...(value.ignorable === true ? { ignorable: true as const } : {}),
  })
}

function expandPackedRow(
  value: Record<string, unknown>,
  expectedSequence: number,
  lineNumber: number,
): unknown[] {
  const tag = value.type
  if (tag !== 'text-chunks' && tag !== 'reasoning-chunks' && tag !== 'tool-call-chunks') return [value]
  const data = value.data
  const payloadKey = tag === 'tool-call-chunks' ? 'args' : 'texts'
  if (value.seq0 !== expectedSequence
    || !Number.isSafeInteger(value.seq0)
    || !Number.isSafeInteger(value.time0)
    || !isRecord(data)
    || typeof data.turn !== 'number'
    || typeof data.step !== 'number'
    || typeof data.index !== 'number'
    || !Array.isArray(data[payloadKey])
    || (data[payloadKey] as unknown[]).length === 0
    || (data[payloadKey] as unknown[]).some(member => typeof member !== 'string')
    || !Array.isArray(data.dt)
    || data.dt.length !== (data[payloadKey] as unknown[]).length - 1
    || data.dt.some(gap => !Number.isSafeInteger(gap))
    || (tag === 'tool-call-chunks' && typeof data.id !== 'string')
    || (tag === 'tool-call-chunks' && data.name !== undefined && typeof data.name !== 'string')) {
    throw new Error(`malformed ${String(tag)} storage row on line ${lineNumber}`)
  }
  const members = data[payloadKey] as string[]
  const gaps = data.dt as number[]
  let time = value.time0 as number
  return members.map((member, index) => {
    if (index > 0) time += gaps[index - 1] as number
    if (!Number.isSafeInteger(time)) throw new Error(`malformed ${tag} storage row on line ${lineNumber}`)
    const chunk = tag === 'tool-call-chunks'
      ? {
          type: 'tool-call-delta',
          index: data.index,
          id: data.id,
          ...(data.name === undefined ? {} : { name: data.name }),
          argumentsDelta: member,
        }
      : {
          type: tag === 'text-chunks' ? 'text-delta' : 'reasoning-delta',
          index: data.index,
          text: member,
        }
    return {
      type: 'assistant/chunk',
      seq: expectedSequence + index,
      time,
      data: { turn: data.turn, step: data.step, chunk },
    }
  })
}

/** Parse and validate one plaintext DeepSeek Harness v0 JSONL artifact. */
export function importSession(content: string): ImportedSession {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n')
  const header = readHeader(parseLine(lines[0] ?? '', 1))
  const events: SessionEvent[] = []
  for (const [index, line] of lines.slice(1).entries()) {
    if (line.length === 0) throw new Error(`empty session log line ${index + 2}`)
    const value = parseLine(line, index + 2)
    const records = isRecord(value) ? expandPackedRow(value, events.length, index + 2) : [value]
    for (const record of records) events.push(readEvent(record, events.length, index + 2))
  }
  return Object.freeze({ header, events: Object.freeze(events) })
}
