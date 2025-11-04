import type React from "react"
import type { Metadata } from "next"
// TEMPORARY: Comment out Geist fonts to test if they're causing SSR issues
// import { GeistSans } from "geist/font/sans"
// import { GeistMono } from "geist/font/mono"
import "./globals.css"
import "react-phone-number-input/style.css"
import "react-image-crop/dist/ReactCrop.css"
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
    'mobile-web-app-capable': 'yes',
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
        url: "https://faltauno-frontend-169771742214.us-central1.run.app/logo.png",
        width: 512,
        height: 512,
        alt: "Falta Uno - Logo",
      },
    ],
  },
  // Twitter Card metadata
  twitter: {
    card: "summary",
    title: "Falta Uno - Encuentra tu partido de fútbol",
    description: "Conecta con jugadores, organiza partidos y juega fútbol en tu ciudad.",
    images: ["https://faltauno-frontend-169771742214.us-central1.run.app/logo.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="antialiased">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        
        {/* ⚡ Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://faltauno-backend-169771742214.us-central1.run.app" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://faltauno-backend-169771742214.us-central1.run.app" />
        <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Viewport and PWA meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#4caf50" />
        
        {/* Additional SEO meta tags */}
        <meta name="author" content="Falta Uno" />
        <meta name="keywords" content="fútbol, partidos, jugadores, deporte, Uruguay, cancha, fútbol 5, fútbol 7, fútbol 11" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://faltauno-frontend-169771742214.us-central1.run.app" />
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