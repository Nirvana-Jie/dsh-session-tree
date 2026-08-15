// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { SessionTreeView, type SessionTreeViewProps } from '../src/client/SessionTreeView.js'
import { en } from '../src/client/locales.js'

afterEach(cleanup)

function sid(value: string): SessionId {
  return value as SessionId
}

function summary(id: string, options: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: sid(id),
    displayTitle: id,
    running: false,
    blank: false,
    updatedAt: Date.UTC(2026, 7, 14, 9, 0),
    ...options,
  }
}

function renderView(cwd = '/workspace/storefront') {
  const root = summary('root-session', {
    displayTitle: 'Fix flaky checkout',
    cwd,
    agentPreset: 'coding',
    running: true,
  })
  const child = summary('child-session', {
    displayTitle: 'Try deterministic clock',
    parentId: root.id,
    pendingInteraction: 'approval',
    updatedAt: Date.UTC(2026, 7, 14, 9, 5),
  })
  const snapshot: SessionListState = {
    ids: [root.id, child.id],
    byId: { [root.id]: root, [child.id]: child },
    current: root.id,
    phase: 'ready',
    subagentsByParent: {},
    currentAddress: undefined,
  }
  const openSession = vi.fn()
  const forkSession = vi.fn(async () => sid('new-child'))
  const props = {
    sessionId: root.id,
    useSessions: (selector: (value: SessionListState) => unknown) => selector(snapshot),
    openSession,
    forkSession,
    t: (key: keyof typeof en, params?: Record<string, unknown>) => {
      let value = en[key]
      for (const [name, replacement] of Object.entries(params ?? {})) {
        value = value.replaceAll(`{${name}}`, String(replacement))
      }
      return value
    },
  } as unknown as SessionTreeViewProps

  const view = render(<SessionTreeView {...props} />)
  return { child, forkSession, openSession, ...view }
}

