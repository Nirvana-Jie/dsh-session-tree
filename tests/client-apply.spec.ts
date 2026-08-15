// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.js'
import { SessionTreeView } from '../src/client/SessionTreeView.js'

afterEach(() => {
  document.querySelectorAll('style[data-plugin="@nirvana-jie/dsh-session-tree"]')
    .forEach(element => { element.remove() })
})

interface LineageRow {
  readonly id: string
  readonly title?: string
  readonly parentId?: string
  readonly origin?: 'subagent'
}

type RenameResult =
  | { readonly ok: true; readonly value: { readonly title: string; readonly seq: number } }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

function lineageForkFixture(
  rows: readonly LineageRow[],
  renameResult: RenameResult = {
    ok: true,
    value: { title: 'accepted', seq: 1 },
  },
) {
  const registerView = vi.fn(() => vi.fn())
  const fork = vi.fn(async () => 'child')
  const rename = vi.fn(async (_title: string) => renameResult)
  const summaries = rows.map(row => ({
    ...row,
    displayTitle: row.title ?? row.id,
    running: false,
    blank: false,
    updatedAt: 1,
  }))
  const snapshot = {
    ids: summaries.map(row => row.id),
    byId: Object.fromEntries(summaries.map(row => [row.id, row])),
    current: rows[0]?.id,
    phase: 'ready',
    subagentsByParent: {},
    currentAddress: undefined,
  }
  const ctx = {
    effect(factory: () => (() => void), _label?: string) {
      factory()
    },
    locale: {
      register: vi.fn(() => vi.fn()),
      bind: () => (key: string) => key,
    },
    sessions: {
      open: vi.fn(),
      fork,
      list: { getSnapshot: () => snapshot, subscribe: vi.fn(() => vi.fn()) },
      binding: vi.fn(() => ({ session: { rename } })),
    },
    conversation: { openSession: vi.fn() },
    slots: {
      inject: vi.fn((_name: string, factory: () => (() => void)) => factory()),
      register: registerView,
    },
  } as unknown as Context
  apply(ctx)
  const [options] = registerView.mock.calls[0] as unknown as [{ inject: () => {
    forkSession: (id: string) => Promise<string>
  } }]
  return { fork, forkSession: options.inject().forkSession, rename }
}

describe('client plugin apply', () => {
  it('registers one localized conversation.view backed by DSH session actions', async () => {
    const offLocale = vi.fn()
    const offView = vi.fn()
    const registerLocale = vi.fn(() => offLocale)
    const registerView = vi.fn(() => offView)
    const openSession = vi.fn()
    const fork = vi.fn(async () => 'child')
    const effects: Array<() => void> = []
    const ctx = {
      effect(factory: () => (() => void), _label?: string) {
        effects.push(factory())
      },
      locale: {
        register: registerLocale,
        bind: () => (key: string) => `translated:${key}`,
      },
      sessions: {
        fork,
        list: {
          getSnapshot: () => ({ ids: [], byId: {} }),
          subscribe: vi.fn(() => vi.fn()),
        },
        binding: vi.fn(() => undefined),
      },
      conversation: { openSession },
      slots: {
        inject: vi.fn((_name: string, factory: () => (() => void)) => factory()),
        register: registerView,
      },
    } as unknown as Context

    apply(ctx)

    expect(registerLocale).toHaveBeenCalledOnce()
    expect(registerView).toHaveBeenCalledOnce()
    expect(document.querySelector('style[data-plugin="@nirvana-jie/dsh-session-tree"]')).not.toBeNull()
    const [options, component] = registerView.mock.calls[0] as unknown as [
      { id: string; label: () => string; inject: () => {
        openSession: (id: string) => void
        forkSession: (id: string) => Promise<string>
      } },
      unknown,
    ]
    expect(options.id).toBe('session-tree')
    expect(options.label()).toBe('translated:view.label')
    expect(component).toBe(SessionTreeView)

    const actions = options.inject()
    expect(() => { actions.openSession('root') }).not.toThrow()
    await expect(actions.forkSession('root')).resolves.toBe('child')
    expect(openSession).toHaveBeenCalledWith('root', 'chat')
    expect(fork).toHaveBeenCalledWith({ sessionId: 'root' })

    for (const dispose of effects.reverse()) dispose()
    expect(offLocale).toHaveBeenCalledOnce()
    expect(document.querySelector('style[data-plugin="@nirvana-jie/dsh-session-tree"]')).toBeNull()
  })

  it('persists the first child title as a path below its selected parent', async () => {
    const { fork, forkSession, rename } = lineageForkFixture([
      { id: 'parent', title: '仓库用途查询-测试 (1)' },
    ])
    await forkSession('parent')

    expect(fork).toHaveBeenCalledWith({ sessionId: 'parent' })
    expect(rename).toHaveBeenCalledWith('仓库用途查询-测试 (1) (1)')
  })

  it('advances only matching direct-fork siblings in the selected parent path', async () => {
    const { forkSession, rename } = lineageForkFixture([
      { id: 'parent', title: '测试 (1)' },
      { id: 'first', parentId: 'parent', title: '测试 (1) (1)' },
      { id: 'third', parentId: 'parent', title: '测试 (1) (3)' },
      { id: 'legacy', parentId: 'parent', title: '测试 (2)' },
      { id: 'worker', parentId: 'parent', origin: 'subagent', title: '测试 (1) (9)' },
      { id: 'cousin', parentId: 'other', title: '测试 (1) (8)' },
    ])

    await forkSession('parent')

    expect(rename).toHaveBeenCalledWith('测试 (1) (4)')
  })

  it('retains the durable child identity when lineage-title persistence fails', async () => {
    const { forkSession } = lineageForkFixture(
      [{ id: 'parent', title: '测试 (1)' }],
      { ok: false, error: { code: 'title-invalid', message: 'too long' } },
    )

    await expect(forkSession('parent')).rejects.toMatchObject({
      name: 'LineageTitleError',
      childId: 'child',
    })
  })

})
