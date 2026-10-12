import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-action text-white shadow-ambient hover:bg-action-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
  secondary:
    'border border-black/10 bg-white text-action hover:bg-action-tint active:bg-action-tint-pressed disabled:cursor-not-allowed disabled:opacity-50',
  ghost:
    'bg-transparent text-action hover:bg-action-tint active:bg-action-tint-pressed disabled:cursor-not-allowed disabled:opacity-50',
}

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
