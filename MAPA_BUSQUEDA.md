# 🗺️ Vista de Mapa en Búsqueda - Guía de Uso

## ✅ Funcionalidades implementadas

### 📍 **Vista de Mapa Interactiva**
- **Mapa de Google Maps** con todos los partidos encontrados
- **Marcadores con información**:
  - Verde: Partidos con lugares disponibles
  - Rojo: Partidos llenos
  - Azul: Tu ubicación actual
- **Números en marcadores**: Indican lugares disponibles

### 🎯 **Geolocalización**
- **Solicita ubicación del usuario** al cargar el mapa
- **Marcador azul** muestra tu posición actual
- **Botón de centrar**: Vuelve a centrar el mapa en tu ubicación
- **Fallback a Montevideo** si no hay geolocalización

### 📋 **Información de Partidos**
Al hacer click en un marcador, se muestra:
- Tipo de partido (Fútbol 5/7/11)
- Género (Masculino/Femenino/Mixto)
- Fecha y hora
- Ubicación exacta
- Jugadores inscritos / Capacidad total
- Distancia aproximada
- Botón "Ver detalles" para ir al partido

### 🎨 **Interfaz**
- **Header fijo** con título y contador de partidos
- **Leyenda** explicando los colores de los marcadores
- **Card flotante** con información del partido seleccionado
- **Botón cerrar** (X) para volver a la vista de lista
- **Auto-ajuste de zoom** para mostrar todos los partidos

### 🔍 **Integración con Búsqueda**
- **Botón "Mapa"** aparece cuando hay partidos en resultados
- **Respeta filtros aplicados**: Solo muestra partidos filtrados
- **Vista de lista ↔ Vista de mapa**: Cambio fluido entre vistas
- **Mantiene búsqueda**: Al volver del mapa, conserva resultados

---

## 🚀 Cómo usar

### Desde la pantalla de búsqueda:

1. **Buscar partidos**:
   ```
   - Escribe en el buscador (ej: "fútbol 5")
   - Aplica filtros si deseas (género, nivel, tipo)
   - Espera los resultados (búsqueda en tiempo real)
   ```

2. **Cambiar a vista de mapa**:
   ```
   - Aparecerá un botón "Mapa" en el header
   - Click en "Mapa" para ver resultados en el mapa
   ```

3. **Navegar el mapa**:
   ```
   - Arrastra para moverte
   - Pinch/zoom para acercar
   - Click en marcadores para ver info
   - Click en botón de brújula para centrar en tu ubicación
   ```

4. **Ver detalles de un partido**:
   ```
   - Click en un marcador verde/rojo
   - Se abre card con información
   - Click en "Ver detalles" para ir al partido
   - O click en X para cerrar la card
   ```

5. **Volver a lista**:
   ```
   - Click en X en el header
   - Vuelves a la vista de lista con los mismos resultados
   ```

---

## 🔧 Configuración requerida

### Google Maps API Key

El proyecto ya usa Google Maps. Asegúrate de tener configurada la API key en `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu-api-key-aqui
```

### Permisos del navegador

Para usar geolocalización, el usuario debe:
1. Permitir acceso a ubicación cuando el navegador lo solicite
2. Si no permite, se usa ubicación por defecto (Montevideo)

---

## 📊 Datos del Backend

El mapa espera que los partidos incluyan:

```typescript
{
  id: string
  latitud: number    // Coordenada de latitud
  longitud: number   // Coordenada de longitud
  tipo_partido: string
  genero: string
  fecha: string
  hora: string
  nombre_ubicacion: string
  inscritos: number
  capacidad: number
}
```

**Importante**: Solo se muestran en el mapa los partidos que tengan `latitud` y `longitud` definidas.

---

## 🎯 Mejoras futuras posibles

1. **Clustering de marcadores**: Agrupar partidos cercanos
2. **Rutas**: Mostrar ruta desde tu ubicación al partido
3. **Filtro por radio**: "Mostrar solo partidos a menos de 5km"
4. **Mapa de calor**: Zonas con más partidos
5. **Street View**: Vista previa del lugar
6. **Compartir ubicación**: Enviar link con ubicación del partido
7. **Modo offline**: Caché de mapas para uso sin conexión

---

## 🐛 Troubleshooting

### El mapa no carga
- ✅ Verifica que la API key de Google Maps esté configurada
- ✅ Revisa la consola del navegador por errores
- ✅ Verifica que la API key tenga habilitado "Maps JavaScript API"

### No aparece mi ubicación
- ✅ Permite el acceso a ubicación en el navegador
- ✅ Verifica que estés usando HTTPS (geolocalización requiere conexión segura)
- ✅ Si falla, se usa ubicación por defecto (Montevideo)

### Los partidos no aparecen en el mapa
- ✅ Verifica que los partidos tengan `latitud` y `longitud` en la respuesta del backend
- ✅ Revisa la consola para ver los datos que llegan
- ✅ Confirma que las coordenadas sean válidas (no null/undefined)

### El botón "Mapa" no aparece
- ✅ Debe haber al menos un partido en los resultados de búsqueda
- ✅ Si solo hay usuarios, el botón no aparece (es solo para partidos)

---

## 📱 Responsive

La vista de mapa funciona en:
- ✅ Desktop (pantallas grandes)
- ✅ Tablet (pantallas medianas)
- ✅ Mobile (pantallas pequeñas)

**Optimizaciones móviles**:
- Touch gestures nativos (zoom, pan)
- Card flotante adaptable
- Botones con tamaño táctil adecuado
- Header fijo para mejor navegación

---

## 🎨 Personalización

### Cambiar colores de marcadores:

Edita `search-map-view.tsx`:

```typescript
// Marcador de partido disponible
fillColor: "#16a34a"  // Verde

// Marcador de partido lleno
fillColor: "#ef4444"  // Rojo

// Marcador de usuario
fillColor: "#3b82f6"  // Azul
```

### Cambiar zoom inicial:

```typescript
zoom: 13,  // Cambiar a 12, 14, 15, etc.
```

### Ocultar controles del mapa:

```typescript
disableDefaultUI: true,   // Oculta todos
zoomControl: false,       // Oculta zoom
mapTypeControl: false,    // Oculta tipo de mapa
```

---

## 💡 Tips de uso

1. **Zoom óptimo**: El mapa ajusta automáticamente el zoom para mostrar todos los partidos
2. **Ubicación precisa**: Permite geolocalización para mejores resultados de distancia
3. **Filtros primero**: Aplica filtros antes de ver el mapa para resultados más relevantes
4. **Vista híbrida**: Alterna entre lista y mapa según necesites

---

¡Disfruta la nueva vista de mapa! 🗺️⚽
