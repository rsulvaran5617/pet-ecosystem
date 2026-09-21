# Foundation-1C.3d: proyeccion de fotos listas

2026-09-21. **Implementacion y validacion tecnica local completadas; cierre
operativo pendiente.** Lectura, consentimiento, conversion historica y limpieza
controlada implementados, NO activados. El usuario confirmo que no dispone de
proyecto Supabase de pruebas ni cuentas QA. No se ejecuto inventario remoto,
conversion o borrado reales. No se certifica QA alojada, nativa ni rollout.

## Commit previo y nombre de producto

Foundation-1C.3b/c publicados en `3bbef94` en origin/master. Los cambios de este
documento pertenecen al trabajo posterior 1C.3d y permanecen sin commit/push.

El nombre del frente de producto es **Pet Ecosystem SOS**, evolucion de Pet Alert.
No se crea otra app instalable, cuenta ni backend. Dentro de Pet Ecosystem la
entrada descriptiva propuesta es **Mascotas perdidas y encontradas**. Se conserva
la ruta publica `/pet-alert` y los textos PET ALERT existentes en este slice;
Foundation-1C es un nombre tecnico, no visible al usuario. No se hizo rebranding.

## Implementado

- Migracion local `20260921160000_pet_sos_ready_media_projection.sql`, posterior
  a 1C.3b/c. Control privado ready_only=false por defecto; aplicar SQL NO activa
  el corte global ni expone derivados Owner preparados anteriormente.
- Proyecciones publicas mantienen contratos anteriores, pero con ready_only=true
  excluyen metadata legacy, fuente Owner modificada, foto incompleta, contenido
  pausado/no compartible/no vigente. External conserva revision admin; found/closed
  mantienen visibilidad historica cuando share_enabled lo permite, como baseline.
- Community exige job ready y dos objetos. Finalizador agrega thumbnail atomico
  con metadata/auditoria, conserva firma RPC anterior. Edge comunitaria ahora sube
  display+thumbnail; Edge externa tambien registra variantes y processing_version.
  Las versiones anteriores de esos endpoints no deben seguir atendiendo al activar.
- Owner valida consentimiento y version vigente del perfil/objeto/hogar, nunca
  fallback original en modo estricto. owner_photo_choice persiste include/exclude;
  un rollback a legacy NO vuelve a exponer la foto de quien eligio no publicarla.
- Gateway GET `pet-alert-public-photo?path=...`: sin login para ver contenido
  publico; resolve RPC solo service_role comprueba que sea un derivado elegible.
  Descarga unicamente de pet-alert-media propio, maximo 5 MiB, JPEG, sin redirects.
  Revalida visibilidad despues de descargar; no devuelve rutas de origen ni URLs
  firmadas, responde 404 indistinguible para privado/inexistente/error y no-store.
- Storage estricto cierra nuevas escrituras directas a pet-alert-media y firmas
  publicas directas. Acceso privado administrativo a externos pending_review se
  conserva; no se altera expediente/avatar privado autorizado ni Foster/Clinical.
- API mobile/web/admin usa gateway cuando se habilita su flag. No firma pet-avatars
  ni vuelve a Storage cuando gateway falla. Edge comunitaria tambien retorna gateway
  en modo estricto (campo signedUrl conservado por compatibilidad, sin firma).
- Owner mobile, paso Revisar: switch sin seleccionar para publicar foto de perfil,
  solo bajo flag. Sin foto/consentimiento publica texto, no original. Con consentimiento
  prepara derivado y publica mediante RPC segura; conserva ID del borrador ante fallo.
  Backend comprueba modo estricto dentro de la transaccion de publicacion. Web Owner
  no tenia este alta: no se inventa una pantalla web adicional.
- Alertas Owner ya publicadas: acciones Publicar foto actual / Retirar foto,
  con confirmacion explicita, solo bajo flag. RPC set_pet_sos_owner_photo_choice
  verifica sesion, permiso sobre alerta y Pet, modo estricto y estado vigente.
  Retirar invalida intentos pendientes y conserva avatar privado. No republica.

## Retirada y limites reales

