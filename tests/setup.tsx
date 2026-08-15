import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const Icon = () => <svg aria-hidden="true" />
  return {
    Button: ({ icon, children, variant = 'ghost', size = 'md', ...props }: {
      readonly icon?: ReactNode
      readonly children?: ReactNode
      readonly variant?: string
      readonly size?: 'md' | 'sm'
    } & ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button data-dsh-variant={variant} data-dsh-size={size} {...props}>{icon}{children}</button>
    ),
    Pill: ({ children }: { readonly children?: ReactNode }) => <span>{children}</span>,
    StateDot: ({ state }: { readonly state: string }) => <span data-state={state} />,
    IconAgentPresetOutline16: Icon,
    IconBranchOutline16: Icon,
    IconNewChatOutline16: Icon,
    IconRightUpOutline16: Icon,
    IconTriangleRightFill14: Icon,
  }
})
