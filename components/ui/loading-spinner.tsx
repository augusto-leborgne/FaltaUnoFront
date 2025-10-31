import { cn } from "@/lib/utils"

/**
 * Modern green circular spinner with gradient effect
 * This is a sophisticated spinner with a thicker, more visible border
 */
const ModernGreenSpinner = ({ className, size }: { className?: string; size: string }) => (
  <div className={cn("relative", className)}>
    {/* Base circle (light green, more visible) */}
    <div 
      className={cn(
        "rounded-full border-[3px] border-green-300",
        size
      )} 
    />
    {/* Animated segment (thick green) */}
    <div 
      className={cn(
        "absolute inset-0 rounded-full animate-spin",
        "border-[4px] border-transparent border-t-green-600",
        size
      )}
      style={{
        background: 'conic-gradient(from 0deg, transparent 0%, transparent 70%, #16a34a 70%, #16a34a 100%)',
        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))',
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))'
      }}
    />
  </div>
)

/**
 * Simple thin-border circular spinner (fallback/alternative)
 */
const CircleSpinner = ({ className }: { className?: string }) => (
  <div 
    className={cn(
      "rounded-full border-2 border-t-transparent animate-spin",
      className
    )} 
  />
)

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
      {variant === "green" ? (
        <ModernGreenSpinner size={sizeClass} className={sizeClass} />
      ) : (
        <CircleSpinner 
          className={cn(
            sizeClass,
            variantClasses[variant]
          )} 
        />
      )}
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