La URL gateway comprueba estado en cada nueva peticion. Una imagen ya descargada,
guardada por un usuario o visible en memoria del navegador NO puede recuperarse.
RLS tampoco invalida retroactivamente URLs firmadas antiguas. La app anterior suele
pedir 15 minutos, pero eso no demuestra un TTL maximo para todas las firmas emitidas.
Antes de afirmar revocacion integral hay que inventariar esas emisiones y decidir
expiracion/rotacion de objetos con impacto revisado. No rotar claves globales ni
borrar avatars privados como parte de este slice.

El gateway agrega consultas DB y transferencia en cada imagen sin cache persistente.
Validar CPU/banda, latencia, coste y proteccion de abuso de infraestructura antes de
abrirlo al publico. Las pruebas mock no acreditan rendimiento ni runtime alojado.

## Conversion y limpieza: implementadas, NO ejecutadas en remoto

Migracion aditiva `20260921180000_pet_sos_media_maintenance.sql`: jobs privados
pet_sos_media_backfills y tombstones privados pet_sos_media_tombstones, con RLS,
RPCs operativas solo service_role, auditoria y ninguna tarea programada.

- Conversion community/external: IDs revisados, snapshot de metadata, reporte y
  objeto/version, lease 10 minutos, codec compartido real, rutas inmutables,
  display+thumbnail obligatorios. Se revalida todo al finalizar, se conserva el
  original y no se cambia moderacion/estado. Retries generan nuevos intentos;
  finalize ready es idempotente; abort no invalida ready ante respuesta incierta.
- Owner no admite conversion masiva: consentimiento desde mobile para cada alerta.
- Limpieza: solo nuevos namespaces owner-sos-v1, sos-v1 y backfill-sos-v1 mayores
  de 24h, nunca pet-avatars, originales legacy ni objetos externos arbitrarios.
  Revalida ID/version y todas las referencias; conserva originales registrados
  en snapshots. Reserva tombstone permanente antes de API Storage DELETE. Triggers
  y advisory locks impiden reanexar/recrear rutas retiradas. Confirma ausencia antes
  de auditar exito. Fallo de DELETE mantiene tombstone y permite reintento revisado.
- No borra metadata de storage.objects por SQL. No borra historiales ni jobs.
  Limpieza conservadora puede retener mas archivos; no pretende recolectar todo Storage.

`inspect_pet_sos_media_rollout` y listas de candidatos son solo lectura. Inventario
no equivale a consentimiento ni a autorizacion de aplicar; confirmacion humana de
proyecto e IDs obligatoria. Conteos legacy no sustituyen una auditoria de cobertura.

Runner de SOLO LECTURA, necesita migracion aplicada y entorno Supabase configurado:

```powershell
node packages/api-client/scripts/pet-sos-media-inventory.mjs --dry-run
```

El runner Node anterior conserva su contrato solo lectura. El nuevo runner Deno
`supabase/scripts/pet-sos-media-maintenance.ts` admite mantenimiento revisado,
procesa una foto u objeto por invocacion y nunca activa el modo estricto. Lee URL
y service key exclusivamente del entorno; confirma hostname exacto del proyecto.
No imprime rutas privadas, tokens, fotos, cuerpo de errores ni snapshot personal.

Ejemplos para operador, NO ejecutados. Sustituir placeholders por el proyecto/IDs
confirmados, cargar secretos fuera del historial de comandos y preparar WASM segun
FOUNDATION_1C_MEDIA.md. No usar --allow-all ni conceder permisos a otros hosts.

```powershell
# Solo lectura: devuelve hasta 25 IDs por categoria y version de objetos candidatos.
deno run --frozen --allow-read --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY --allow-net=<PROJECT>.supabase.co --config supabase/functions/pet-alert-external-report/deno.json supabase/scripts/pet-sos-media-maintenance.ts --confirm-project=<PROJECT>

# Solo tras revision de inventario, entorno y respaldo. No incluye Owner.
deno run --frozen --allow-read --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY --allow-net=<PROJECT>.supabase.co --config supabase/functions/pet-alert-external-report/deno.json supabase/scripts/pet-sos-media-maintenance.ts --confirm-project=<PROJECT> --mode=backfill --kind=community --id=<MEDIA_UUID> --apply --reviewed

# Version exacta tomada del inventario; una ruta nueva queda retirada para siempre.
deno run --frozen --allow-read --allow-env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY --allow-net=<PROJECT>.supabase.co --config supabase/functions/pet-alert-external-report/deno.json supabase/scripts/pet-sos-media-maintenance.ts --confirm-project=<PROJECT> --mode=cleanup --id=<OBJECT_UUID> --updated-at=<TIMESTAMP> --apply --reviewed
```

