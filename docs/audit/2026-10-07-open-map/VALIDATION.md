# Mapa libre publicado y verificado

## Resultado final — 07/10/2026 Panamá

Usuario inició candidata por SSH; comprobados PM2 online y HTTP200. Navegador
sobre candidata y HTTPS público: mapa renderizado, punto Ginger, atribución y
apertura de boletín PASS, sin errores. El bloqueo inicial quedó superado.

- Web activa: `/var/www/pet-releases/open-map-20261007`.
- Build: `g4Axw3SgcMZCkSCDiFs8w`.
- Activación: `2026-10-08T00:57:33.148Z`.
- Rollback: `/var/www/pet-releases/android-link-20261007`.
- Siete rutas HTTP200; HTML HTTPS coincide; Admin intacto; PM2 guardado; candidata retirada.
- Evidencia: activation.json, candidate-check.json, public-check.json y capturas.
- Solo URL de estilo modificada; sin SQL, datos, flags SOS ni betas mobile.
- Servicio sin SLA; no acredita QA nativa ni carga masiva.

Las notas siguientes conservan la preparación y el bloqueo inicial, ya superado.

Usuario autorizó configurar y publicar mapa sin suscripción ni cuenta. Se eligió
OpenFreeMap Liberty: https://tiles.openfreemap.org/styles/liberty.
Servicio público gratuito, uso comercial permitido, sin API key. Software MIT,
datos OSM ODbL: no describir todo el conjunto como copyleft. Atribución provista
por el estilo y MapLibre; pendiente verificarla en navegador. Sin SLA.
Fuentes: https://openfreemap.org/ y https://openfreemap.org/quick_start/.

Estado comprobado:
- RPC pública de puntos devolvió HTTP200 y una alerta con ubicación.
- Estilo HTTP200, versión 8, incluye fuentes, glyphs y sprites.
- Candidata `/var/www/pet-releases/open-map-20261007` preparada a partir de
  `/var/www/pet-releases/android-link-20261007`, excluyendo entornos/dependencias/builds.
- Entorno copiado privadamente, agregando solo NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL.
- Install offline, build Next, lint y tipos PASS.
- Configuración local apps/web/.env.production.local sincronizada, no versionar.
- activate-map.cjs subido al directorio candidato; runner de navegador preparado.

La revisión automática de aprobación rechazó el comando para arrancar la candidata
PM2 pet-open-map-candidate en puerto 3075 con «blocked by policy», sin detalle
adicional. No se inició la candidata por ese comando ni se activó la nueva web.
No se completó prueba de canvas, tiles, atribución ni apertura del boletín.
No afirmar publicación ni verificación visual. Web anterior conserva servicio.

Para retomar, resolver el bloqueo de ejecución con el operador, iniciar candidata,
probar con browser-check.mjs a través de túnel local, revisar captura y errores.
Solo después ejecutar activate-map.cjs --activate, verificar HTTPS/navegador,
guardar evidencia y actualizar handoff. El script comprueba entorno y Android,
mantiene Admin y dispone de rollback a android-link-20261007.
