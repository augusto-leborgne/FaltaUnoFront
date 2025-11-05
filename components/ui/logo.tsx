// components/ui/logo.tsx - Componente de Logo reutilizable con branding consistente

"use client"

import Image from "next/image"
import Link from "next/link"
import { BRANDING } from "@/lib/branding"
import { cn } from "@/lib/utils"

interface LogoProps {
  /** Tamaño del logo */
  size?: "sm" | "md" | "lg" | "xl"
  /** Si es verdadero, muestra el texto "Falta Uno" al lado del logo */
  withText?: boolean
  /** Si es verdadero, el logo es clickeable y redirige al home */
  clickable?: boolean
  /** Clases adicionales de Tailwind */
  className?: string
  /** Clases para el contenedor del texto */
  textClassName?: string
  /** Variante de color del texto */
  textVariant?: "primary" | "secondary" | "white" | "dark"
}

const sizeMap = {
  sm: { img: 32, text: "text-lg" },
  md: { img: 48, text: "text-xl" },
  lg: { img: 64, text: "text-2xl" },
  xl: { img: 80, text: "text-3xl" },
}

const textColorMap = {
  primary: "text-primary",
  secondary: "text-secondary",
  white: "text-white",
  dark: "text-gray-900",
}

export function Logo({
  size = "md",
  withText = false,
  clickable = true,
  className = "",
  textClassName = "",
  textVariant = "dark",
}: LogoProps) {
  const { img: imgSize, text: textSize } = sizeMap[size]
  const textColor = textColorMap[textVariant]

  const logoContent = (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Image */}
      <div className="relative" style={{ width: imgSize, height: imgSize }}>
        <Image
          src={BRANDING.assets.logo}
          alt={BRANDING.name}
          width={imgSize}
          height={imgSize}
          className="object-contain"
          priority
        />
      </div>

      {/* Logo Text */}
      {withText && (
        <div className={cn("font-bold", textSize, textColor, textClassName)}>
          {BRANDING.name}
        </div>
      )}
    </div>
  )

  // Si es clickeable, envolver en Link
  if (clickable) {
    return (
      <Link
        href="/"
        className="flex items-center transition-opacity hover:opacity-80"
        aria-label={`Ir a ${BRANDING.name}`}
      >
        {logoContent}
      </Link>
    )
  }

  // Si no es clickeable, solo devolver el contenido
  return logoContent
}

/**
 * Variante de Logo para header/navbar
 */
export function LogoHeader() {
  return <Logo size="md" withText clickable textVariant="dark" />
}

/**
 * Variante de Logo para páginas de autenticación
 */
export function LogoAuth() {
  return (
    <div className="text-center mb-8">
      <Logo size="xl" withText clickable={false} className="justify-center" textVariant="primary" />
      <p className="text-gray-600 text-sm mt-2">{BRANDING.tagline}</p>
    </div>
  )
}

/**
 * Variante de Logo para emails (solo imagen)
 */
export function LogoEmail({ size = 80 }: { size?: number }) {
  return (
    <img
      src={`${BRANDING.urls.frontend}${BRANDING.assets.logo}`}
      alt={BRANDING.name}
      width={size}
      height={size}
      style={{ width: size, height: size, margin: "0 auto" }}
    />
  )
}

/**
 * Variante de Logo para footer
 */
export function LogoFooter() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Logo size="sm" withText clickable textVariant="dark" />
      <p className="text-gray-600 text-xs text-center max-w-xs">
        {BRANDING.description}
      </p>
    </div>
  )
}
