# Medios SOS: revision previa a Foundation-1C.3

2026-09-20. Diagnostico de codigo; no inspeccion de fotos privadas de usuarios.

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

Decision tecnica pendiente: motor de decodificacion mantenido compatible con
runtime Edge o worker existente. No escribir parser binario casero ni prometer
que quitar una etiqueta EXIF basta. Revisar dependencias/licencia/recursos antes
de introducir codec. No se ha instalado ningun procesador nuevo en esta entrega.

Pruebas requeridas: JPEG con GPS, PNG con texto, WebP con EXIF/XMP, orientacion,
imagen corrupta, MIME falso, dimensiones extremas, timeout, reintento, autor ajeno,
lectura anon de original denegada y derivado publico autorizado. Moderacion IA de
contenido ofensivo sigue propuesta independiente pendiente; no equivale a saneamiento.
