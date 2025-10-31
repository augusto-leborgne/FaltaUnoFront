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
  title: "Falta Uno",
  description: "Encuentra tu partido de fútbol",
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
        <link rel="preconnect" href="https://faltauno-backend-169771742214.us-central1.run.app" />
        <link rel="dns-prefetch" href="https://faltauno-backend-169771742214.us-central1.run.app" />
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