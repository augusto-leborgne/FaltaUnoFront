# 🗺️ Configuración de Google Maps API

## Problema
El autocomplete de Google Maps no funciona porque falta la configuración de la API key.

## Solución Rápida

### 1. Crear archivo `.env.local`
```bash
# En la raíz del proyecto Frontend
cp .env.example .env.local
```

### 2. Obtener API Key de Google Maps

#### Opción A: Usar la Google Cloud Console Web
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona o crea un proyecto
3. Ve a **APIs & Services → Credentials**
4. Clic en **+ CREATE CREDENTIALS → API key**
5. Copia la API key generada

#### Opción B: Usar gcloud CLI
```bash
# Crear API key
gcloud alpha services api-keys create "FaltaUno-Maps-Key" \
  --display-name="FaltaUno Maps API Key" \
  --project=YOUR_PROJECT_ID

# Listar API keys
gcloud alpha services api-keys list --project=YOUR_PROJECT_ID
```

### 3. Habilitar APIs Necesarias

Debes habilitar estas APIs en tu proyecto de Google Cloud:
- ✅ **Maps JavaScript API**
- ✅ **Places API**
- ✅ **Geocoding API** (opcional, pero recomendado)

#### Habilitar vía Web Console
1. Ve a [API Library](https://console.cloud.google.com/apis/library)
2. Busca "Maps JavaScript API" → Habilitar
3. Busca "Places API" → Habilitar
4. Busca "Geocoding API" → Habilitar

#### Habilitar vía gcloud CLI
```bash
# Habilitar APIs
gcloud services enable \
  maps-backend.googleapis.com \
  places-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### 4. Configurar Restricciones de la API Key (SEGURIDAD)

Es **MUY IMPORTANTE** restringir tu API key para evitar uso no autorizado.

#### Restricciones de HTTP Referrer (Frontend)
1. En Google Cloud Console → Credentials
2. Clic en tu API key
3. En **Application restrictions**:
   - Selecciona "HTTP referrers (web sites)"
   - Agrega:
     ```
     http://localhost:3000/*
     http://localhost:3001/*
     https://tu-dominio-produccion.com/*
     https://*.vercel.app/*
     ```

#### Restricciones de API
En **API restrictions**:
- Selecciona "Restrict key"
- Selecciona solo:
  - Maps JavaScript API
  - Places API
  - Geocoding API

### 5. Configurar `.env.local`

Edita el archivo `.env.local` y agrega:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://faltauno-backend-pg4rwegknq-uc.a.run.app

# Google Maps API Key (IMPORTANTE: Reemplaza con tu API key real)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Build ID
BUILD_ID=local-dev
```

### 6. Reiniciar el servidor de desarrollo

```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
npm run dev
# o
pnpm dev
```

## Verificación

### 1. Abrir DevTools Console
Presiona `F12` en el navegador

### 2. Buscar errores
Si ves errores como:
- ❌ `RefererNotAllowedMapError` → Agrega tu URL a las restricciones de HTTP Referrer
- ❌ `ApiNotActivatedMapError` → Habilita la API correspondiente
- ❌ `InvalidKeyMapError` → Verifica que la API key sea correcta

### 3. Probar el autocomplete
1. Ve a la página de crear partido
2. En el campo "Ubicación", empieza a escribir una dirección
3. Deberías ver sugerencias aparecer

## Troubleshooting

### El autocomplete no muestra nada

**Problema**: API key no configurada
```bash
# Verificar si existe el archivo
ls .env.local

# Ver contenido (sin mostrar la key completa)
cat .env.local | grep GOOGLE_MAPS
```

**Solución**: Asegúrate de que `.env.local` existe y tiene `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

### Error: "RefererNotAllowedMapError"

**Problema**: Tu dominio no está autorizado

**Solución**: 
1. Google Cloud Console → Credentials
2. Edita tu API key
3. En HTTP referrers, agrega:
   - `http://localhost:3000/*`
   - Tu dominio de producción

---

### Error: "ApiNotActivatedMapError"

**Problema**: Places API no habilitada

**Solución**:
```bash
gcloud services enable places-backend.googleapis.com --project=YOUR_PROJECT_ID
```

O habilítala manualmente en [API Library](https://console.cloud.google.com/apis/library)

---

### Sugerencias solo en inglés

**Problema**: Configuración de idioma

**Solución**: Ya está configurado en español (`language=es`, `region=UY`) en el código. Si ves resultados en inglés, es porque Google Maps a veces retorna nombres originales de lugares.

---

## Costos

- **Google Maps Platform** tiene un tier gratuito de **$200 USD/mes** de créditos
- **Autocomplete**: ~$2.83 USD por cada 1,000 requests
- **Places Details**: ~$17 USD por cada 1,000 requests

Con el tier gratuito, puedes hacer aproximadamente:
- ~70,000 autocomplete requests/mes
- ~11,000 places details requests/mes

**Recomendación**: Implementa session tokens (ya está implementado en el código) para optimizar costos.

## Producción

Para deployment en Vercel/Cloud Run:

### Vercel
```bash
# Configurar secret
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
# Pega tu API key cuando se solicite
```

### Google Cloud Run
```bash
# Actualizar cloudbuild.yaml para incluir la API key
# O configurarla como secret en Google Secret Manager
```

## Referencias

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [API Key Best Practices](https://developers.google.com/maps/api-key-best-practices)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)

---

## ✅ Checklist de Configuración

- [ ] Crear/obtener API key de Google Maps
- [ ] Habilitar Maps JavaScript API
- [ ] Habilitar Places API
- [ ] Configurar restricciones HTTP Referrer
- [ ] Configurar restricciones de API
- [ ] Crear archivo `.env.local`
- [ ] Agregar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Reiniciar servidor de desarrollo
- [ ] Probar autocomplete en navegador
- [ ] Verificar console sin errores

---

**Última actualización**: ${new Date().toISOString().split('T')[0]}
