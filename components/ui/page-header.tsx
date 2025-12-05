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
    <div className="w-full mt-3 xs:mt-4 sm:mt-5 pt-6 xs:pt-8 sm:pt-10 md:pt-12 pb-3 sm:pb-4 md:pb-5 px-3 sm:px-4 md:px-6 border-b border-gray-100 bg-white safe-top">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 xs:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg xs:rounded-xl transition-colors touch-manipulation min-w-[40px] xs:min-w-[44px] sm:min-w-[48px] min-h-[40px] xs:min-h-[44px] sm:min-h-[48px] flex items-center justify-center active:scale-95 flex-shrink-0"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
          )}
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {Icon && (
              <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg xs:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5.5 sm:h-5.5 text-green-600" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
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
