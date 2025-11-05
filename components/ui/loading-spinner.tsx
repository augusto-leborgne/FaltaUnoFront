import { cn } from "@/lib/utils"
import React from "react"

/**
 * Modern smooth circular spinner - always animating
 * Ultra-modern design with clean gradient effect
 */
const ModernSpinner = React.memo(({ className, size }: { className?: string; size: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    {/* Keyframes inyectados globalmente */}
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes spin-smooth {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes fade-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `}} />
    
    {/* Base circle - más delgado y moderno */}
    <div 
      className={cn(
        "rounded-full border-2 border-gray-200",
        size
      )} 
    />
    
    {/* Gradient spinner - siempre rotando suavemente */}
    <div 
      className={cn(
        "absolute inset-0 rounded-full",
        size
      )}
      style={{
        background: 'conic-gradient(from 90deg, transparent 0deg, #10b981 90deg, #059669 180deg, transparent 180deg)',
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
        animation: 'spin-smooth 0.8s cubic-bezier(0.4, 0.0, 0.2, 1) infinite'
      }}
    />
  </div>
))
ModernSpinner.displayName = 'ModernSpinner'

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * - sm: 16px (w-4 h-4)
   * - md: 24px (w-6 h-6)
   * - lg: 32px (w-8 h-8)
   * - xl: 48px (w-12 h-12)
   * - 2xl: 64px (w-16 h-16)
   */
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  /**
   * Color variant
   * - green: Modern green spinner (DEFAULT - recommended)
   * - primary: App primary color (#159895)
   * - white: White spinner for dark backgrounds
   * - gray: Gray spinner
   */
  variant?: "green" | "primary" | "white" | "gray"
  /**
   * Optional text to show below the spinner
   */
  text?: string
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Whether to center the spinner (adds mx-auto)
   */
  centered?: boolean
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  "2xl": "w-20 h-20",
}

const variantClasses = {
  green: "text-green-600 border-green-600",
  primary: "text-[#159895] border-[#159895]",
  white: "text-white border-white",
  gray: "text-gray-400 border-gray-400",
}

/**
 * Modern, consistent loading spinner component with green gradient effect
 * 
 * @example
 * // Simple centered spinner (green by default)
 * <LoadingSpinner />
 * 
 * @example
 * // Large green spinner with text
 * <LoadingSpinner size="xl" text="Cargando..." />
 * 
 * @example
 * // Small white spinner for buttons
 * <LoadingSpinner size="sm" variant="white" />
 * 
 * @example
 * // Full page loading state
 * <div className="flex flex-col items-center justify-center min-h-screen">
 *   <LoadingSpinner size="2xl" text="Cargando datos..." />
 * </div>
 */
export function LoadingSpinner({
  size = "lg",
  variant = "green",
  text,
  className,
  centered = false,
}: LoadingSpinnerProps) {
  const sizeClass = sizeClasses[size]
  
  return (
    <div className={cn("flex flex-col items-center gap-3", centered && "mx-auto", className)}>
      <ModernSpinner size={sizeClass} className={sizeClass} />
      {text && (
        <p className={cn(
          "text-sm font-medium",
          variant === "white" ? "text-white" : "text-gray-600"
        )}>
          {text}
        </p>
      )}
    </div>
  )
}

/**
 * Full page loading spinner - centers spinner in the middle of the screen
 * 
 * @example
 * if (loading) return <FullPageSpinner text="Cargando perfil..." />
 */
export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <LoadingSpinner size="xl" variant="green" text={text} />
    </div>
  )
}

/**
 * Inline loading spinner for small spaces (e.g., loading text)
 * 
 * @example
 * {loading ? <InlineSpinner /> : "Cargar más"}
 */
export function InlineSpinner({ variant = "green" }: { variant?: LoadingSpinnerProps["variant"] }) {
  return <LoadingSpinner size="sm" variant={variant} />
}