describe('SessionTreeView', () => {
  it.each([
    ['/Users/private-user/personal/dah/dsh-session-tree', '~/personal/dah/dsh-session-tree'],
    ['/home/private-user/projects/dsh-session-tree', '~/projects/dsh-session-tree'],
    ['C:\\Users\\private-user\\projects\\dsh-session-tree', '~/projects/dsh-session-tree'],
  ])('hides the local account name in the displayed workspace path %s', (cwd, displayed) => {
    renderView(cwd)

    expect(screen.getByText(displayed)).toBeVisible()
    expect(screen.queryByText(/private-user/)).not.toBeInTheDocument()
  })

  it('shows live lineage, selects a branch, and uses DSH open/fork actions', async () => {
    const { child, container, forkSession, openSession } = renderView()

    expect(screen.getByRole('heading', { name: 'Session lineage' })).toBeVisible()
    expect(container.querySelector('[data-conversation-composer-overlay]')).toBeTruthy()
    expect(container.querySelector('[data-state="ongoing"]')).toBeTruthy()
    expect(screen.getByText('2 sessions')).toBeVisible()
    expect(screen.getByText('1 fork')).toBeVisible()
    expect(screen.getAllByText('Fix flaky checkout')).toHaveLength(2)
    expect(screen.getByText('Try deterministic clock')).toBeVisible()
    expect(screen.queryByText('Current')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open session' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('treeitem', { name: /Try deterministic clock/ }))
    expect(screen.getByRole('heading', { name: 'Try deterministic clock' })).toBeVisible()
    expect(screen.getAllByText('Waiting for approval')).not.toHaveLength(0)
    expect(screen.getByText('child-session')).toBeVisible()

    const openButton = screen.getByRole('button', { name: 'Open session' })
    const forkButton = screen.getByRole('button', { name: 'Fork latest stable turn' })
    expect(openButton.querySelector('svg')).toBeNull()
    expect(openButton).toHaveAttribute('data-dsh-size', 'sm')
    expect(openButton).toHaveAttribute('data-dsh-variant', 'outline')
    expect(forkButton).toHaveAttribute('data-dsh-size', 'sm')
    expect(forkButton).toHaveAttribute('data-dsh-variant', 'ghost')

    fireEvent.click(openButton)
    expect(openSession).toHaveBeenCalledWith(child.id)
    expect(openSession).toHaveBeenCalledTimes(1)

    fireEvent.click(forkButton)
    await waitFor(() => expect(forkSession).toHaveBeenCalledWith(child.id))
    expect(openSession).toHaveBeenLastCalledWith(sid('new-child'))
    expect(screen.queryByText('Branch created.')).not.toBeInTheDocument()

    await waitFor(() => expect(forkButton).not.toBeDisabled())
    forkSession.mockRejectedValueOnce(new Error('session changed'))
    fireEvent.click(forkButton)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not create branch: session changed',
    )
  })

  it('exposes a collapsible single-select tree with standard keyboard navigation', () => {
    renderView()

    const root = screen.getByRole('treeitem', { name: /Fix flaky checkout/ })
    const child = screen.getByRole('treeitem', { name: /Try deterministic clock/ })
    expect(root).toHaveAttribute('aria-expanded', 'true')
    expect(root).toHaveAttribute('aria-selected', 'true')
    expect(root).toHaveAttribute('tabindex', '0')
    expect(child).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(root, { key: 'ArrowLeft' })
    expect(root).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('treeitem', { name: /Try deterministic clock/ })).not.toBeInTheDocument()

    fireEvent.keyDown(root, { key: 'ArrowRight' })
    expect(root).toHaveAttribute('aria-expanded', 'true')
    const revealedChild = screen.getByRole('treeitem', { name: /Try deterministic clock/ })

    fireEvent.keyDown(root, { key: 'ArrowRight' })
    expect(revealedChild).toHaveFocus()
    expect(revealedChild).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Try deterministic clock' })).toBeVisible()

    fireEvent.keyDown(revealedChild, { key: 'ArrowLeft' })
    expect(root).toHaveFocus()
    expect(root).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(root, { key: 'ArrowDown' })
    expect(revealedChild).toHaveFocus()
    fireEvent.keyDown(revealedChild, { key: 'ArrowUp' })
    expect(root).toHaveFocus()
    fireEvent.keyDown(root, { key: 'End' })
    expect(revealedChild).toHaveFocus()
    fireEvent.keyDown(revealedChild, { key: 'Home' })
    expect(root).toHaveFocus()
    fireEvent.keyDown(root, { key: 't' })
    expect(revealedChild).toHaveFocus()
    fireEvent.keyDown(revealedChild, { key: 'Enter' })
    expect(revealedChild).toHaveAttribute('aria-selected', 'true')

    const disclosure = root.querySelector<HTMLElement>('[data-tree-toggle]')
    expect(disclosure).not.toBeNull()
    fireEvent.click(disclosure!)
    expect(root).toHaveFocus()
    expect(root).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('treeitem', { name: /Try deterministic clock/ })).not.toBeInTheDocument()
  })

  it('opens only the current path by default and leaves unrelated roots collapsed', () => {
    const currentRoot = summary('current-root', { displayTitle: 'Current work' })
    const currentChild = summary('current-child', {
      displayTitle: 'Current experiment',
      parentId: currentRoot.id,
    })
    const otherRoot = summary('other-root', { displayTitle: 'Other work' })
    const hiddenChild = summary('hidden-child', {
      displayTitle: 'Unrelated experiment',
      parentId: otherRoot.id,
    })
    const snapshot: SessionListState = {
      ids: [currentRoot.id, currentChild.id, otherRoot.id, hiddenChild.id],
      byId: {
        [currentRoot.id]: currentRoot,
        [currentChild.id]: currentChild,
        [otherRoot.id]: otherRoot,
        [hiddenChild.id]: hiddenChild,
      },
      current: currentChild.id,
      phase: 'ready',
      subagentsByParent: {},
      currentAddress: undefined,
    }
    const props = {
      sessionId: currentChild.id,
      useSessions: (selector: (value: SessionListState) => unknown) => selector(snapshot),
      openSession: vi.fn(),
      forkSession: vi.fn(),
      t: (key: keyof typeof en) => en[key],
    } as unknown as SessionTreeViewProps

    render(<SessionTreeView {...props} />)

    expect(screen.getByRole('treeitem', { name: /Current work/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('treeitem', { name: /Current experiment/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('treeitem', { name: /Other work/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('treeitem', { name: /Unrelated experiment/ })).not.toBeInTheDocument()
  })

  it('keeps ordinary ids in details and adds compact qualifiers only to duplicate siblings', () => {
    const root = summary('root-session', { displayTitle: 'Main task' })
    const first = summary('session-alpha-123456', {
      displayTitle: 'Try another approach',
      parentId: root.id,
    })
    const second = summary('session-beta-123456', {
      displayTitle: 'Try another approach',
      parentId: root.id,
    })
    const snapshot: SessionListState = {
      ids: [root.id, first.id, second.id],
      byId: { [root.id]: root, [first.id]: first, [second.id]: second },
      current: root.id,
      phase: 'ready',
      subagentsByParent: {},
      currentAddress: undefined,
    }
    const props = {
      sessionId: root.id,
      useSessions: (selector: (value: SessionListState) => unknown) => selector(snapshot),
      openSession: vi.fn(),
      forkSession: vi.fn(),
      t: (key: keyof typeof en) => en[key],
    } as unknown as SessionTreeViewProps

    render(<SessionTreeView {...props} />)

    const tree = screen.getByRole('tree')
    expect(within(tree).queryByText('root-session')).not.toBeInTheDocument()
    expect(within(tree).getByText('…ha-123456')).toBeVisible()
    expect(within(tree).getByText('…ta-123456')).toBeVisible()
    expect(screen.getByText('root-session')).toBeVisible()
  })

  it('renders the DSH loading state without inventing placeholder sessions', () => {
    const props = {
      sessionId: sid('current'),
      useSessions: (selector: (value: SessionListState) => unknown) => selector({
        ids: [],
        byId: {},
        current: undefined,
        phase: 'pending',
        subagentsByParent: {},
        currentAddress: undefined,
      }),
      openSession: vi.fn(),
      forkSession: vi.fn(),
      t: (key: keyof typeof en) => en[key],
    } as unknown as SessionTreeViewProps

    render(<SessionTreeView {...props} />)

    expect(screen.getByText('Loading session lineage…')).toBeVisible()
    expect(screen.queryByRole('treeitem')).not.toBeInTheDocument()
  })

  it('renders the ready empty state without session actions', () => {
    const props = {
      sessionId: sid('missing'),
      useSessions: (selector: (value: SessionListState) => unknown) => selector({
        ids: [],
        byId: {},
        current: undefined,
        phase: 'ready',
        subagentsByParent: {},
        currentAddress: undefined,
      }),
      openSession: vi.fn(),
      forkSession: vi.fn(),
      t: (key: keyof typeof en) => en[key],
    } as unknown as SessionTreeViewProps

    render(<SessionTreeView {...props} />)

    expect(screen.getAllByText('No recorded sessions yet.')).not.toHaveLength(0)
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fork latest stable turn' })).not.toBeInTheDocument()
  })
})
