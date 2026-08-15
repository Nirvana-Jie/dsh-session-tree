import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button,
  IconAgentPresetOutline16,
  IconBranchOutline16,
  IconNewChatOutline16,
  IconTriangleRightFill14,
  Pill,
  StateDot,
  type StateDotState,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { buildSessionTree, type SessionRelation, type SessionTreeNode } from './session-tree.js'

/** DSH-owned navigation actions injected by the plugin registration. */
export interface SessionTreeViewInjected {
  readonly openSession: (id: SessionId) => void
  readonly forkSession: (id: SessionId) => Promise<SessionId>
}

/** Complete props assembled for the Session Tree conversation view. */
export type SessionTreeViewProps = ConvViewProps
  & InjectFace<SessionTreeViewInjected>
  & PropsLocale<'session-tree'>

function relationIcon(relation: SessionRelation): ReactNode {
  if (relation === 'root') return <IconNewChatOutline16 />
  if (relation === 'fork') return <IconBranchOutline16 />
  return <IconAgentPresetOutline16 />
}

type SessionStatus = 'approval' | 'plan-review' | 'question' | 'running' | 'completed' | 'idle'

function statusOf(summary: SessionSummary): SessionStatus {
  if (summary.pendingInteraction !== undefined) return summary.pendingInteraction
  if (summary.running) return 'running'
  if (summary.completed === true) return 'completed'
  return 'idle'
}

function statusState(status: SessionStatus): StateDotState {
  if (status === 'approval' || status === 'plan-review' || status === 'question') return 'warning'
  if (status === 'running') return 'ongoing'
  return 'done'
}

function StatusMark({ status }: { readonly status: SessionStatus }) {
  return <StateDot state={statusState(status)} size={10} />
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const USER_HOME_PREFIX = /^(?:\/(?:Users|home)\/[^/\\]+|[A-Za-z]:[\\/]Users[\\/][^/\\]+)(?=$|[\\/])/

function formatWorkspacePath(value: string): string {
  const homePrefix = USER_HOME_PREFIX.exec(value)?.[0]
  if (homePrefix === undefined) return value
  const remainder = value.slice(homePrefix.length).replaceAll('\\', '/')
  return `~${remainder}`
}

interface TreeNodeProps {
  readonly node: SessionTreeNode
  readonly selectedId: SessionId
  readonly focusedId: SessionId
  readonly expanded: ReadonlySet<SessionId>
  readonly select: (id: SessionId) => void
  readonly toggle: (id: SessionId) => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, node: SessionTreeNode) => void
  readonly register: (id: SessionId, element: HTMLButtonElement | null) => void
  readonly t: SessionTreeViewProps['t']
}

