/** Translation keys owned by the Session Tree conversation view. */
export type SessionTreeLocaleKey =
  | 'view.label'
  | 'header.title'
  | 'header.description'
  | 'metric.session'
  | 'metric.sessions'
  | 'metric.fork'
  | 'metric.forks'
  | 'metric.running'
  | 'tree.title'
  | 'tree.subtitle'
  | 'state.loading'
  | 'state.empty'
  | 'relation.root'
  | 'relation.fork'
  | 'relation.subagent'
  | 'status.approval'
  | 'status.plan-review'
  | 'status.question'
  | 'status.running'
  | 'status.completed'
  | 'status.idle'
  | 'detail.heading'
  | 'detail.sessionId'
  | 'detail.parent'
  | 'detail.workspace'
  | 'detail.preset'
  | 'detail.updated'
  | 'detail.none'
  | 'action.open'
  | 'action.fork'
  | 'action.forking'
  | 'feedback.failed'

export const en: Record<SessionTreeLocaleKey, string> = {
  'view.label': 'Session Tree',
  'header.title': 'Session lineage',
  'header.description': 'Find the right context before you continue, inspect, or branch.',
  'metric.session': '{count} session',
  'metric.sessions': '{count} sessions',
  'metric.fork': '{count} fork',
  'metric.forks': '{count} forks',
  'metric.running': '{count} running',
  'tree.title': 'Live lineage',
  'tree.subtitle': 'Roots, forks, and subagents',
  'state.loading': 'Loading session lineage…',
  'state.empty': 'No recorded sessions yet.',
  'relation.root': 'Root',
  'relation.fork': 'Fork',
  'relation.subagent': 'Subagent',
  'status.approval': 'Waiting for approval',
  'status.plan-review': 'Plan review requested',
  'status.question': 'Waiting for an answer',
  'status.running': 'Running',
  'status.completed': 'Completed',
  'status.idle': 'Idle',
  'detail.heading': 'Selected session',
  'detail.sessionId': 'Session ID',
  'detail.parent': 'Parent',
  'detail.workspace': 'Workspace',
  'detail.preset': 'Agent preset',
  'detail.updated': 'Last activity',
  'detail.none': '—',
  'action.open': 'Open session',
  'action.fork': 'Fork latest stable turn',
  'action.forking': 'Creating branch…',
  'feedback.failed': 'Could not create branch: {message}',
}

export const zh: Record<SessionTreeLocaleKey, string> = {
  'view.label': '会话树',
  'header.title': '会话谱系',
  'header.description': '在继续、检查或创建分支前，先找到正确的上下文。',
  'metric.session': '{count} 个会话',
  'metric.sessions': '{count} 个会话',
  'metric.fork': '{count} 个分支',
  'metric.forks': '{count} 个分支',
  'metric.running': '{count} 个运行中',
  'tree.title': '实时谱系',
  'tree.subtitle': '根会话、分支与子代理',
  'state.loading': '正在加载会话谱系…',
  'state.empty': '还没有已记录的会话。',
  'relation.root': '根会话',
  'relation.fork': '分支',
  'relation.subagent': '子代理',
  'status.approval': '等待审批',
  'status.plan-review': '等待计划审阅',
  'status.question': '等待回答',
  'status.running': '运行中',
  'status.completed': '已完成',
  'status.idle': '空闲',
  'detail.heading': '所选会话',
  'detail.sessionId': '会话 ID',
  'detail.parent': '父会话',
  'detail.workspace': '工作区',
  'detail.preset': 'Agent 预设',
  'detail.updated': '最近活动',
  'detail.none': '—',
  'action.open': '打开会话',
  'action.fork': '从最近稳定回合创建分支',
  'action.forking': '正在创建分支…',
  'feedback.failed': '无法创建分支：{message}',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'session-tree': SessionTreeLocaleKey
  }
}

export const NS = 'session-tree' as const
