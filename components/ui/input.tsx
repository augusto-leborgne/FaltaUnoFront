import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full rounded-xl border-2 border-border bg-input px-4 py-3 text-sm transition-all duration-200',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:border-primary/50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
