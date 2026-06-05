import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-green-500 text-white hover:bg-green-400 active:scale-95 shadow-lg shadow-green-500/20':
              variant === 'primary',
            'bg-white/10 text-white hover:bg-white/20 border border-white/20':
              variant === 'secondary',
            'text-gray-400 hover:text-white hover:bg-white/10':
              variant === 'ghost',
            'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30':
              variant === 'danger',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5 text-base': size === 'md',
            'px-8 py-3.5 text-lg': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
