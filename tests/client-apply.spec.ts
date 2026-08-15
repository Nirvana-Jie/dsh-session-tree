// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.js'
import { SessionTreeView } from '../src/client/SessionTreeView.js'

afterEach(() => {
  document.querySelectorAll('style[data-plugin="@nirvana-jie/dsh-session-tree"]')
    .forEach(element => { element.remove() })
})

describe('client plugin apply', () => {
  it('registers one localized conversation.view backed by DSH session actions', async () => {
    const offLocale = vi.fn()
    const offView = vi.fn()
    const registerLocale = vi.fn(() => offLocale)
    const registerView = vi.fn(() => offView)
    const open = vi.fn()
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
      sessions: { open, fork },
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
    expect(open).toHaveBeenCalledWith('root')
    expect(fork).toHaveBeenCalledWith({ sessionId: 'root', increaseTitle: true })

    for (const dispose of effects.reverse()) dispose()
    expect(offLocale).toHaveBeenCalledOnce()
    expect(document.querySelector('style[data-plugin="@nirvana-jie/dsh-session-tree"]')).toBeNull()
  })

})
