# 🚀 CONFIGURACIÓN DE DEPLOYMENT AUTOMÁTICO - FRONTEND

## ⚠️ PROBLEMA IDENTIFICADO

El workflow de GitHub Actions **NO se está ejecutando** porque:

1. ❌ El path trigger estaba mal configurado (`Front/FaltaUnoFront/**` pero el repo es la raíz)
2. ❌ El puerto estaba configurado en 3000 en lugar de 8080 (como lo requiere Dockerfile.prod)
3. ⚠️ Posiblemente falta configurar el secret `GCP_SA_KEY`

## ✅ CORRECCIONES APLICADAS

### 1. Workflow actualizado (.github/workflows/deploy-frontend.yml)

**Cambios realizados:**
- ✅ Eliminado `paths: - 'Front/FaltaUnoFront/**'` (el repo ES FaltaUnoFront)
- ✅ Eliminado `cd Front/FaltaUnoFront` (ya estamos en la raíz)
- ✅ Cambiado puerto de 3000 → 8080 (match con Dockerfile.prod)

**Workflow actualizado:**
```yaml
on:
  push:
    branches:
      - main  # ✅ Se ejecuta en CUALQUIER push a main
  workflow_dispatch:  # ✅ También se puede ejecutar manualmente

- name: Build and Deploy to Cloud Run
  run: |
    # ✅ Ya estamos en la raíz del repo
    gcloud run deploy faltauno-frontend \
      --source . \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --memory 256Mi \
      --cpu 1 \
      --min-instances 0 \
      --max-instances 10 \
      --port 8080 \  # ✅ Puerto correcto
      --project master-might-274420
```

---

## 🔐 PASO 2: CONFIGURAR SECRET EN GITHUB

### Verificar si el secret existe:

1. Ve a tu repositorio en GitHub:
   ```
   https://github.com/augusto-leborgne/FaltaUnoFront/settings/secrets/actions
   ```

2. Busca un secret llamado `GCP_SA_KEY`

### Si NO existe, crearlo:

#### Opción A: Copiar desde el archivo local

```powershell
# En PowerShell
Get-Content "C:\Users\augus\Desktop\Falta Uno\github-actions-key.json" -Raw | Set-Clipboard
```

Luego en GitHub:
1. Click en "New repository secret"
2. Name: `GCP_SA_KEY`
3. Value: Pegar el contenido (Ctrl+V)
4. Click "Add secret"

#### Opción B: Usar gcloud para generar una nueva key

```bash
gcloud iam service-accounts keys create github-actions-key-new.json \
  --iam-account=github-actions@master-might-274420.iam.gserviceaccount.com

# Copiar contenido
cat github-actions-key-new.json | clip
```

---

## 🧪 PASO 3: PROBAR EL DEPLOYMENT

### Opción 1: Push a main (automático)

```bash
cd "C:\Users\augus\Desktop\Falta Uno\Front\FaltaUnoFront"

# Hacer un cambio pequeño para trigger el workflow
git add .github/workflows/deploy-frontend.yml
git commit -m "fix: Corregir workflow de deployment para Cloud Run"
git push
```

### Opción 2: Trigger manual

1. Ve a: https://github.com/augusto-leborgne/FaltaUnoFront/actions
2. Click en "Deploy Frontend to Cloud Run"
3. Click en "Run workflow" → "Run workflow"
4. Esperar ~3-5 minutos

---

## 📊 VERIFICAR EL DEPLOYMENT

### 1. Ver logs en GitHub Actions

```
https://github.com/augusto-leborgne/FaltaUnoFront/actions
```

Buscar el workflow run más reciente y verificar que:
- ✅ Authenticate to Google Cloud
- ✅ Build and Deploy to Cloud Run
- ✅ Get Service URL
- ✅ Verify deployment

### 2. Verificar el servicio en Cloud Run

```bash
gcloud run services describe faltauno-frontend \
  --region us-central1 \
  --format="value(status.url)"
```

### 3. Probar la URL del frontend

```bash
# Debería devolver el HTML de Next.js
curl https://faltauno-frontend-169771742214.us-central1.run.app
```

---

## 🐛 TROUBLESHOOTING

### Error: "Secret GCP_SA_KEY not found"

**Solución:** Configurar el secret en GitHub (ver PASO 2)

### Error: "Permission denied" al hacer deploy

**Solución:** Verificar permisos del service account:
```bash
gcloud projects get-iam-policy master-might-274420 \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@master-might-274420.iam.gserviceaccount.com"
```

Debe tener estos roles:
- ✅ roles/run.admin
- ✅ roles/storage.admin
- ✅ roles/cloudbuild.builds.editor

### Error: "Port 3000 not responding"

**Solución:** ✅ Ya corregido - ahora usa puerto 8080 (match con Dockerfile.prod)

### El workflow no se ejecuta

**Solución:** ✅ Ya corregido - eliminado el path filter incorrecto

---

## 📋 CHECKLIST FINAL

Antes de hacer el deployment, verificar:

- [ ] Secret `GCP_SA_KEY` configurado en GitHub
- [ ] Workflow actualizado y commiteado
- [ ] Service account tiene permisos correctos
- [ ] `.env.production` tiene valores correctos:
  ```bash
  NEXT_PUBLIC_API_URL=http://34.44.39.79.nip.io:8080
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC80XhhlgglzWXoYIb5yURHjWkOL7ze1Z8
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=169771742214-q97bkldof5bmqi6bqnte9jjlfdombg81.apps.googleusercontent.com
  ```
- [ ] Dockerfile.prod existe y está correcto

---

## 🎯 PRÓXIMOS PASOS

1. **Commitear el workflow corregido**
   ```bash
   cd "C:\Users\augus\Desktop\Falta Uno\Front\FaltaUnoFront"
   git add .github/workflows/deploy-frontend.yml
   git commit -m "fix: Corregir workflow deployment (puerto 8080, sin path filter, sin cd)"
   git push
   ```

2. **Verificar que se ejecute el workflow**
   - Ve a: https://github.com/augusto-leborgne/FaltaUnoFront/actions
   - Debería aparecer un nuevo workflow run automáticamente

3. **Si falla por falta de secret:**
   - Configurar `GCP_SA_KEY` siguiendo el PASO 2
   - Re-ejecutar manualmente el workflow

4. **Verificar deployment exitoso**
   ```bash
   curl https://faltauno-frontend-169771742214.us-central1.run.app/api/health
   # Debería devolver: {"status":"ok"}
   ```

---

## ✅ RESULTADO ESPERADO

Después de configurar todo:

1. ✅ Cada `git push` a `main` ejecuta el workflow automáticamente
2. ✅ El frontend se construye con `gcloud run deploy --source .`
3. ✅ Se despliega a Cloud Run con 256Mi RAM y port 8080
4. ✅ El servicio queda disponible en: https://faltauno-frontend-169771742214.us-central1.run.app
5. ✅ Zero-downtime deployment (Cloud Run lo maneja automáticamente)

**TIEMPO ESTIMADO DE DEPLOYMENT:** 3-5 minutos

---

**NOTA:** El backend SÍ tiene deployment automático funcionando (Blue-Green en VM), solo el frontend necesitaba estas correcciones.
