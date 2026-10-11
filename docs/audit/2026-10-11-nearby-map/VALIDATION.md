# Centrado cercano PET ALERT web — 2026-10-11

Implementacion local; no publicada. Alcance: camara del mapa publico, permiso
opcional y captura unica. Sin cambios de backend, mobile ni datos reales.

- Build de produccion `@pet/web`: PASS, incluye lint y tipos.
- Typecheck independiente: PASS. Diff check de archivos afectados: PASS.
- Chrome headless sobre build local: 6 escenarios PASS (`browser-check.json`).
  Permiso concedido centra automaticamente en Madrid (ubicacion simulada fuera
  de Panama); permiso pendiente espera pulsacion; rechazo, timeout y navegador
  sin geolocalizacion conservan mapa; respuesta posterior al desmontaje se ignora.
- Consulta visible comprobada: contiene el centro y al menos aproximadamente
  5 km al norte/sur; no consulta inicial sin limites. Datos RPC y estilo del
  mapa simulados, sin mutaciones remotas. No acredita GPS real ni Safari/iOS.

Reproducir: compilar web con NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL configurado,
iniciar build local en puerto 3091 y ejecutar
`node docs/audit/2026-10-11-nearby-map/browser-check.mjs`.

Pendiente: publicar web si se solicita y comprobar permisos/ubicacion real
en Safari/iOS y navegador integrado de WhatsApp.
