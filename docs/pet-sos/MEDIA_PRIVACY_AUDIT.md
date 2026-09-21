# Medios SOS: revision previa a Foundation-1C.3

2026-09-20. Diagnostico de codigo; no inspeccion de fotos privadas de usuarios.

Actualizacion 2026-09-21: [Foundation-1C.3a](FOUNDATION_1C_MEDIA.md) implementa
localmente codec compartido y saneamiento previo al alta externa. No desplegado;
1C.3b prepara upload comunitario y [1C.3c](FOUNDATION_1C_OWNER_MEDIA.md) derivados
privados Owner. Ambos locales/desactivados. Proyeccion legacy y endurecimiento
global de Storage siguen pendientes de 1C.3d.
Los hallazgos siguientes describen el baseline previo, no controles ya remotos.

## Compatibilidad con SOS abierto

El [delta comunitario](FOUNDATION_DELTA_ASSESSMENT.md) no elimina este control.
Foundation-1C.3 debe resolver recursos por alerta/reporte y actor autorizado,
sin exigir pet_id, household_id ni rol Owner para fotos externas/comunitarias.
Conservar original privado/derivado saneado independientemente de una conversion
posterior a Owner. Vincular Pet no reatribuye autorias ni publica originales.
No ampliar privilegios del token externo para acceder al avatar o expediente.
Saneamiento pendiente en los tres caminos, no solo el upload mobile registrado.

## Hallazgos

| Camino actual | Observacion | Riesgo pendiente |
| --- | --- | --- |
| API uploadPetAlertCommunityPhoto | Sube fileBytes directamente; metadata despues | No normalizacion servidor demostrada |
| Edge pet-alert-external-report | Controla cantidad, MIME declarado y 5 MB; sube File original | MIME/tamano no acreditan decodificacion ni eliminacion EXIF |
| Proyeccion de alerta owner | Firma medio/avatar elegible existente | URL firmada limita acceso, no elimina metadatos de bytes |
| Nuevo feed SOS | Sin medios ni firmas masivas | Reduce descarga; NO sanea fotos de fichas antiguas |

No se afirma que una foto concreta exponga GPS: no se descargaron originales
reales. Se identifica ausencia de garantia servidor en los caminos revisados.
No hacer publicos buckets ni confiar en el picker del telefono como sanitizador.

## Diseno a implementar

1. Preparacion autorizada de subida privada por actor/recurso con cuota y clave
   idempotente; el original no es elegible para proyeccion publica.
2. Procesador backend valida firma real, formato, bytes y dimensiones/pixeles;
   decodifica, aplica orientacion y re-encodea sin EXIF/XMP/IPTC. Limitar CPU/memoria.
3. Derivado de visualizacion y thumbnail sin metadatos privados. Sin sustitucion
   destructiva del avatar original ni perdida silenciosa de orientacion.
4. Finalizacion atomica de metadata solo despues del derivado validado. Ante fallo
   queda privado; reintento no duplica ni hace publico el original como fallback.
5. Publicacion y RLS/Storage permiten solo derivados ready; backfill de medios
   existentes separado, controlado, con revision y sin borrar originales a ciegas.
6. TTL/limpieza de huerfanos y originales definido, auditable, sin registrar paths
   privados/URLs firmadas en logs. Probar retirada y vigencia de URLs.

Decision tecnica local 1C.3a: Magick WASM 0.0.43 fijado con lockfile, Apache-2.0,
sin parser binario propio. Pruebas Deno de decoder real correctas; falta validar
bundle/CPU/memoria en runtime Supabase antes de desplegar. Quitar una etiqueta EXIF
no basta: re-encodear y verificar variantes, permisos y proyecciones por camino.

Pruebas requeridas: JPEG con GPS, PNG con texto, WebP con EXIF/XMP, orientacion,
imagen corrupta, MIME falso, dimensiones extremas, timeout, reintento, autor ajeno,
lectura anon de original denegada y derivado publico autorizado. Moderacion IA de
contenido ofensivo sigue propuesta independiente pendiente; no equivale a saneamiento.
