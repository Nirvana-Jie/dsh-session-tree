/** Browser plugin registering Session Tree into the DSH conversation view ring. */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { en, NS, zh } from './locales.js'
import { SessionTreeView, type SessionTreeViewInjected } from './SessionTreeView.js'
import { installStyles } from './styles.js'

/** Required DSH Web services. */
export const inject = ['slots', 'sessions', 'locale']

/** Register the localized Session Tree conversation view. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-session-tree: dictionaries')
  ctx.effect(installStyles, 'dsh-session-tree: styles')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'session-tree',
    order: 20,
    locale: NS,
    label: () => t('view.label'),
    inject: (): SessionTreeViewInjected => ({
      openSession: (id: SessionId) => {
        ctx.sessions.open(id)
      },
      forkSession: (id: SessionId) => ctx.sessions.fork({
        sessionId: id,
        increaseTitle: true,
      }),
    }),
  }, SessionTreeView))
}