function TreeNode({
  node,
  selectedId,
  focusedId,
  expanded,
  select,
  toggle,
  onKeyDown,
  register,
  t,
}: TreeNodeProps) {
  const status = statusOf(node.summary)
  const expandable = node.children.length > 0
  const open = expandable && expanded.has(node.summary.id)
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (expandable && event.target instanceof Element
      && event.target.closest('[data-tree-toggle]') !== null) {
      toggle(node.summary.id)
      return
    }
    select(node.summary.id)
  }
  return (
    <li role="none">
      <button
        className="dst-node"
        type="button"
        role="treeitem"
        aria-level={node.depth + 1}
        aria-expanded={expandable ? open : undefined}
        aria-selected={selectedId === node.summary.id}
        aria-current={node.current ? 'page' : undefined}
        data-current={node.current}
        data-relation={node.relation}
        data-selected={selectedId === node.summary.id}
        tabIndex={focusedId === node.summary.id ? 0 : -1}
        ref={(element) => { register(node.summary.id, element) }}
        onClick={handleClick}
        onKeyDown={(event) => { onKeyDown(event, node) }}
      >
        <span
          className="dst-node-disclosure"
          data-expanded={open}
          data-tree-toggle={expandable ? '' : undefined}
          aria-hidden="true"
        >
          {expandable && <IconTriangleRightFill14 />}
        </span>
        <span className="dst-node-icon" aria-hidden="true">{relationIcon(node.relation)}</span>
        <span className="dst-node-copy">
          <span className="dst-node-title-line">
            <span className="dst-node-title">{node.summary.displayTitle}</span>
            {node.titleQualifier !== undefined && (
              <span className="dst-node-qualifier">{node.titleQualifier}</span>
            )}
          </span>
          <span className="dst-node-meta">
            <StatusMark status={status} />
            <span>{t(`status.${status}`)}</span>
          </span>
        </span>
      </button>
      {open && (
        <ul role="group">
          {node.children.map(child => (
            <TreeNode
              key={child.summary.id}
              node={child}
              selectedId={selectedId}
              focusedId={focusedId}
              expanded={expanded}
              select={select}
              toggle={toggle}
              onKeyDown={onKeyDown}
              register={register}
              t={t}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function initiallyExpanded(tree: ReturnType<typeof buildSessionTree>, id: SessionId): Set<SessionId> {
  const expanded = new Set<SessionId>()
  let node = tree.nodesById[id]
  while (node !== undefined) {
    expanded.add(node.summary.id)
    node = node.summary.parentId === undefined ? undefined : tree.nodesById[node.summary.parentId]
  }
  return expanded
}

function visibleNodes(
  roots: readonly SessionTreeNode[],
  expanded: ReadonlySet<SessionId>,
): SessionTreeNode[] {
  const visible: SessionTreeNode[] = []
  const visit = (node: SessionTreeNode): void => {
    visible.push(node)
    if (!expanded.has(node.summary.id)) return
    for (const child of node.children) visit(child)
  }
  for (const root of roots) visit(root)
  return visible
}

function isDescendant(
  tree: ReturnType<typeof buildSessionTree>,
  candidateId: SessionId,
  ancestorId: SessionId,
): boolean {
  let node = tree.nodesById[candidateId]
  while (node?.summary.parentId !== undefined) {
    if (node.summary.parentId === ancestorId) return true
    node = tree.nodesById[node.summary.parentId]
  }
  return false
}

function metricKey(
  value: number,
  singular: 'session' | 'fork',
): 'metric.session' | 'metric.sessions' | 'metric.fork' | 'metric.forks' {
  return value === 1 ? `metric.${singular}` : `metric.${singular}s`
}

/** Live DSH conversation view for lineage navigation and safe branching. */
export function SessionTreeView({
  sessionId,
  useSessions,
  openSession,
  forkSession,
  t,
}: SessionTreeViewProps) {
  const sessions = useSessions(value => value)
  const tree = useMemo(() => buildSessionTree(sessions), [sessions])
  const initial = tree.nodesById[sessionId] ?? tree.roots[0]
  const [selectedId, setSelectedId] = useState<SessionId>(initial?.summary.id ?? sessionId)
  const selected = tree.nodesById[selectedId] ?? tree.nodesById[sessionId] ?? tree.roots[0]
  const [focusedId, setFocusedId] = useState<SessionId>(initial?.summary.id ?? sessionId)
  const [expandedIds, setExpandedIds] = useState<Set<SessionId>>(
    () => initiallyExpanded(tree, initial?.summary.id ?? sessionId),
  )
  const visible = useMemo(() => visibleNodes(tree.roots, expandedIds), [tree, expandedIds])
  const effectiveFocusedId = visible.some(node => node.summary.id === focusedId)
    ? focusedId
    : selected?.summary.id ?? visible[0]?.summary.id ?? sessionId
  const nodeElements = useRef(new Map<SessionId, HTMLButtonElement>())
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState<string | null>(null)

  const registerNode = (id: SessionId, element: HTMLButtonElement | null): void => {
    if (element === null) nodeElements.current.delete(id)
    else nodeElements.current.set(id, element)
  }

  const focusAndSelect = (id: SessionId): void => {
    setFocusedId(id)
    setSelectedId(id)
    nodeElements.current.get(id)?.focus()
  }

  const toggleNode = (id: SessionId): void => {
    const closing = expandedIds.has(id)
    setFocusedId(id)
    nodeElements.current.get(id)?.focus()
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (closing && selected !== undefined
      && selected.summary.id !== id
      && isDescendant(tree, selected.summary.id, id)) {
      focusAndSelect(id)
    }
  }

  const handleTreeKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    node: SessionTreeNode,
  ): void => {
    const index = visible.findIndex(candidate => candidate.summary.id === node.summary.id)
    if (index < 0) return
    const moveTo = (candidate: SessionTreeNode | undefined): void => {
      if (candidate !== undefined) focusAndSelect(candidate.summary.id)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (node.children.length === 0) return
      if (!expandedIds.has(node.summary.id)) toggleNode(node.summary.id)
      else moveTo(node.children[0])
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (node.children.length > 0 && expandedIds.has(node.summary.id)) {
        toggleNode(node.summary.id)
      } else if (node.summary.parentId !== undefined) {
        moveTo(tree.nodesById[node.summary.parentId])
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveTo(visible[index + 1])
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveTo(visible[index - 1])
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      moveTo(visible[0])
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      moveTo(visible.at(-1))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      focusAndSelect(node.summary.id)
      return
    }
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
    const prefix = event.key.toLocaleLowerCase()
    const ordered = [...visible.slice(index + 1), ...visible.slice(0, index + 1)]
    const match = ordered.find(candidate => candidate.summary.displayTitle
      .toLocaleLowerCase().startsWith(prefix))
    if (match !== undefined) {
      event.preventDefault()
      focusAndSelect(match.summary.id)
    }
  }

  const createFork = async (): Promise<void> => {
    if (selected === undefined || forking) return
    setForking(true)
    setForkError(null)
    try {
      const childId = await forkSession(selected.summary.id)
      try {
        openSession(childId)
      } catch (error) {
        setForkError(t('feedback.openFailed', {
          message: error instanceof Error ? error.message : String(error),
        }))
      }
    } catch (error) {
      setForkError(t('feedback.createFailed', {
        message: error instanceof Error ? error.message : String(error),
      }))
    } finally {
      setForking(false)
    }
  }

  return (
    <section
      className="dst-view"
      aria-labelledby="dst-title"
      data-conversation-composer-overlay=""
    >
      <header className="dst-toolbar">
        <div className="dst-heading">
          <h1 id="dst-title">{t('header.title')}</h1>
          <p>{t('header.description')}</p>
        </div>
        <div className="dst-summary" aria-label={t('tree.title')}>
          <span>{t(metricKey(tree.totals.sessions, 'session'), { count: tree.totals.sessions })}</span>
          <span aria-hidden="true">·</span>
          <span>{t(metricKey(tree.totals.forks, 'fork'), { count: tree.totals.forks })}</span>
          <span aria-hidden="true">·</span>
          <span>{t('metric.running', { count: tree.totals.running })}</span>
        </div>
      </header>

      <div className="dst-workspace">
        <section className="dst-tree-panel" aria-labelledby="dst-tree-heading">
          <header className="dst-pane-header">
            <h2 id="dst-tree-heading">{t('tree.title')}</h2>
            <span>{t('tree.subtitle')}</span>
          </header>
          <div className="dst-pane-scroll">
            {sessions.phase === 'pending' ? (
              <div className="dst-state">{t('state.loading')}</div>
            ) : tree.roots.length === 0 ? (
              <div className="dst-state">{t('state.empty')}</div>
            ) : (
              <ul className="dst-tree" role="tree" aria-label={t('tree.title')}>
                {tree.roots.map(root => (
                  <TreeNode
                    key={root.summary.id}
                    node={root}
                    selectedId={selected?.summary.id ?? sessionId}
                    focusedId={effectiveFocusedId}
                    expanded={expandedIds}
                    select={focusAndSelect}
                    toggle={toggleNode}
                    onKeyDown={handleTreeKey}
                    register={registerNode}
                    t={t}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside
          className="dst-detail"
          aria-label={t('detail.heading')}
        >
          <header className="dst-pane-header">
            <h2>{selected?.summary.displayTitle ?? t('state.empty')}</h2>
          </header>
          <div className="dst-detail-scroll">
            {selected !== undefined && (
              <>
                <div className="dst-detail-badges">
                  <Pill>{t(`relation.${selected.relation}`)}</Pill>
                  <span className="dst-status-label">
                    <StatusMark status={statusOf(selected.summary)} />
                    {t(`status.${statusOf(selected.summary)}`)}
                  </span>
                </div>
                <dl className="dst-facts">
                  <div className="dst-fact">
                    <dt>{t('detail.sessionId')}</dt>
                    <dd><code>{selected.summary.id}</code></dd>
                  </div>
                  <div className="dst-fact">
                    <dt>{t('detail.parent')}</dt>
                    <dd><code>{selected.summary.parentId ?? t('detail.none')}</code></dd>
                  </div>
                  <div className="dst-fact">
                    <dt>{t('detail.workspace')}</dt>
                    <dd>{selected.summary.cwd === undefined
                      ? t('detail.none')
                      : formatWorkspacePath(selected.summary.cwd)}</dd>
                  </div>
                  <div className="dst-fact">
                    <dt>{t('detail.preset')}</dt>
                    <dd>{selected.summary.agentPreset ?? t('detail.none')}</dd>
                  </div>
                  <div className="dst-fact">
                    <dt>{t('detail.updated')}</dt>
                    <dd>{formatTime(selected.summary.updatedAt)}</dd>
                  </div>
                </dl>
                <div className="dst-actions">
                  {selected.summary.id !== sessionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { openSession(selected.summary.id) }}
                    >
                      {t('action.open')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconBranchOutline16 />}
                    disabled={forking}
                    onClick={() => { void createFork() }}
                  >
                    {forking ? t('action.forking') : t('action.fork')}
                  </Button>
                </div>
                {forkError !== null && (
                  <p className="dst-feedback" role="alert">{forkError}</p>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
