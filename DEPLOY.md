# Deploy Automático - Falta Uno Frontend

## ✅ Configuración Completada

El frontend está configurado para **deploy automático** en cada push a la rama `main`.

### Proceso Automático

Cuando haces `git push` a `main`:

1. **GitHub Actions** se dispara automáticamente
2. **Cloud Build** construye la imagen Docker usando `Dockerfile.prod`
   - Usa `cloudbuild-prod.yaml` para la configuración
   - Construye con Next.js en modo producción
   - Etiqueta la imagen con el SHA del commit
3. **Cloud Run Deploy** crea una nueva revisión del servicio
4. **Migración de Tráfico** automática al 100% a la nueva revisión

### Verificar Deploy

Después de hacer push, puedes verificar:

```bash
# Ver builds en progreso
gcloud builds list --ongoing --project=master-might-274420

# Ver últimas revisiones
gcloud run revisions list --service=faltauno-frontend --region=us-central1 --limit=5

# Ver distribución de tráfico
gcloud run services describe faltauno-frontend --region=us-central1 --format="value(status.traffic)"
```

### URLs

- **Producción**: https://faltauno-frontend-169771742214.us-central1.run.app
- **Backend**: https://faltauno-backend-169771742214.us-central1.run.app

### Secrets Requeridos en GitHub

El repositorio necesita estos secrets configurados:

- `GCP_SA_KEY`: Service Account JSON con permisos para Cloud Build y Cloud Run
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: API key de Google Maps

### Arquitectura

```
Push to main
    ↓
GitHub Actions
    ↓
Cloud Build (Dockerfile.prod)
    ↓
Docker Image → Artifact Registry
    ↓
Cloud Run Deploy
    ↓
Traffic Migration 100%
    ↓
✅ Live in Production
```

### Troubleshooting

Si el deploy falla:

1. Verificar logs de GitHub Actions en la pestaña "Actions" del repo
2. Ver logs de Cloud Build:
   ```bash
   gcloud builds list --limit=5
   gcloud builds log [BUILD_ID]
   ```
3. Verificar permisos del service account
4. Deploy manual si es necesario:
   ```bash
   cd Front/FaltaUnoFront
   gcloud builds submit --config=cloudbuild-prod.yaml \
     --substitutions="SHORT_SHA=$(git rev-parse --short HEAD),_NEXT_PUBLIC_API_URL=https://faltauno-backend-169771742214.us-central1.run.app,_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY"
   
   gcloud run deploy faltauno-frontend \
     --image us-central1-docker.pkg.dev/master-might-274420/cloud-run-source-deploy/faltauno-frontend:COMMIT_SHA-prod \
     --region us-central1 --quiet
   ```

### Cambios Recientes

- **2025-11-01**: Configurado deploy automático con Cloud Build
- **2025-11-01**: Migrado a Dockerfile.prod para builds de producción
- **2025-11-01**: Actualizado backend URL a nuevo dominio de Cloud Run
