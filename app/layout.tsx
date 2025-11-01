import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ErrorBoundary } from "@/components/error-boundary"

// Force dynamic rendering for all pages to avoid lucide-react barrel export issues during static generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: "Falta Uno - Encuentra tu partido de fútbol",
  description: "Conecta con jugadores, organiza partidos y juega fútbol en tu ciudad. La plataforma que une a la comunidad futbolera.",
  generator: "v0.app",
  // ⚡ Performance optimizations
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Falta Uno",
  },
  other: {
    'mobile-web-app-capable': 'yes', // ✅ Reemplazo del deprecado apple-mobile-web-app-capable
  },
  formatDetection: {
    telephone: false,
  },
  // Open Graph metadata for social sharing
  openGraph: {
    type: "website",
    locale: "es_UY",
    url: "https://faltauno-frontend-169771742214.us-central1.run.app",
    siteName: "Falta Uno",
    title: "Falta Uno - Encuentra tu partido de fútbol",
    description: "Conecta con jugadores, organiza partidos y juega fútbol en tu ciudad. La plataforma que une a la comunidad futbolera.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Falta Uno - Encuentra tu partido de fútbol",
      },
    ],
  },
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "Falta Uno - Encuentra tu partido de fútbol",
    description: "Conecta con jugadores, organiza partidos y juega fútbol en tu ciudad.",
    images: ["/images/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <head>
        {/* ⚡ Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://faltauno-backend-pg4rwegknq-uc.a.run.app" />
        <link rel="dns-prefetch" href="https://faltauno-backend-pg4rwegknq-uc.a.run.app" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        
        {/* Viewport and PWA meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#4caf50" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}