import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-blue text-white shadow-sm hover:bg-brand-blue-dark focus-visible:outline-brand-blue',
  secondary:
    'border border-slate-200 bg-white text-brand-navy hover:border-brand-blue/40 hover:bg-sky-50 focus-visible:outline-brand-blue',
  quiet:
    'bg-transparent text-brand-navy hover:bg-slate-100 focus-visible:outline-brand-blue',
}

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
