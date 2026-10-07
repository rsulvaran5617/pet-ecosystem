# Envío externo tras OTP — corrección 2026-10-06

## Cierre posterior de la prueba y publicación Git

Las notas de pendiente al final de este registro describen el momento del despliegue.
Posteriormente el usuario mostró **Reporte recibido** y confirmó la publicación
desde administración. Baykey se retiró con autorización explícita: estado closed,
share_enabled=false, historial conservado y motivo de fin de prueba. La consulta
pública de detalle devolvió cero filas. Ver [baykey-closure.json](baykey-closure.json).
No se implementó un botón de retiro: sigue pendiente para alertas aprobadas sin caso
de moderación. El cierre se hizo mediante transacción administrativa puntual.

Correcciones y evidencia textual publicadas en origin/master, commit `2ea0d93`.
Estado completo para continuar: [HANDOFF_NUEVO_HILO.md](../../HANDOFF_NUEVO_HILO.md).

## Incidente observado

Usuario reportó retorno repetido al formulario sin recibo. Logs alojados:
POST 200 al pedir OTP, primer submit 500 y posteriores 400. Consulta limitada
al reportante confirmó challenge consumido y ninguna alerta creada. PostgreSQL
registró `function gen_random_bytes(integer) does not exist`.
No se leyeron códigos/hashes OTP, fotos ni contenido privado del reporte.

## Causas y correcciones

1. `create_external_pet_alert_report` tenía search_path public y usaba
   gen_random_bytes sin esquema; pgcrypto está en extensions. Migración nueva
   20261007021000 califica `extensions.gen_random_bytes`, conserva firma y
   generación de slug. Guard service_role null-safe; revoca grants heredados de
   anon/authenticated para cumplir contrato service-only. No se reescribe SQL aplicado.
2. Regresión con ubicación detectó PET_ALERT_UNAUTHORIZED: variable `current_role`
   colisionaba con CURRENT_ROLE dentro de SECURITY DEFINER. Migración 20261007021500
   usa `jwt_role`, guard IS NOT TRUE y revoca anon, manteniendo authenticated y
   service_role con autorización interna. No cambia precisión/geometría/DTO.
3. Web colocaba el error sobre el formulario, fuera del viewport del botón.
   Ahora lo muestra en Revisar, cerca del envío, con role alert y foco. Mensaje de
   OTP inválido incluye código utilizado/vencido y opción de corregir/solicitar otro.
   No hay reintento automático, bypass CAPTCHA ni reutilización del código consumido.

## Verificación

- Baselines SQL comparados con migraciones originales antes de modificar.
- Ambas candidatas ejecutadas en transacción revertida; restauración confirmada.
- Aplicación de cada migración y ledger atómica; verificación posterior registrada.
- Fixture PostgreSQL con SET ROLE service_role: crea alerta pending_review, slug
  aleatorio e historial y guarda ubicación sintética. Todo dentro de rollback.
- Contextos JWT authenticated sin identidad y nulo rechazan la ubicación externa;
  invocación de creación sin rol rechazada; ACL impide ejecución cliente directa.
  No representa auditoría RLS completa con sesiones de hogares reales.
- La prueba extendida con ubicación falló antes de la segunda corrección y pasó
  después. No se mutaron alertas/Storage reales ni se publicaron fixtures.
- Lint/typecheck web y build producción PASS. Diez comprobaciones de navegador
  local PASS, incluidas recuperación de error y pantalla Reporte recibido usando
  CAPTCHA/Edge simulados, sin correos ni reportes enviados por el agente.
- Dos fallos iniciales del runner: texto UTF8 dañado al generarlo desde PowerShell
  y espera insuficiente del reenvío simulado; corregidos antes del PASS final.
- Siete rutas candidatas HTTP200; clave Turnstile incluida, entorno sin cambios,
  HTML local/HTTPS coincidente después de activar; Admin intacto y PM2 guardado.

## Estado operativo

- Migraciones aplicadas: 20261007021000 y 20261007021500, exclusivamente.
- Web activa: `/var/www/pet-releases/external-submit-20261007`.
- Build: `fdNaUPq3fT3KEH4MgdGuO`; activación 2026-10-07T02:00:16.863Z.
- Rollback web: `/var/www/pet-releases/otp-resend-20261007`. No revertir SQL para
  deshacer UI: mantener correcciones de autorización y crypto.
- No nuevos builds mobile, deploy Edge, cambios flags, cron, commit o push.
- Evidencia: migration.json, location-migration.json, activation.json,
  browser-regression.json; fixture supabase/tests/pet-alert-external-slug.sql.

Pendiente: usuario solicita un OTP nuevo y completa envío real con foto/ubicación.
La prueba SQL y el navegador simulado no certifican subida Storage/Edge completa
ni moderación. El formulario ya abierto permite reenviar sin perder datos; solo
necesita recarga para recibir la mejora visual de mensajes.
