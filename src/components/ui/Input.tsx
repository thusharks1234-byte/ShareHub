import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Input({
  className = '',
  id,
  label,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className="flex min-w-0 flex-col gap-1.5" htmlFor={inputId}>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <input
        className={`min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-brand-navy outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 ${className}`}
        id={inputId}
        {...props}
      />
    </label>
  )
}
