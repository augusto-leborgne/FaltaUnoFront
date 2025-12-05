import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[96px] xs:min-h-24 w-full rounded-lg xs:rounded-xl border-2 border-border bg-input px-3 xs:px-4 py-2.5 xs:py-3 text-base transition-all duration-200',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:border-primary/50',
        'resize-none touch-manipulation',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
