# 🎨 Sistema de Branding - Falta Uno

Guía completa del sistema de branding unificado de Falta Uno.

## 📋 Índice

1. [Colores](#colores)
2. [Tipografía](#tipografía)
3. [Logos y Assets](#logos-y-assets)
4. [Componentes](#componentes)
5. [Emails](#emails)
6. [Open Graph / Social Sharing](#open-graph--social-sharing)
7. [Uso](#uso)

---

## 🎨 Colores

### Color Primario - Verde Fútbol
```css
--primary: #4caf50       /* Verde principal */
--primary-light: #81c784 /* Verde claro */
--primary-dark: #388e3c  /* Verde oscuro */
```

### Color Secundario - Naranja Energía
```css
--secondary: #f57c00      /* Naranja principal */
--secondary-light: #ffb74d /* Naranja claro */
--secondary-dark: #e65100 /* Naranja oscuro */
```

### Colores de Estado
- **Success**: `#4caf50` (verde)
- **Warning**: `#f59e0b` (ámbar)
- **Error**: `#ef4444` (rojo)
- **Info**: `#3b82f6` (azul)

### Colores Neutros
- **Background**: `#fafafa` (gris muy claro)
- **Text Primary**: `#1f2937` (gris oscuro)
- **Text Secondary**: `#6b7280` (gris medio)
- **Border**: `#e5e7eb` (gris claro)

---

## ✏️ Tipografía

### Font Family
- **Sans**: System fonts (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, etc.)
- **Mono**: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas

### Font Sizes
- **xs**: 12px
- **sm**: 14px
- **base**: 16px
- **lg**: 18px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 30px
- **4xl**: 36px

### Font Weights
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

---

## 🖼️ Logos y Assets

### Archivos
- `public/logo.png` - Logo principal (512x512)
- `public/icon-192.png` - Icon PWA pequeño
- `public/icon-512.png` - Icon PWA grande
- `public/og-image.png` - Open Graph image (1200x630)
- `public/favicon.ico` - Favicon

### Uso en Código

```typescript
import { BRANDING } from "@/lib/branding"

// Acceder a assets
const logoUrl = BRANDING.assets.logo  // "/logo.png"
const ogImage = BRANDING.assets.ogImage // "/og-image.png"

// URL completa
import { getAssetUrl } from "@/lib/branding"
const fullUrl = getAssetUrl(BRANDING.assets.logo)
// "https://faltauno-frontend.../logo.png"
```

---

## 🧩 Componentes

### Logo Component

```typescript
import { Logo, LogoHeader, LogoAuth, LogoFooter } from "@/components/ui/logo"

// Logo básico
<Logo size="md" withText clickable />

// Logo para header/navbar
<LogoHeader />

// Logo para páginas de autenticación
<LogoAuth />

// Logo para footer
<LogoFooter />
```

**Props disponibles:**
- `size`: "sm" | "md" | "lg" | "xl"
- `withText`: boolean - Mostrar texto "Falta Uno"
- `clickable`: boolean - Si es clickeable (link a home)
- `textVariant`: "primary" | "secondary" | "white" | "dark"
- `className`: string - Clases adicionales

---

## 📧 Emails

### Template Base

Los emails usan una plantilla HTML consistente con header, contenido y footer.

```typescript
import { BRANDING } from "@/lib/branding"

const emailHtml = BRANDING.email.getBaseTemplate(content)
```

### Templates Pre-construidos

#### Email de Verificación

```typescript
import { generateVerificationEmailHTML } from "@/lib/branding"

const html = generateVerificationEmailHTML("123456", "Juan Pérez")
```

#### Email de Notificación de Partido

```typescript
import { generateMatchNotificationEmailHTML } from "@/lib/branding"

const html = generateMatchNotificationEmailHTML({
  userName: "Juan Pérez",
  matchTitle: "Fútbol 5 - Malvín",
  matchDate: "15 Nov 2025",
  matchTime: "19:00",
  matchLocation: "Cancha La Bombonera",
  matchUrl: "https://faltauno.../matches/123",
})
```

### Estilos Inline

Los estilos están disponibles en `BRANDING.email.styles`:

```typescript
const styles = BRANDING.email.styles

// Uso en template
`<h2 style="${styles.title}">Título</h2>`
`<p style="${styles.text}">Texto</p>`
`<a href="#" style="${styles.button}">Botón</a>`
```

**Estilos disponibles:**
- `container` - Contenedor principal
- `header` - Header con gradiente verde
- `logo` - Logo en email
- `title` - Título principal
- `text` - Texto de párrafo
- `button` - Botón de acción
- `code` - Código de verificación
- `footer` - Footer del email
- `footerText` - Texto del footer
- `footerLink` - Links del footer

---

## 🌐 Open Graph / Social Sharing

### Metadata Automática

El sistema genera automáticamente metadata de Open Graph:

```typescript
import { generateOGMetadata } from "@/lib/branding"

// Metadata por defecto
export const metadata: Metadata = {
  openGraph: generateOGMetadata({}),
}

// Metadata personalizada
export const metadata: Metadata = {
  openGraph: generateOGMetadata({
    title: "Partido en Malvín - Falta Uno",
    description: "Únete a este partido de fútbol 5",
    image: "/matches/123/og-image.png",
    url: "/matches/123",
  }),
}
```

### Preview Cards

Cuando se comparte un link en redes sociales, se muestra:
- **Imagen**: 1200x630px (og-image.png)
- **Título**: "Falta Uno - Encuentra tu partido de fútbol"
- **Descripción**: Tagline y descripción de la app
- **Logo**: Icon 512x512px

---

## 🚀 Uso

### 1. Importar Sistema de Branding

```typescript
import { BRANDING } from "@/lib/branding"
```

### 2. Acceder a Valores

```typescript
// Colores
const primaryColor = BRANDING.colors.primary.DEFAULT // "#4caf50"
const bgColor = BRANDING.colors.background.DEFAULT // "#fafafa"

// URLs
const frontendUrl = BRANDING.urls.frontend
const backendUrl = BRANDING.urls.backend

// Metadata
const appName = BRANDING.name // "Falta Uno"
const tagline = BRANDING.tagline // "Encuentra tu partido de fútbol"
const description = BRANDING.description

// Assets
const logoPath = BRANDING.assets.logo // "/logo.png"
```

### 3. Usar Componentes

```typescript
import { Logo } from "@/components/ui/logo"

<Logo size="md" withText clickable textVariant="primary" />
```

### 4. Generar Emails

```typescript
import { generateVerificationEmailHTML } from "@/lib/branding"

const emailHtml = generateVerificationEmailHTML("123456", "Juan")
// Enviar email con este HTML
```

### 5. Metadata de Páginas

```typescript
import { generateOGMetadata } from "@/lib/branding"

export const metadata: Metadata = {
  title: "Mi Página - Falta Uno",
  openGraph: generateOGMetadata({
    title: "Mi Página - Falta Uno",
    description: "Descripción personalizada",
  }),
}
```

---

## 📝 Notas Importantes

1. **Centralización**: Todo el branding está centralizado en `lib/branding.ts`. No hardcodear valores en componentes.

2. **Consistencia**: Usar siempre los componentes de Logo (`<Logo />`) en lugar de `<Image />` directo.

3. **Emails**: Para emails del backend Java, copiar los estilos inline de `BRANDING.email.styles` a las plantillas HTML.

4. **Assets**: Todos los assets públicos están en `public/`. Usar rutas relativas o `getAssetUrl()` para URLs completas.

5. **Colores**: Los colores están sincronizados con Tailwind CSS. Usar clases como `bg-primary`, `text-primary`, etc.

6. **Tipografía**: Se usan system fonts para performance. No hay Google Fonts ni Geist fonts.

---

## 🔄 Actualización

Para actualizar el branding:

1. Modificar valores en `lib/branding.ts`
2. Actualizar assets en `public/` si es necesario
3. Los cambios se reflejan automáticamente en toda la app

---

## 📚 Referencias

- **Branding System**: `lib/branding.ts`
- **Logo Component**: `components/ui/logo.tsx`
- **Layout Global**: `app/layout.tsx`
- **CSS Global**: `app/globals.css`
- **Manifest PWA**: `public/manifest.json`

---

## ✅ Checklist de Implementación

- [x] Sistema de colores centralizado
- [x] Componente Logo reutilizable
- [x] Templates de email HTML
- [x] Metadata de Open Graph
- [x] Assets organizados
- [x] Tipografía system fonts
- [x] URLs centralizadas
- [ ] Backend: Actualizar templates de email (pendiente)
- [ ] Redes sociales: Actualizar URLs (pendiente)
- [ ] Analytics: Configurar tracking (pendiente)

---

**Última actualización**: Noviembre 2025
**Versión**: 1.0.0
