import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex min-h-[48px] w-full rounded-lg xs:rounded-xl border-2 border-border bg-input px-3 xs:px-4 py-2.5 xs:py-3 text-base transition-all duration-200',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:border-primary/50',
        'touch-manipulation',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
