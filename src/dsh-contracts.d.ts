/**
 * Minimal compile-time faces consumed by this out-of-tree Web plugin.
 * DeepSeek Harness supplies the real modules and runtime identities when the
 * package is loaded; these declarations keep git installs self-contained.
 */

declare module '@deepseek-ai/dsh-client-runtime/client' {
  const sessionIdBrand: unique symbol
  export type SessionId = string & { readonly [sessionIdBrand]: true }

  export interface SessionSummary {
    readonly id: SessionId
    readonly title?: string
    readonly displayTitle: string
    readonly cwd?: string
    readonly agentPreset?: string
    readonly parentId?: SessionId
    readonly origin?: 'subagent'
    readonly running: boolean
    readonly pendingInteraction?: 'approval' | 'plan-review' | 'question'
    readonly completed?: boolean
    readonly blank: boolean
    readonly updatedAt: number
  }

  export interface SessionListState {
    readonly ids: readonly SessionId[]
    readonly byId: Readonly<Record<SessionId, SessionSummary>>
    readonly current: SessionId | undefined
    readonly phase: 'pending' | 'ready'
    readonly subagentsByParent: Readonly<Record<string, unknown>>
    readonly currentAddress: unknown
  }

  export interface ISessions {
    open(id: SessionId): void
    fork(options: { sessionId: SessionId; atSeq?: number; increaseTitle?: boolean }): Promise<SessionId>
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  export interface LocaleNamespaceMap {}

  export type Translate<Key extends string = string> =
    (key: Key, params?: Record<string, unknown>) => string

  export type LocaleKeysOf<Namespace extends keyof LocaleNamespaceMap & string> =
    LocaleNamespaceMap[Namespace] & string

  export type PropsLocale<Namespace> = Namespace extends keyof LocaleNamespaceMap & string
    ? { readonly t: Translate<LocaleKeysOf<Namespace>> }
    : object

  export type InjectFace<Injected extends object> = Injected
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'

  export interface ConvViewProps {
    readonly sessionId: SessionId
    readonly useSessions: <Selected>(selector: (state: SessionListState) => Selected) => Selected
  }
}

declare module '@deepseek-ai/dsh-client-locale/client' {}

declare module '@deepseek-ai/cordis' {
  import type { ISessions } from '@deepseek-ai/dsh-client-runtime/client'

  export interface Context {
    effect(factory: () => void | (() => void), label?: string): void
    readonly locale: {
      register(
        namespace: string,
        dictionaries: Readonly<Record<'zh' | 'en', Readonly<Record<string, string>>>>,
      ): () => void
      bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
    }
    readonly sessions: ISessions
    readonly slots: {
      inject(name: string, factory: () => (() => void)): void
      register(
        options: {
          readonly name: string
          readonly id: string
          readonly order?: number
          readonly locale?: string
          readonly label?: () => string
          readonly inject?: () => object
        },
        component: (props: never) => unknown,
      ): () => void
    }
  }
}
