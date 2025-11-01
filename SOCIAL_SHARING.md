# Social Sharing - Open Graph & Twitter Cards

## ✅ Implementación Completada

Se han agregado meta tags de Open Graph y Twitter Cards para mejorar cómo se ven los links cuando se comparten en redes sociales como WhatsApp, Facebook, Twitter, etc.

## 🎯 Características

### 1. **Metadata Global** (todas las páginas)
- Título: "Falta Uno - Encuentra tu partido de fútbol"
- Descripción optimizada para redes sociales
- Imagen OG generada dinámicamente
- Twitter Card: `summary_large_image`

### 2. **Metadata Dinámica para Partidos** (`/matches/[id]`)
- Título personalizado con el nombre del partido
- Descripción con ubicación
- Imagen OG con nombre del partido
- URL canónica específica

### 3. **Metadata Dinámica para Jugadores** (`/players/[id]`)
- Título con nombre del jugador
- Descripción del perfil
- Imagen OG personalizada
- Tipo de OG: `profile`

### 4. **Generador de Imágenes OG** (`/api/og`)
Endpoint que genera imágenes dinámicas de 1200x630px con:
- Título personalizado
- Descripción personalizada
- Diseño con colores de la marca (#4caf50)
- Icono de fútbol ⚽

## 🧪 Cómo Probar

### 1. **Probar localmente**
```bash
# Iniciar el servidor de desarrollo
npm run dev

# Visitar las URLs de prueba:
# http://localhost:3000
# http://localhost:3000/matches/[id-de-partido]
# http://localhost:3000/players/[id-de-jugador]
```

### 2. **Validar Meta Tags**

#### Usando herramientas online:
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
- **WhatsApp Link Preview**: Compartir link directamente en WhatsApp

#### Usando extensiones de navegador:
- "OpenGraph Preview" (Chrome/Firefox)
- "Meta SEO Inspector" (Chrome)

### 3. **Probar en WhatsApp**

1. Despliega la aplicación en producción
2. Copia la URL de un partido o perfil
3. Pégala en WhatsApp
4. Deberías ver:
   - ✅ Título del partido/jugador
   - ✅ Descripción
   - ✅ Imagen de preview
   - ✅ Nombre del sitio "Falta Uno"

### 4. **Ver la imagen OG generada**

Visita directamente:
```
https://tu-dominio.com/api/og?title=Mi%20Partido&description=Únete%20ahora
```

## 🔍 Verificar en el HTML

Inspecciona el código fuente de cualquier página y busca estas etiquetas:

```html
<!-- Open Graph -->
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:url" content="..." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Falta Uno" />
<meta property="og:locale" content="es_UY" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="..." />
```

## 🚀 Deploy

Después de hacer deploy, recuerda:

1. **Limpiar caché de redes sociales:**
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: Simplemente vuelve a compartir el link

2. **Verificar que NEXT_PUBLIC_API_URL esté configurado**
   - Para que las páginas dinámicas puedan obtener datos

3. **Asegurar que el endpoint `/api/og` funcione**
   - Probar: `https://tu-dominio.com/api/og?title=Test`

## 📝 Notas Técnicas

- **Runtime**: El endpoint `/api/og` usa Edge Runtime para mejor performance
- **Caché**: Metadata se genera en cada request (no-store) para datos dinámicos
- **Fallback**: Si no se pueden obtener datos, se usan valores por defecto
- **Imágenes**: 1200x630px (tamaño recomendado por Facebook/Twitter)
- **Encoding**: URLs se encodean automáticamente con `encodeURIComponent`

## 🐛 Troubleshooting

### El preview no aparece en WhatsApp:
1. Verifica que la URL sea pública (no localhost)
2. Espera unos minutos (WhatsApp cachea previews)
3. Limpia el caché usando Facebook Debugger
4. Verifica que los meta tags estén presentes en el HTML

### La imagen no se muestra:
1. Verifica que `/api/og` responda correctamente
2. Asegúrate que sea HTTPS (requerido por WhatsApp)
3. Revisa que la imagen sea 1200x630px
4. Verifica que no haya errores en la consola del servidor

### Metadata incorrecta:
1. Verifica que NEXT_PUBLIC_API_URL esté configurado
2. Revisa logs del servidor para errores de fetch
3. Asegúrate que el API responda correctamente
4. Verifica que los parámetros de URL estén bien encodeados
