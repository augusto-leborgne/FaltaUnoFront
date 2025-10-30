# 🔧 FRONTEND - PROBLEMAS ENCONTRADOS Y CORRECCIONES

## ❌ PROBLEMA CRÍTICO: URLs Relativas en Fetch Calls

**Archivos afectados:**
1. `components/pages/user/friends-screen.tsx` - línea 42: `fetch("/api/amistades")`
2. `components/pages/user/friend-request-screen.tsx` - líneas 36, 73
3. `components/pages/user/user-profile-screen.tsx` - línea 123
4. `components/pages/reviews-screen.tsx` - línea 38
5. `components/pages/home-screen.tsx` - líneas 112, 134, 147
6. `components/pages/search-screen.tsx` - líneas 119, 142, 180 (usa process.env directamente)

**Por qué es un problema:**
- URLs relativas (`/api/...`) funcionan en localhost pero **FALLAN en producción**
- Frontend: `https://faltauno-frontend-*.run.app`
- Backend: `https://faltauno-backend-pg4rwegknq-uc.a.run.app`
- La URL relativa `/api/amistades` se convierte en `https://faltauno-frontend-*.run.app/api/amistades` ❌
- Debería ser: `https://faltauno-backend-pg4rwegknq-uc.a.run.app/api/amistades` ✅

**Solución:**
- Usar `API_BASE` importado de `lib/api.ts`
- O mejor aún: usar las funciones ya creadas en `lib/api.ts` (PartidoAPI, UsuarioAPI, etc.)

## ✅ CORRECCIONES NECESARIAS

### 1. search-screen.tsx
```typescript
// ❌ ANTES
const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/usuarios?${queryParams}`, ...)

// ✅ DESPUÉS
import { API_BASE } from '@/lib/api'
const usersResponse = await fetch(`${API_BASE}/api/usuarios?${queryParams}`, ...)
```

### 2. friends-screen.tsx, friend-request-screen.tsx, etc.
```typescript
// ❌ ANTES
const response = await fetch("/api/amistades", ...)

// ✅ DESPUÉS
import { API_BASE } from '@/lib/api'
const response = await fetch(`${API_BASE}/api/amistades`, ...)
```

## 📊 RESUMEN DE CAMBIOS

| Archivo | Líneas | Cambio Necesario |
|---------|--------|------------------|
| search-screen.tsx | 119, 142, 180 | Usar `API_BASE` |
| friends-screen.tsx | 42 | Usar `API_BASE` |
| friend-request-screen.tsx | 36, 73 | Usar `API_BASE` |
| user-profile-screen.tsx | 123 | Usar `API_BASE` |
| reviews-screen.tsx | 38 | Usar `API_BASE` |
| home-screen.tsx | 112, 134, 147 | Usar `API_BASE` |

## ✅ YA CORRECTOS
- `lib/api.ts` - ✅ Usa `API_BASE` consistentemente
- `lib/auth.ts` - ✅ Usa `API_BASE` 
- `components/pages/login/*` - ✅ Usa UsuarioAPI
- `components/pages/match/*` - ✅ Usa PartidoAPI, InscripcionAPI
