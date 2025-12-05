"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  className?: string
  withBottomNav?: boolean
  noPadding?: boolean
}

export function PageContainer({
  children,
  className,
  withBottomNav = true,
  noPadding = false
}: PageContainerProps) {
  return (
    <div className={cn(
      "min-h-screen w-full bg-white flex flex-col overflow-x-hidden",
      withBottomNav && "scroll-safe-bottom",
      className
    )}>
      {children}
    </div>
  )
}

interface PageContentProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function PageContent({
  children,
  className,
  noPadding = false
}: PageContentProps) {
  return (
    <div className={cn(
      "flex-1 w-full overflow-y-auto",
      !noPadding && "px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5",
      "pb-20 xs:pb-22 sm:pb-24 md:pb-26",
      className
    )}>
      {children}
    </div>
  )
}
