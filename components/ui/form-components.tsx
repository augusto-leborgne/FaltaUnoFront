"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FormSectionProps {
  children: ReactNode
  className?: string
}

export function FormSection({ children, className }: FormSectionProps) {
  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 shadow-sm",
      className
    )}>
      {children}
    </div>
  )
}

interface FormSectionTitleProps {
  children: ReactNode
  className?: string
}

export function FormSectionTitle({ children, className }: FormSectionTitleProps) {
  return (
    <h3 className={cn(
      "text-sm xs:text-base sm:text-lg font-bold text-gray-900 mb-3 xs:mb-4",
      className
    )}>
      {children}
    </h3>
  )
}

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5 xs:space-y-2", className)}>
      <label className="block text-xs xs:text-sm sm:text-base font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs xs:text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  )
}

interface FormActionsProps {
  children: ReactNode
  className?: string
  sticky?: boolean
}

export function FormActions({ children, className, sticky = false }: FormActionsProps) {
  return (
    <div className={cn(
      "flex flex-col xs:flex-row gap-2 xs:gap-3 sm:gap-4 mt-6 xs:mt-7 sm:mt-8",
      sticky && "sticky bottom-0 bg-white border-t border-gray-200 p-3 xs:p-4 sm:p-5 -mx-3 xs:-mx-4 sm:-mx-6 -mb-3 xs:-mb-4 sm:-mb-5",
      className
    )}>
      {children}
    </div>
  )
}
