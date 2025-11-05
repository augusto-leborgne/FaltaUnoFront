// lib/branding.ts - Sistema de branding centralizado para Falta Uno

export const BRANDING = {
  // ============================================
  // IDENTIDAD DE MARCA
  // ============================================
  name: "Falta Uno",
  tagline: "Encuentra tu partido de fútbol",
  description: "Conecta con jugadores, organiza partidos y juega fútbol en tu ciudad. La plataforma que une a la comunidad futbolera.",
  
  // ============================================
  // COLORES DE MARCA
  // ============================================
  colors: {
    // Color primario - Verde fútbol
    primary: {
      DEFAULT: "#4caf50", // Verde principal
      light: "#81c784",    // Verde claro
      dark: "#388e3c",     // Verde oscuro
      foreground: "#ffffff", // Texto sobre verde
    },
    
    // Color secundario - Naranja energía
    secondary: {
      DEFAULT: "#f57c00", // Naranja principal
      light: "#ffb74d",   // Naranja claro
      dark: "#e65100",    // Naranja oscuro
      foreground: "#ffffff", // Texto sobre naranja
    },
    
    // Colores de estado
    success: "#4caf50",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    
    // Colores neutros
    background: {
      DEFAULT: "#fafafa",
      light: "#ffffff",
      dark: "#f3f4f6",
    },
    text: {
      primary: "#1f2937",
      secondary: "#6b7280",
      muted: "#9ca3af",
    },
    border: "#e5e7eb",
  },
  
  // ============================================
  // TIPOGRAFÍA
  // ============================================
  typography: {
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    fontSize: {
      xs: "0.75rem",    // 12px
      sm: "0.875rem",   // 14px
      base: "1rem",     // 16px
      lg: "1.125rem",   // 18px
      xl: "1.25rem",    // 20px
      "2xl": "1.5rem",  // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
  
  // ============================================
  // ASSETS (URLs públicas)
  // ============================================
  assets: {
    logo: "/logo.png",              // Logo principal
    icon192: "/icon-192.png",       // Icon PWA pequeño
    icon512: "/icon-512.png",       // Icon PWA grande
    ogImage: "/og-image.png",       // Open Graph image
    favicon: "/favicon.ico",        // Favicon
  },
  
  // ============================================
  // URLS
  // ============================================
  urls: {
    // Frontend
    frontend: process.env.NEXT_PUBLIC_FRONTEND_URL || "https://faltauno.vercel.app",
    
    // Backend
    backend: process.env.NEXT_PUBLIC_API_BASE || "https://faltauno-backend-pg4rwegknq-uc.a.run.app",
    
    // Redes sociales (placeholder - actualizar cuando estén disponibles)
    social: {
      instagram: "https://instagram.com/faltauno.uy",
      facebook: "https://facebook.com/faltauno.uy",
      twitter: "https://twitter.com/faltauno_uy",
      whatsapp: "https://wa.me/59899123456", // Actualizar con número real
    },
    
    // Enlaces legales
    legal: {
      terms: "/terms",
      privacy: "/privacy",
      help: "/help",
    },
  },
  
  // ============================================
  // METADATA PARA SEO Y SOCIAL SHARING
  // ============================================
  metadata: {
    title: "Falta Uno - Encuentra tu partido de fútbol",
    description: "Conecta con jugadores, organiza partidos y juega fútbol en tu ciudad. La plataforma que une a la comunidad futbolera.",
    keywords: "fútbol, partidos, jugadores, deporte, Uruguay, cancha, fútbol 5, fútbol 7, fútbol 11",
    author: "Falta Uno",
    locale: "es_UY",
    type: "website",
  },
  
  // ============================================
  // EMAIL TEMPLATES (estilos inline)
  // ============================================
  email: {
    styles: {
      container: "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;",
      header: "background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); padding: 32px 24px; text-align: center;",
      logo: "width: 80px; height: 80px; margin: 0 auto;",
      title: "color: #ffffff; font-size: 28px; font-weight: 700; margin: 16px 0 0 0;",
      tagline: "color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0 0 0;",
      body: "padding: 32px 24px;",
      text: "color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;",
      button: "display: inline-block; background-color: #4caf50; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0;",
      code: "background-color: #f3f4f6; color: #4caf50; padding: 16px 24px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; margin: 24px 0; border: 2px dashed #4caf50;",
      footer: "background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;",
      footerText: "color: #6b7280; font-size: 14px; margin: 8px 0;",
      footerLink: "color: #4caf50; text-decoration: none; font-weight: 500;",
      divider: "border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;",
    },
    
    // Plantilla base de email HTML
    getBaseTemplate: (content: string) => `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Falta Uno</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <table role="presentation" style="${BRANDING.email.styles.container}">
                <!-- Header -->
                <tr>
                  <td style="${BRANDING.email.styles.header}">
                    <img src="${BRANDING.urls.frontend}${BRANDING.assets.logo}" alt="Falta Uno" style="${BRANDING.email.styles.logo}" />
                    <h1 style="${BRANDING.email.styles.title}">${BRANDING.name}</h1>
                    <p style="${BRANDING.email.styles.tagline}">${BRANDING.tagline}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="${BRANDING.email.styles.body}">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="${BRANDING.email.styles.footer}">
                    <p style="${BRANDING.email.styles.footerText}">
                      © ${new Date().getFullYear()} ${BRANDING.name}. Todos los derechos reservados.
                    </p>
                    <p style="${BRANDING.email.styles.footerText}">
                      <a href="${BRANDING.urls.frontend}${BRANDING.urls.legal.help}" style="${BRANDING.email.styles.footerLink}">Centro de Ayuda</a> • 
                      <a href="${BRANDING.urls.frontend}${BRANDING.urls.legal.terms}" style="${BRANDING.email.styles.footerLink}">Términos</a> • 
                      <a href="${BRANDING.urls.frontend}${BRANDING.urls.legal.privacy}" style="${BRANDING.email.styles.footerLink}">Privacidad</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  },
  
  // ============================================
  // COMPONENTES DE UI (clases de Tailwind)
  // ============================================
  ui: {
    button: {
      primary: "bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors",
      secondary: "bg-secondary hover:bg-secondary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors",
      outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors",
      ghost: "text-primary hover:bg-primary/10 font-semibold py-3 px-6 rounded-lg transition-colors",
    },
    card: "bg-white rounded-xl shadow-sm border border-border p-6",
    input: "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
  },
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Genera metadata de Open Graph para una página específica
 */
export function generateOGMetadata(params: {
  title?: string
  description?: string
  image?: string
  url?: string
}) {
  return {
    title: params.title || BRANDING.metadata.title,
    description: params.description || BRANDING.metadata.description,
    url: params.url || BRANDING.urls.frontend,
    siteName: BRANDING.name,
    images: [
      {
        url: params.image || `${BRANDING.urls.frontend}${BRANDING.assets.ogImage}`,
        width: 1200,
        height: 630,
        alt: BRANDING.name,
      },
    ],
    locale: BRANDING.metadata.locale,
    type: BRANDING.metadata.type,
  }
}

/**
 * Genera plantilla de email para código de verificación
 */
export function generateVerificationEmailHTML(code: string, userName?: string) {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      ${userName ? `¡Hola ${userName}!` : '¡Hola!'}
    </h2>
    <p style="${BRANDING.email.styles.text}">
      Gracias por registrarte en <strong>Falta Uno</strong>. Para completar tu registro, 
      por favor verifica tu dirección de email usando el siguiente código:
    </p>
    <div style="${BRANDING.email.styles.code}">
      ${code}
    </div>
    <p style="${BRANDING.email.styles.text}">
      Este código es válido por <strong>10 minutos</strong>.
    </p>
    <p style="${BRANDING.email.styles.text}">
      Si no creaste esta cuenta, puedes ignorar este email de forma segura.
    </p>
  `
  
  return BRANDING.email.getBaseTemplate(content)
}

/**
 * Genera plantilla de email para notificación de partido
 */
export function generateMatchNotificationEmailHTML(params: {
  userName: string
  matchTitle: string
  matchDate: string
  matchTime: string
  matchLocation: string
  matchUrl: string
}) {
  const content = `
    <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      ¡Hola ${params.userName}!
    </h2>
    <p style="${BRANDING.email.styles.text}">
      Tienes un partido próximo:
    </p>
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h3 style="color: #4caf50; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">
        ${params.matchTitle}
      </h3>
      <p style="color: #1f2937; font-size: 16px; margin: 8px 0;">
        📅 ${params.matchDate} a las ${params.matchTime}
      </p>
      <p style="color: #1f2937; font-size: 16px; margin: 8px 0;">
        📍 ${params.matchLocation}
      </p>
    </div>
    <div style="text-align: center;">
      <a href="${params.matchUrl}" style="${BRANDING.email.styles.button}">
        Ver Detalles del Partido
      </a>
    </div>
    <p style="${BRANDING.email.styles.text}">
      ¡Nos vemos en la cancha! ⚽
    </p>
  `
  
  return BRANDING.email.getBaseTemplate(content)
}

/**
 * Obtiene la URL completa de un asset
 */
export function getAssetUrl(assetPath: string): string {
  return `${BRANDING.urls.frontend}${assetPath}`
}