Sin --apply no muta, aunque se especifique mode. Fallos se detienen sin fallback.
Guardar los IDs/version revisados para reintentar un DELETE de resultado incierto;
un objeto ya ausente puede no aparecer en el inventario, pero su tombstone permite
confirmar el resultado. No ejecutar bucles ilimitados sobre candidatos fallidos.
Formatos no admitidos, fuentes ausentes y fotos >5 MiB requieren revision manual,
no marcar como listas ni ampliar limites para forzar conversion.

## Activacion coordinada (NO ejecutada)

- Revisar/aplicar 20260921120000, 20260921140000, 20260921160000 y 20260921180000,
  en ese orden, sin incluir cron de reservas diferido. Instalarlas NO activa nada.
- Preparar WASM y desplegar owner/community/external actualizados y gateway.
- Secretos Edge: PET_ALERT_OWNER_DERIVATIVES_ENABLED y PET_ALERT_PUBLIC_MEDIA_ENABLED.
- Builds compatibles: EXPO_PUBLIC_PET_ALERT_READY_MEDIA para mobile;
  NEXT_PUBLIC_PET_ALERT_READY_MEDIA para web/admin. SANITIZED_UPLOADS=true para
  subidas comunitarias. Todos false/ausentes por defecto en este checkout.
- Ensayar en staging con fixtures y clientes actualizados. No activar en publico
  antes de backfill/consentimientos y adopcion; binarios viejos perderian fotos/subidas.
- Solo operador service_role puede invocar set_pet_sos_ready_media_only(true,true);
  segunda entrada reconoce rollout revisado. Se audita. No es verificacion automatica
  de adopcion ni cobertura: el operador debe aportar esa evidencia.
- Rollback deliberado permite rutas legacy solo para alertas sin decision explicita;
  include/exclude nunca vuelven al original. Mantener gateway mientras existan enlaces.

## Pruebas

- PGlite aplica 1C.3b/c/d reales sobre fixtures simplificados: modo inicial, ACL,
  publicacion con/sin consentimiento, rollback, originales bloqueados, metadata
  no falsificable, thumbnail obligatorio, estado/fuente invalidada e inventario.
- Deno mock HTTP: gateway visible/oculto, retirada durante descarga, limites,
  MIME y desactivacion; codec real y regresiones externas/comunitarias/Owner.
- Cliente: flags, gateway sin firmas originales, orden preparar/publicar y fallos
  sin fallback. No equivale a QA visual del switch ni instalacion nativa.

```powershell
node supabase/tests/pet-sos-ready-media.test.mjs
corepack pnpm --filter @pet/api-client test
deno test --frozen --allow-read --allow-env --config supabase/functions/pet-alert-public-photo/deno.json supabase/functions/pet-alert-public-photo/handler.test.ts
git diff --check
```

Resultados locales 2026-09-21: PGlite 28 grupos y aserciones de proyeccion/RLS;
cliente API 17 pruebas; Deno 54 pasos. Lint y tipos de las superficies revisadas,
build web, exportaciones Expo Android/iOS y git diff --check satisfactorios.
Las exportaciones no son APK/IPA ni prueban la interfaz en dispositivos.

Pendientes para cierre operativo: sesiones reales anon/owner/view/editor/admin,
concurrencia real, bundle/limites alojados, QA Android/iOS con flag y HTTP en
dispositivos, inventario/backfill/limpieza reales y adopcion de clientes.
Evidencia: [QA local y puertas](../audit/2026-09-21-sos-ready-media/VALIDATION.md).
Sin commit/push de 1C.3d, migracion remota, deploy, APK/IPA ni activacion en este turno.
