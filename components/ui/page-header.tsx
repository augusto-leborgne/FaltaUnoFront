"use client"

import { ArrowLeft, LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  rightElement?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightElement,
  icon: Icon,
  badge
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div className="w-full pt-4 xs:pt-6 sm:pt-8 md:pt-10 pb-3 xs:pb-3.5 sm:pb-4 md:pb-5 px-3 xs:px-4 sm:px-5 md:px-6 border-b border-gray-100 bg-white safe-top">
      <div className="flex items-center justify-between gap-2 xs:gap-3">
        <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2.5 xs:p-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg xs:rounded-xl transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 flex-shrink-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5 xs:w-5.5 sm:w-6 text-gray-700" />
            </button>
          )}
          
          <div className="flex items-center gap-2 xs:gap-2.5 flex-1 min-w-0">
            {Icon && (
              <div className="w-9 xs:w-10 sm:w-11 h-9 xs:h-10 sm:h-11 bg-green-100 rounded-lg xs:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 xs:w-5.5 sm:w-6 h-5 xs:h-5.5 sm:h-6 text-green-600" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs xs:text-sm sm:text-base text-gray-600 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {rightElement && (
          <div className="flex-shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
}
