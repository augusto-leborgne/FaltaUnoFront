import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] touch-manipulation min-h-[44px] min-w-[44px] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90 active:bg-primary/80',
        destructive:
          'bg-destructive text-white shadow-md hover:shadow-lg hover:bg-destructive/90 active:bg-destructive/80',
        outline:
          'border-2 border-border bg-background hover:bg-muted hover:border-primary/50 active:bg-muted/80',
        secondary:
          'bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:bg-secondary/90 active:bg-secondary/80',
        ghost:
          'hover:bg-muted active:bg-muted/80',
        link: 'text-primary underline-offset-4 hover:underline min-h-0 min-w-0',
      },
      size: {
        default: 'min-h-[48px] px-5 xs:px-6 py-2.5 has-[>svg]:px-4 text-sm xs:text-base',
        sm: 'min-h-[44px] rounded-lg gap-1.5 px-3 xs:px-4 has-[>svg]:px-3 text-xs xs:text-sm',
        lg: 'min-h-[52px] xs:min-h-[56px] rounded-xl px-6 xs:px-8 has-[>svg]:px-5 xs:has-[>svg]:px-6 text-base xs:text-lg',
        icon: 'size-11 xs:size-12 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
