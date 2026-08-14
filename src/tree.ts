import type { ImportedSession, SessionTreeNode } from './types.js'

interface MutableTreeNode {
  id: string
  createdAt: number
  parentSession?: string
  seedLength?: number
  children: MutableTreeNode[]
}

function compareNodes(left: MutableTreeNode, right: MutableTreeNode): number {
  return left.createdAt - right.createdAt || left.id.localeCompare(right.id)
}

function freezeNode(node: MutableTreeNode): SessionTreeNode {
  node.children.sort(compareNodes)
  return Object.freeze({
    id: node.id,
    createdAt: node.createdAt,
    ...(node.parentSession === undefined ? {} : { parentSession: node.parentSession }),
    ...(node.seedLength === undefined ? {} : { seedLength: node.seedLength }),
    children: Object.freeze(node.children.map(freezeNode)),
  })
}

/** Build a deterministic lineage forest from imported session headers. */
export function getTree(sessions: readonly ImportedSession[]): readonly SessionTreeNode[] {
  const byId = new Map<string, MutableTreeNode>()
  for (const session of sessions) {
    if (byId.has(session.header.id)) throw new Error(`duplicate session id "${session.header.id}"`)
    byId.set(session.header.id, {
      id: session.header.id,
      createdAt: session.header.createdAt,
      ...(session.header.parentSession === undefined ? {} : { parentSession: session.header.parentSession }),
      ...(session.header.seedLength === undefined ? {} : { seedLength: session.header.seedLength }),
      children: [],
    })
  }
  for (const node of byId.values()) {
    const seen = new Set<string>()
    let current: MutableTreeNode | undefined = node
    while (current !== undefined) {
      if (seen.has(current.id)) throw new Error(`session lineage contains a cycle through "${current.id}"`)
      seen.add(current.id)
      current = current.parentSession === undefined ? undefined : byId.get(current.parentSession)
    }
  }
  const roots: MutableTreeNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentSession === undefined ? undefined : byId.get(node.parentSession)
    if (parent === undefined) roots.push(node)
    else parent.children.push(node)
  }
  roots.sort(compareNodes)
  return Object.freeze(roots.map(freezeNode))
}
