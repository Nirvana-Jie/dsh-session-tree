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
    const showChat = vi.fn()
    const getConversation = vi.fn(() => ({ showChat }))
    const scope = vi.fn(() => ({ get: getConversation }))
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
      sessions: { open, fork, scope },
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
    actions.openSession('root')
    await expect(actions.forkSession('root')).resolves.toBe('child')
    expect(scope).toHaveBeenCalledWith('root')
    expect(getConversation).toHaveBeenCalledWith('conversation')
    expect(showChat).toHaveBeenCalledOnce()
    expect(open).toHaveBeenCalledWith('root')
    expect(showChat.mock.invocationCallOrder[0]).toBeLessThan(open.mock.invocationCallOrder[0]!)
    expect(fork).toHaveBeenCalledWith({ sessionId: 'root', increaseTitle: true })

    for (const dispose of effects.reverse()) dispose()
    expect(offLocale).toHaveBeenCalledOnce()
    expect(document.querySelector('style[data-plugin="@nirvana-jie/dsh-session-tree"]')).toBeNull()
  })

  it.each([
    {
      label: 'the target session scope is missing',
      scope: () => undefined,
      message: /resolved no scope/,
    },
    {
      label: 'the target Conversation service is missing',
      scope: () => ({ get: () => undefined }),
      message: /conversation service unavailable/,
    },
  ])('fails before navigation when $label', ({ scope, message }) => {
    const open = vi.fn()
    const registerView = vi.fn(() => vi.fn())
    const ctx = {
      effect(factory: () => (() => void), _label?: string) {
        factory()
      },
      locale: {
        register: vi.fn(() => vi.fn()),
        bind: () => (key: string) => key,
      },
      sessions: { open, fork: vi.fn(), scope },
      slots: {
        inject: vi.fn((_name: string, factory: () => (() => void)) => factory()),
        register: registerView,
      },
    } as unknown as Context

    apply(ctx)

    const [options] = registerView.mock.calls[0] as unknown as [{
      inject: () => { openSession: (id: string) => void }
    }]
    expect(() => { options.inject().openSession('target') }).toThrow(message)
    expect(open).not.toHaveBeenCalled()
  })
})
