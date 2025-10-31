import { cn } from "@/lib/utils"

/**
 * Simple circular spinner (thin border, no SVG)
 * This is the classic green spinner with thin borders
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
   * - primary: App primary color (#159895)
   * - white: White spinner for dark backgrounds
   * - gray: Gray spinner
   * - green: Green spinner (legacy support)
   */
  variant?: "primary" | "white" | "gray" | "green"
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
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
  "2xl": "w-16 h-16",
}

const variantClasses = {
  primary: "text-[#159895]",
  white: "text-white",
  gray: "text-gray-400",
  green: "text-green-600",
}

/**
 * Modern, consistent loading spinner component using Loader2 from lucide-react
 * 
 * @example
 * // Simple centered spinner
 * <LoadingSpinner />
 * 
 * @example
 * // Large primary spinner with text
 * <LoadingSpinner size="xl" text="Cargando..." />
 * 
 * @example
 * // Small white spinner for buttons
 * <LoadingSpinner size="sm" variant="white" />
 * 
 * @example
 * // Full page loading state
 * <div className="flex flex-col items-center justify-center min-h-screen">
 *   <LoadingSpinner size="2xl" variant="primary" text="Cargando datos..." />
 * </div>
 */
export function LoadingSpinner({
  size = "lg",
  variant = "primary",
  text,
  className,
  centered = false,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", centered && "mx-auto", className)}>
      <CircleSpinner 
        className={cn(
          sizeClasses[size],
          variantClasses[variant]
        )} 
      />
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
      <LoadingSpinner size="2xl" variant="primary" text={text} />
    </div>
  )
}

/**
 * Inline loading spinner for small spaces (e.g., loading text)
 * 
 * @example
 * {loading ? <InlineSpinner /> : "Cargar más"}
 */
export function InlineSpinner({ variant = "gray" }: { variant?: LoadingSpinnerProps["variant"] }) {
  return <LoadingSpinner size="sm" variant={variant} />
}
