# Rendimiento del bundle inicial (GI)

**Responsable:** Julian Tesoreiro  
**Revisión:** Lucas Lautaro Luciano  
**Depende de:** GI-09, GI-11

## Criterio de cierre

- `npm run build` en `frontend/` no supera el presupuesto `initial` de 500 kB (sin advertencia ni error).
- Lighthouse sobre el build de producción (entrada `/index.html`, flujo hasta `/login`) mejora respecto de la línea base.

## Línea base (antes)

Comando: `npx ng build --configuration production` en `frontend/`.

| Métrica | Valor |
|--------|--------|
| **Initial total (raw)** | 578,21 kB |
| Advertencia presupuesto 500 kB | Sí (+78,21 kB) |

Comando: `npm run report:lighthouse` (LHCI, 1 corrida, `staticDistDir`: `dist/frontend/browser`).

| Categoría | Score |
|-----------|-------|
| Performance | 0,28 |
| Accessibility | 1,00 |
| Best practices | 1,00 |
| SEO | 0,91 |

## Después de la optimización

Comando: `npm run build` en `frontend/` (misma configuración de producción).

| Métrica | Valor |
|--------|--------|
| **Initial total (raw)** | 458,52 kB |
| Advertencia presupuesto 500 kB | No |
| **Δ Initial** | −119,69 kB (~21 %) |

Comando: `npx @lhci/cli@0.15.1 autorun` sobre el mismo `dist` (post-build).

| Categoría | Antes | Después | Δ |
|-----------|-------|---------|---|
| Performance | 0,28 | 0,60 | +0,32 |
| Accessibility | 1,00 | 1,00 | — |
| Best practices | 1,00 | 1,00 | — |
| SEO | 0,91 | 0,91 | — |

## Cambios aplicados

### JavaScript del arranque

- **Firebase Auth:** inicialización con `import()` dinámico (`getFirebaseAuth`); deja de estar en el chunk `main`.
- **Sentry:** imports nombrados; se eliminó `TraceService` y el inicializador asociado (sin tracing en el bundle inicial).
- **Rutas:** ya usaban `loadComponent`; sin cambios estructurales.

### Tipografía

- Eliminación de Google Fonts en `index.html` (Roboto, Atkinson, Material Icons).
- **Inter** en WOFF2 latino (`inter-latin-wght-normal.woff2`, ~48 kB) en lugar del TTF (~855 kB).
- Tema Angular Material alineado a **Inter**.
- **Atkinson Hyperlegible** solo en chunks de ficha/derivación (WOFF2 local).

### Iconos e imágenes

- Íconos del login en SVG inline (sin fuente Material Icons).
- Eliminado `favicon.svg` (~1,9 MB); favicon PNG/ICO en `public/favicon/`.
- `foto-perfil.png` redimensionado a 160 px; avatares de lista con `loading="lazy"` y `decoding="async"`.

### CI / presupuestos

En [`frontend/angular.json`](../frontend/angular.json), presupuesto `initial`: `maximumWarning` y `maximumError` en **500 kB**. El job **Frontend** de [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) falla si el bundle inicial excede ese límite.

## Cómo reproducir

```bash
cd frontend
npm ci
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/app/firebase.example.ts src/app/firebase.ts
npm run build
npm run report:lighthouse
```

Los reportes HTML de Lighthouse se escriben en `frontend/reports/lighthouse/` (ignorados por git).
