# Pasos para Solucionar el Problema de WhatsApp

## ✅ Cambios Realizados

1. **Eliminado el endpoint `/api/og`** que estaba causando errores 500
2. **Actualizado todos los meta tags** para usar una imagen estática: `/og-image.png`
3. **Simplificada la implementación** para evitar problemas con Edge Runtime

## 🎨 Necesitas Crear la Imagen OG

Debes crear una imagen PNG con estas especificaciones:

### Especificaciones Técnicas:
- **Tamaño:** 1200 x 630 píxeles (exacto)
- **Formato:** PNG
- **Nombre:** `og-image.png`
- **Ubicación:** `public/og-image.png`

### Contenido Sugerido:
- Fondo verde (#4caf50) con gradiente
- Logo o icono de fútbol ⚽
- Texto "Falta Uno" en grande
- Subtítulo "Encuentra tu partido de fútbol"
- Opcional: URL "faltauno.app"

### Opciones para Crear la Imagen:

#### Opción 1: Canva (Recomendado - Fácil)
1. Ve a [Canva.com](https://www.canva.com)
2. Crea un diseño personalizado de 1200 x 630 px
3. Usa:
   - Fondo verde (#4caf50)
   - Texto "Falta Uno" en blanco, grande y en negrita
   - Emoji de balón ⚽
   - Subtítulo "Encuentra tu partido de fútbol"
4. Descarga como PNG
5. Renombra a `og-image.png`
6. Coloca en la carpeta `public/`

#### Opción 2: Figma
1. Crea un frame de 1200 x 630
2. Diseña con los colores de tu marca
3. Exporta como PNG
4. Guarda como `og-image.png` en `public/`

#### Opción 3: Photoshop/GIMP
1. Nuevo documento: 1200 x 630 px
2. Fondo verde con gradiente
3. Agrega texto y elementos
4. Exporta como PNG
5. Guarda en `public/`

#### Opción 4: Herramienta Online
- [OG Image Generator](https://og-image.vercel.app/)
- [Bannerbear](https://www.bannerbear.com/tools/open-graph-preview-tool/)

## 🚀 Después de Crear la Imagen:

1. **Coloca `og-image.png` en la carpeta `public/`**

2. **Haz commit y push:**
   ```bash
   git add public/og-image.png
   git commit -m "add: Open Graph image for social sharing"
   git push
   ```

3. **Deploy a producción**

4. **Limpia la caché de WhatsApp:**
   - Ve a [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Ingresa: `https://faltauno-frontend-169771742214.us-central1.run.app/home`
   - Click en "Scrape Again"

5. **Prueba en WhatsApp:**
   - Comparte el link
   - Deberías ver título, descripción e imagen

## 🐛 Sobre los Errores 500

Los errores que estás viendo:
- `GET /home 500` - Error del backend
- `GET /api/novedades?limit=5 500` - Error del backend

Estos son **problemas del backend**, no del frontend. Necesitas revisar:
1. Los logs del backend en Google Cloud Run
2. Que el backend esté corriendo correctamente
3. Que las variables de entorno estén configuradas

Los meta tags de Open Graph funcionarán correctamente una vez que:
1. Agregues la imagen `og-image.png`
2. El backend funcione sin errores (para que las páginas se rendericen correctamente)

## 📝 Verificar Meta Tags

Una vez que todo funcione, verifica los meta tags visitando:
```
view-source:https://faltauno-frontend-169771742214.us-central1.run.app/home
```

Deberías ver:
```html
<meta property="og:title" content="Falta Uno - Encuentra tu partido de fútbol" />
<meta property="og:description" content="Conecta con jugadores..." />
<meta property="og:image" content="https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png" />
```
