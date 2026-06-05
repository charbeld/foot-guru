import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2.5 text-white placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
            'transition-colors',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
