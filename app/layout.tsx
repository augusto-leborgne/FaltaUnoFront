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
import { BRANDING, generateOGMetadata } from "@/lib/branding"

// Force dynamic rendering for all pages to avoid lucide-react barrel export issues during static generation
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: BRANDING.metadata.title,
  description: BRANDING.metadata.description,
  generator: "v0.app",
  keywords: BRANDING.metadata.keywords,
  authors: [{ name: BRANDING.metadata.author }],
  
  // ⚡ Performance optimizations
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRANDING.name,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  
  // Open Graph metadata for social sharing
  openGraph: generateOGMetadata({}),
  
  // Twitter Card metadata
  twitter: {
    card: "summary",
    title: BRANDING.metadata.title,
    description: BRANDING.metadata.description,
    images: [`${BRANDING.urls.frontend}${BRANDING.assets.ogImage}`],
  },
  
  // Icons
  icons: {
    icon: [
      { url: BRANDING.assets.favicon },
      { url: BRANDING.assets.logo, type: "image/png" },
    ],
    apple: BRANDING.assets.icon192,
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
        <link rel="icon" href={BRANDING.assets.favicon} sizes="any" />
        <link rel="icon" href={BRANDING.assets.logo} type="image/png" />
        <link rel="apple-touch-icon" href={BRANDING.assets.icon192} />
        
        {/* ⚡ Preconnect to external domains for faster loading */}
        <link rel="preconnect" href={BRANDING.urls.backend} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={BRANDING.urls.backend} />
        <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Viewport and PWA meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content={BRANDING.colors.primary.DEFAULT} />
        
        {/* Additional SEO meta tags */}
        <meta name="author" content={BRANDING.metadata.author} />
        <meta name="keywords" content={BRANDING.metadata.keywords} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={BRANDING.urls.frontend} />
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