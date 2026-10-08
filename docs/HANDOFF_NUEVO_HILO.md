# Pet Ecosystem — contexto para continuar en un nuevo hilo

## Punto de continuación — commit y push del 07/10/2026

**Estado vigente; prevalece sobre las notas históricas inferiores.**

- Código móvil y evidencia publicados en `origin/master`: **`7182daa`**, `feat(pet-alert): add owner mobile map and public directory`. Push normal verificado.
- Web ya publicada: `/var/www/pet-releases/open-map-20261007`, build `g4Axw3SgcMZCkSCDiFs8w`. Mapa OpenFreeMap, punto Ginger y apertura del boletín verificados por navegador. Rollback web: android-link-20261007.
- Android `/beta/android` apunta a Firebase `4vkg63dqtpkc8` (21/09). APK publicado sigue 0.0.0 (1), anterior al nuevo mapa móvil.
- Apple desbloqueado tras aceptar acuerdo: iOS **0.3.1 (50)** válido, BetaTester interno/externo, enlace público habilitado y expiración 20/12/2026, comprobado por API. Usuario confirmó instalación y acceso; no confundir con QA de la nueva pantalla.
- Cambio móvil nuevo: Inicio → PET ALERT · Mapa y boletines; Lista/Mapa, categorías y puntos públicos. Detalles se abren en navegador, no son fichas nativas. Conserva formulario comunitario; sin GPS ni mutaciones nuevas.
- Tipos/lint/export Metro Android/iOS PASS. **No se han generado ni distribuido APK/IPA con `7182daa`.** QA nativa de gestos, selección, retorno del navegador, errores y accesibilidad pendiente.
- Siguiente entrega concreta: preparar nuevas betas desde `7182daa` en checkout aislado, verificar identidad/configuración y distribuir por Firebase/TestFlight según autorización vigente. No activar flags SOS ni cambiar DB incidentalmente. Si cambia la release Firebase, actualizar también la URL Android web y recompilar.
- Antes de enviar, consultar builds/submissions existentes para evitar duplicados; no usar `--latest` sin identificar el artefacto. Revisar documentación de release y skills.
- Evidencia versionada: `docs/audit/2026-10-07-mobile-map/`, `2026-10-07-open-map/`, `2026-10-07-android-link/`, `2026-10-07-apple-agreements/`. Capturas PNG quedan locales.
- Cambios históricos ajenos siguen locales, incluidos documentos y la migración MAP-7 ya aplicada. No ejecutar `git add .`, reset ni reaplicar migraciones por ver archivos modificados. Ningún archivo de entorno o credencial se incluyó.

Este handoff se publica en un segundo commit documental posterior a `7182daa`;
identificarlo con `git log -2`. Para continuar: leer AGENTS.md, esta sección,
la evidencia mobile y las guías Firebase/TestFlight; las notas de «sin commit»
inferiores describen momentos anteriores de la sesión.

## Owner mobile: mapa y boletines implementados localmente — 07/10/2026

Nuevo acceso Inicio → PET ALERT · Mapa y boletines. Directorio Lista/Mapa con
categorías, paginación, mapa nativo OpenFreeMap y selección; Ver boletín en navegador
abre ficha pública. Mantiene formulario comunitario. Componentes nuevos
PetAlertDirectoryWorkspace y PetAlertPublicMap, CoreHomeScreen conecta navegación.
Solo RPCs públicas existentes; sin permisos GPS ni cambios DB. Detalle no es nativo.
Tipos y lint PASS; export Metro Android/iOS PASS, no equivalente a APK/IPA ni QA nativa.
Pendiente generar/distribuir nuevas betas y probar mapa en dispositivos (gestos dentro
del scroll, selección, atribución, retorno del navegador, red fallida y accesibilidad).
No está incluido en las betas Android/iOS instaladas. Sin commit/push de este cambio.

## Mapa público operativo — cierre 07/10/2026

Supera el bloqueo descrito debajo: usuario inició candidata y se completaron
prueba de navegador, activación y verificación pública. Web activa
`/var/www/pet-releases/open-map-20261007`, build `g4Axw3SgcMZCkSCDiFs8w`.
OpenFreeMap Liberty gratuito, sin cuenta/API key; atribución visible. Ginger aparece
como punto y abre su boletín. Candidata y HTTPS sin errores de navegador.
Rollback: android-link-20261007. Admin intacto, PM2 guardado, temporal retirado.
Sin build móvil ni cambios de datos. [Evidencia](audit/2026-10-07-open-map/VALIDATION.md).

## Mapa libre preparado, sin publicar — 07/10/2026

Usuario pidió proveedor gratuito sin cuenta. OpenFreeMap Liberty seleccionado
(software MIT, datos OSM ODbL). Candidata `/var/www/pet-releases/open-map-20261007`
compilada con NEXT_PUBLIC_PET_ALERT_MAP_STYLE_URL; build/lint/tipos PASS.
Arranque de candidata rechazado por revisión automática («blocked by policy»).
Web activa sigue en android-link-20261007. Falta navegador/canvas/puntos y activación.
[Estado y continuación](audit/2026-10-07-open-map/VALIDATION.md).

## Apple desbloqueado ? 07/10/2026

El usuario acept? el acuerdo. Consulta posterior de App Store Connect exitosa:
iOS 0.3.1 (50), VALID, no expirado, IN_BETA_TESTING interno y externo,
asociado a BetaTester con enlace p?blico habilitado. Expira el 20/12/2026.
No requiere otra subida para esta beta. Sustituye las notas inferiores de bloqueo
por acuerdos. Evidencia: [estado Apple](audit/2026-10-07-apple-agreements/status.json).
Instalaci?n y QA en dispositivo siguen sin confirmarse.

## Actualización 07/10/2026 — enlace Android publicado

Web activa ahora en `/var/www/pet-releases/android-link-20261007`, build
`fhFOiz_mPqCerxnC3otiM`. Sustituye la ruta/build web del cierre inferior.
`/beta/android` redirige a Firebase `4vkg63dqtpkc8` (beta 21/09), confirmado por
API Firebase y HTTPS; antes apuntaba a `1c16tgdrdjmb0` (19/09).
Solo cambió NEXT_PUBLIC_ANDROID_BETA_URL; código y CAPTCHA preservados.
Build/lint/tipos PASS, siete rutas HTTP200, Admin intacto, PM2 guardado.
Rollback web: `/var/www/pet-releases/external-submit-20261007`.
Sin nuevo binario mobile. Apple API continúa bloqueada por acuerdos obligatorios
pendientes/vencidos; no afirmar revalidación actual de TestFlight.
[Evidencia](audit/2026-10-07-android-link/VALIDATION.md). Esta actualización
operativa queda en archivos locales; los commits del cierre anterior son históricos.

## Estado vigente al cierre — 6 de octubre de 2026 (Panamá)

**Leer esta sección primero. Sustituye los pendientes históricos de activación web,
OTP, recibo y moderación que aparecen debajo.** El resumen general del proyecto
se conserva como contexto histórico del 28/09; las operaciones remotas de esta
sesión sí se ejecutaron y se verificaron con los límites indicados aquí.

### Git y alcance de la entrega

- Correcciones publicadas en `origin/master`: **`2ea0d93`**, `fix(pet-alert): recover OTP flow and external report submission`.
- Fetch previo confirmó que master coincidía con origin; push normal exitoso, sin force.
- Incluye formulario externo, dos migraciones, prueba SQL, contratos y evidencia textual de las tres correcciones.
- Este handoff se actualiza después de ese push y se publica en un commit documental separado. Consultar `git log -2` para identificarlo.
- Persisten cambios locales anteriores, artefactos y archivos sin seguimiento; no se incluyeron en bloque ni se borraron. Revisar `git status` antes de continuar. Las capturas PNG locales de auditoría no se publicaron.

### Resultado real del piloto

1. El usuario completó CAPTCHA, correo OTP, envío con foto y llegó a **Reporte recibido**.
2. El usuario confirmó que aprobó/publicó Baykey desde administración. Esto supera el pendiente anterior de recibo y moderación; no equivale a QA integral de todo SOS.
3. Detectamos una carencia: los reportes externos aprobados desaparecen de pendientes y no tienen cierre directo en el panel si no existe un caso de moderación. Ocultar del mapa no retira el boletín.
4. El usuario autorizó expresamente retirar la prueba. Se cerró únicamente `baykey-aabb62669cd9` mediante operación administrativa transaccional: `status=closed`, `close_reason=closed_not_found`, `share_enabled=false`, fecha de cierre e historial con motivo «Reporte de prueba finalizado».
5. No se borraron alerta, fotos ni historial. El actor del historial es nulo, documentado como conexión administrativa; no se suplantó una sesión del usuario. La RPC pública de detalle devolvió cero filas después del cierre. La comprobación HTTP del directorio no encontró enlace a Baykey; un HTTP 200 de la página de detalle, por sí solo, no demuestra contenido visible.

Evidencia del cierre: [baykey-closure.json](audit/2026-10-06-external-submit/baykey-closure.json). No incluir OTP, token privado ni datos de contacto en otro hilo.

### Entorno publicado y recuperación

| Elemento | Último estado verificado en esta sesión |
| --- | --- |
| Web | `/var/www/pet-releases/external-submit-20261007` |
| Build web | `fdNaUPq3fT3KEH4MgdGuO` |
| Activación UTC | `2026-10-07T02:00:16.863Z` (06/10 en Panamá) |
| PM2 web | `pet-ecosystem-web`, puerto 3000; configuración guardada |
| Admin | `/var/www/pet-ecosystem`, sin nuevo despliegue |
| Rollback web | `/var/www/pet-releases/otp-resend-20261007` |
| Migraciones aplicadas | `20261007021000`, `20261007021500` |

No reaplicar ni reescribir esas migraciones. Revertir la UI no requiere revertir
las correcciones SQL. No hubo nueva publicación Edge/mobile ni activación de flags
de medios, `ready_only` o cron. Revalidar estado remoto antes de otra operación;
el despliegue se realizó antes del commit, por lo que su identidad es ruta/build.

### Correcciones y comprobaciones

- Turnstile: la copia activa carecía de Site Key al compilar. Se preservó el entorno y se compiló con la clave pública existente. [Evidencia](audit/2026-10-06-turnstile/VALIDATION.md).
- OTP: botón Solicitar otro código, vencimiento, conservación de datos/fotos, reinicio de CAPTCHA y prevención de envíos simultáneos. [Evidencia](audit/2026-10-06-otp-resend/VALIDATION.md).
- Submit: `extensions.gen_random_bytes` calificado y creación restringida a service_role; setter de ubicación usa `jwt_role` evitando colisión con SQL CURRENT_ROLE. Error visible junto al envío. [Evidencia](audit/2026-10-06-external-submit/VALIDATION.md).
- Lint, tipos y build web pasaron. Diez casos de navegador con CAPTCHA/Edge simulados pasaron; prueba SQL de creación/ubicación y rechazos se revirtió, sin fixtures persistentes. Estas pruebas no acreditan RLS integral entre hogares.
- La confirmación humana posterior acredita un recorrido real de envío y publicación. No se ejecutó una auditoría completa de privacidad, compatibilidad mobile o todos los estados SOS.

### Próximo trabajo recomendado

1. Diseñar e implementar, dentro del alcance documentado, cierre/retiro administrativo de alertas externas publicadas sin depender de una denuncia. Separar cierre con ficha histórica de retiro público; exigir motivo, permiso y auditoría. Aún no implementado ni desplegado.
2. Revisar PET ALERT 8C para gestión mediante token privado: editar, retirar, marcar encontrada y recuperar acceso siguen pendientes; emitir el token no significa que esas acciones existan.
3. Evaluar recuperación idempotente del submit: un fallo posterior al consumo del OTP exige otro código. La corrección actual no cambia esa arquitectura.
4. Continuar Foundation de medios SOS según sus puertas documentadas; no activar flags globales o eliminar originales por haber completado esta prueba.

Para comenzar otro hilo: «Lee AGENTS.md y docs/HANDOFF_NUEVO_HILO.md, prioriza
el estado vigente del 06/10 y conserva los cambios locales anteriores. El flujo
externo ya fue publicado y probado; Baykey ya fue cerrada. Revisa el pendiente
de retiro administrativo antes de proponer el siguiente cambio acotado».

## Contexto histórico anterior (no usar como estado operativo actual)

> Último estado 06/10: web external-submit-20261007, build fdNaUPq3fT3KEH4MgdGuO.
> Corregido error SQL posterior al OTP y setter ubicación mediante migraciones
> 20261007021000/20261007021500, aplicadas. Error visible cerca del envío.
> Usuario aún debe repetir con OTP nuevo para confirmar recibo real. Rollback web
> a otp-resend-20261007. [Evidencia](audit/2026-10-06-external-submit/VALIDATION.md).

> Actualización posterior 06/10: web activa en `/var/www/pet-releases/otp-resend-20261007`,
> build `PEvx_lpapn1SEUyPizbWA`. Añadido reenvío OTP y aviso de vencimiento conservando
> formulario/fotos, con CAPTCHA y límites existentes. Rollback a turnstile-20261007.
> El usuario confirmó Delivered del primer OTP en Resend, pero expiró. Pendiente
> completar el nuevo código y reporte. [Evidencia](audit/2026-10-06-otp-resend/VALIDATION.md).

> Actualización 06/10/2026: supersede los estados web/activación pendientes descritos
> debajo. La candidata SOS sí se activó el 26/09 según su activation.json, pero otra
> copia web posterior carecía de Site Key. Corregido y publicado el 06/10 en
> `/var/www/pet-releases/turnstile-20261007`, build `HEZ2MMH47ygGl7aedGRQp`.
> Admin sigue en `/var/www/pet-ecosystem`; esa ruta conserva rollback web intacto.
> Paso 4 muestra Turnstile; faltan verificación humana y flujo OTP/reporte completo.
> Sin cambios backend, flags de fotos, cron o mobile. Consultar
> [validación reciente](audit/2026-10-06-turnstile/VALIDATION.md) antes de continuar.

Fecha de consolidación: **28 de septiembre de 2026**. Idioma de trabajo y producto: español. Zona de producto/piloto: `America/Panama`.

Este archivo es el punto de entrada resumido del proyecto: producto, arquitectura, reglas, estado operativo, pendientes y fuentes para profundizar. Conserva como historial [HANDOFF.md](HANDOFF.md); no lo reemplaza ni cambia el alcance aprobado. Las referencias relativas funcionan dentro del repositorio.

**Límite de esta entrega:** revisión documental y del repositorio local. No se consultaron servicios remotos, secretos ni datos de usuarios; no se ejecutaron builds, QA funcional, migraciones, despliegues o publicaciones. Los estados remotos de abajo son los últimos registrados en la documentación, principalmente del 26/09, y deben revalidarse antes de operar.

## 1. Resumen para retomar

- Pet Ecosystem reúne una app para dueños de mascotas, una suite para proveedores y un marketplace, con backoffice administrativo. También existen extensiones documentadas de Familias Protectoras/adopción, acceso clínico y PET ALERT.
- Hay implementación funcional y piloto controlado; no es un proyecto de bootstrap. El cierre histórico del MVP no certifica automáticamente las extensiones posteriores ni producción comercial.
- Los pagos siguen en **`payment-ready`**: métodos referenciales y precios de reservas; sin cobro real, liquidación, conciliación o refunds.
- Frente reciente: **Pet Ecosystem SOS**, evolución incremental de PET ALERT. Mantiene cuenta/backend/tablas y ruta pública `/pet-alert`; no se ha lanzado una nueva app ni completado toda la experiencia SOS propuesta.
- El último registro dice que los procesadores Edge SOS están desplegados con WASM, pero la candidata web todavía no se activó. Los nuevos flags de fotos y `ready_only` siguen desactivados.
- El cron de expiración de reservas sigue pendiente, separado del trabajo SOS. La función y restricciones de expiración sí están registradas como aplicadas.
- El working tree tiene trabajo anterior modificado y sin seguimiento. Preservarlo y revisar cada diff antes de cualquier commit o publicación.

## 2. Repositorio y corte local

| Dato | Valor observado el 28/09/2026 |
| --- | --- |
| Directorio | `C:\Users\Ramon Sulvaran\pet-ecosystem` |
| Shell | PowerShell / Windows |
| Rama | `master` |
| HEAD | `8dc13b3901b1f764a12536adc29c772f79dfc51c` |
| Último commit | `chore(sos): record pilot checks and prepare guarded web activation` (26/09) |
| Base de medios SOS/betas | `d64647675a4751194dc3005e6d9e57ddbfac163c` (21/09) |
| Base web/admin activa según último registro | `7c9fabb1e59f2699b47869fa339f9417fa4e47bc` |

No se hizo fetch ni se comprobó origin en esta consolidación. HEAD local, rama remota, release web y versión instalada son estados diferentes.

Antes de crear este archivo había 52 entradas en `git status --porcelain` (las carpetas sin seguimiento pueden agrupar muchos archivos). Entre los cambios rastreados:

- `docs/HANDOFF.md`, `docs/beta-access.md` y `docs/delivery/BOOKING_LIFECYCLE.md`.
- Guías de DigitalOcean e iOS/TestFlight.
- Documentación PET ALERT/mapa y Foundation ready-media, más evidencia de validación.
- `supabase/migrations/20260904170000_pet_alert_map7_admin_geographic_moderation.sql`.

También había skills en `.agents/`, documentación de skills, artefactos y runners de auditoría/releases, `app.json` raíz, un `.docx` de configuración y `docs/delivery/onlyoneaccess.txt` sin seguimiento. No asumir que son basura, archivos listos para Git o insumos que deban adjuntarse al nuevo hilo. No se leyó ni incorporó el contenido de esos archivos potencialmente sensibles. La configuración mobile canónica está en `apps/mobile/app.json`.

La modificación local MAP-7 tiene importancia operacional: el historial registra corrección de `REVOKE` para excluir `anon` antes de aplicar la migración. No restaurar a ciegas el archivo antiguo ni reaplicar el SQL ya registrado. Comparar código e historial cuando se trabaje en ese frente.

## 3. Fuentes de verdad y reglas de trabajo

Leer [AGENTS.md](../AGENTS.md) antes de proponer o modificar código. Su lectura obligatoria incluye:

- [README](../README.md), [visión](vision/PRODUCT_VISION.md) y [blueprint](vision/BLUEPRINT_GENERAL.md).
- [Arquitectura](architecture/ARCHITECTURE.md), [estructura](architecture/REPO_STRUCTURE.md), [setup](architecture/DEVELOPMENT_SETUP.md), [convenciones](architecture/MONOREPO_CONVENTIONS.md), [variables](architecture/ENVIRONMENT_VARIABLES.md), [dominios](architecture/DOMAIN_MAP.md) y [stack](architecture/TECH_STACK.md).
- [Backlog](product/BACKLOG_MASTER.md), [épicas](product/EPICS_AND_STORIES.md), [esquema](data/SUPABASE_SCHEMA.md), [modelo](data/DATA_MODEL.md), [RLS](data/RLS_RULES.md), [API](api/API_CONTRACT.md) y [pantallas](ux/SCREEN_SPECIFICATIONS.md).
- Alcances [MVP](delivery/MVP_SCOPE.md), [V2](delivery/V2_SCOPE.md) y [V3](delivery/V3_SCOPE.md), más el documento de `docs/modules/` correspondiente a la tarea.

Reglas esenciales:

1. Identificar módulo, release y contrato antes de implementar. No abrir V2/V3 por conveniencia mientras exista trabajo MVP prioritario sin estabilizar.
2. Orden base: core → hogares/permisos → mascotas/documentos → salud/recordatorios → discovery → booking/pagos → mensajes/reviews/soporte → proveedores → operaciones → clínica → comercio/farmacia → finanzas/beneficios/telecare.
3. Las ampliaciones ya documentadas no autorizan toda una vertical. Mantener cada entrega pequeña y delimitada.
4. Tipos en `packages/types`; acceso a datos en `packages/api-client`; reglas/configuración reutilizable en `packages/config`; UI compartida en `packages/ui`. No duplicar lógica entre apps.
5. TypeScript estricto, DTO explícito y estados de carga/error/vacío. Evitar componentes gigantes y lógica pesada en UI.
6. RLS, ownership, membresía del hogar y alcance de organización forman parte del diseño. Mutaciones críticas auditadas; no usar el rol visual como autorización.
7. Tablas nuevas: UUID, nombres snake_case, `created_at`, `updated_at` cuando aplique, índices y políticas. No inventar entidades paralelas.
8. Cambios de entidad, API, pantalla, flujo crítico o release requieren actualizar documentación.
9. Separar implementación, validación técnica, migración, despliegue, distribución, instalación y QA funcional. Un paso no demuestra los demás.

Para elegir tareas, el alcance del release prima sobre historias candidatas. Para reconstruir estado operacional, contrastar notas específicas fechadas, evidencias y código: hay secciones históricas que siguen diciendo “local” después de una publicación posterior.

## 4. Producto, actores y navegación

| Actor | Experiencia y autorización |
| --- | --- |
| Visitante | Discovery público, adopciones, perfiles protectores, PET ALERT, ayuda y acceso beta; proyecciones sanitizadas |
| `pet_owner` | Cuenta, hogar, mascotas, expediente/salud, recordatorios, servicios, reservas, mensajes y soporte |
| Miembro de hogar | Permisos del hogar/recurso; ser miembro no equivale a poder editar, reservar o pagar |
| `provider` | Negocios, perfil público, servicios, disponibilidad/capacidad, documentos, reservas y mensajes de su organización |
| `protective_family` | Shell propio de Inicio, Acogida, Publicaciones, Solicitudes y Cuenta; requiere hogar `protective` aprobado para acciones Foster |
| `admin` | Rol provisionado administrativamente; aprobación, soporte, moderación y auditoría según contratos |
| Profesional clínico | Identidad profesional verificada y consentimiento específico vigente; no basta tener rol provider |

Un usuario puede tener varios roles y hogares. El rol activo cambia la experiencia. Los hogares `owner` y `protective` son distintos; no convertirlos implícitamente ni mezclar sus mascotas. Una familia protectora no es automáticamente un negocio comercial.

Rutas web relevantes verificadas en el árbol local:

- `/`: landing; `/app`: experiencia autenticada owner/provider; `/foster`: consola protectora.
- `/adopciones/[slug]`, `/adopciones/[slug]/solicitar`, `/protectoras/[slug]`, `/adoption-invite/[token]`.
- `/pet-alert`, `/pet-alert/mascota-perdida/[slug]`, `/pet-alert/mascota-vista/[slug]`.
- `/pet-alert/reportar-mi-mascota`, `/pet-alert/reportar-mascota-vista` y avistamiento vinculado desde ficha de mascota perdida.
- `/clinical-access/[token]`, `/ayuda`, `/account-deletion`, `/beta` y `/beta/[platform]`.
- Admin es otra app y dominio, no una sección de la consola provider.

UX: conservar mascota activa al navegar; usar hubs y formularios progresivos, copy español y acciones comprensibles. Consultar [arquitectura por rol](ux/ROLE_BASED_SCREEN_ARCHITECTURE.md), [navegación progresiva](ux/PROGRESSIVE_NAVIGATION_MODEL.md), [guía visual](ux/VISUAL_STYLE_GUIDE.md) y [canvas funcional](functional/PET_ECOSYSTEM_CANVAS_FUNCIONAL.md) para detalle transversal.

## 5. Arquitectura y mapa de código

| Bloque | Responsabilidad / entradas |
| --- | --- |
| `apps/mobile` | Expo + React Native; entrada `App.tsx`, features en `src/features`, configuración en `app.json` y `eas.json` |
| `apps/web` | Next.js App Router, páginas en `src/app`, experiencia pública y consolas |
| `apps/admin` | Next.js, backoffice independiente |
| `packages/types/src` | Contratos: `core`, `households`, `pets`, `health`, `reminders`, `bookings`, `operations`, `providers`, `foster`, `clinical-access`, `pet-alert`, `pet-sos`, etc. |
| `packages/api-client/src` | Servicios tipados por dominio sobre Supabase; consultar su `index.ts` antes de crear otro cliente |
| `packages/config/src` | Reglas compartidas, localización, clasificación temporal de reservas y semántica SOS |
| `packages/ui` | Tokens y utilidades/componentes compartidos |
| `supabase/migrations` | Cambios SQL versionados; verificar ledger remoto antes de operar |
| `supabase/functions` | Edge Functions y codec compartido SOS |
| `supabase/tests`, `supabase/scripts` | Regresiones SQL y herramientas operativas acotadas |
| `scripts` | Despliegue y activación; revisar alcance antes de ejecutarlos |
| `docs/audit` | Evidencia fechada, resultados, límites y runners |

Manifiestos actuales: PNPM `9.0.0`, Node `>=20`; mobile declara Expo `^51`, React Native `^0.74` y React `^18.2`; web Next `^14`; Supabase JS `^2.57.2`; MapLibre GL web `5.7.1`. Son rangos/declaraciones del repo, no una certificación de versiones instaladas; usar `pnpm-lock.yaml` para reproducibilidad. No actualizar dependencias como parte incidental de otra tarea.

No hay backend REST dedicado general: los endpoints escritos como `GET/POST` en el contrato representan operaciones tipadas/RPC sobre Supabase. No construir un segundo backend para materializarlos sin una decisión explícita.

## 6. Datos e invariantes que no deben romperse

- Identidad: `auth.users`, `profiles`, `user_roles`, `user_addresses`, `payment_methods`. Direcciones y métodos pertenecen al usuario; no son datos públicos del hogar.
- Hogar/mascota: membresías y permisos gobiernan `pets`, `pet_profiles`, documentos y salud. La mascota es el centro del expediente y `booking` la entidad transaccional principal.
- `in_memory` conserva expediente e historial y bloquea nuevas reservas. Los documentos tienen metadata/vigencia; no inventar bloqueos ni recordatorios automáticos adicionales por vencimiento.
- Archivos privados se representan con bucket/path y acceso temporal controlado. No sustituirlos por URLs externas arbitrarias ni hacer público un bucket para resolver un fallo de permisos.
- Marketplace: organización aprobada y pública, perfil visible y servicio activo/público. Ubicación pública controlada; no exponer dirección del owner ni tracking.
- Booking: hogar + mascota + proveedor + servicio, precio congelado en `booking_pricing`, historial y auditoría. Cupo se verifica dentro de transacción; no confiar en el contador que vio la UI.
- Horarios persistidos UTC/`timestamptz`; reglas del piloto interpretadas en `America/Panama`.
- QR check-in/check-out temporal, de un solo uso y validado por backend; no exponer hashes ni usar `booking_id` plano como autorización.
- Chat limitado a participantes transaccionales; review sobre booking completado y sin duplicado; soporte visible al creador/admin, no automáticamente al proveedor.
- Transferencia Foster conserva `pets.id`. Aprobar solicitud **no** mueve custodia: aceptar la transferencia privada cambia `pets.household_id`. Reservas, chats, soporte y datos privados del hogar anterior no viajan automáticamente. Revisar consentimiento y reglas específicas de documentos antes de modificar transferencia.
- Clinical Access: comprobación de profesional, grant, scopes, consentimiento, vigencia y hogar actual para nuevas escrituras. Atención finalizada y rectificaciones conservan historial append-only.
- SOS: distinguir alerta del dueño, reporte comunitario y reporte externo. No fusionar por parecido ni crear tablas paralelas solo por cambiar el nombre comercial.

## 7. Estado por dominio

Estado documental consolidado; no representa una nueva auditoría funcional.

| Dominio | Implementación y límites para continuar |
| --- | --- |
| Core | Auth, OTP, recovery, perfil, roles, preferencias, direcciones y métodos guardados. Solicitud de eliminación con anonimización/desactivación y retención transaccional; no prometer borrado físico completo |
| Households | Hogares, invitaciones, membresías/permisos y separación owner/protective |
| Pets/documents | Ficha, avatar privado, `in_memory`, documentos, visor y vigencias |
| Health/reminders | Vacunas/alergias/condiciones; estado de vacunas basado en vencimiento; agenda y recordatorios con hora/notificación local. No equivale a push remoto |
| Marketplace/providers | Discovery, negocios, aprobación, perfil, servicios, disponibilidad/capacidad y ubicación pública; ampliaciones Geo parciales |
| Bookings/operations | Instant/aprobación, capacidad/slots, QR y evidencia; expiración y pendientes de cierre. Report card/notas internas siguen como trabajo diferido documentado |
| Messaging/reviews/support | Baseline funcional; avisos in-app no implican notificaciones push con app cerrada |
| Foster/adoption | Extensión V2.5 no financiera: perfil protector, acogida, publicaciones, solicitudes, compromiso documental y transferencia. Embudo público con interés preliminar, invitación, claim/conversión y métricas; no venta ni checkout |
| Foster expenses/donations | Bitácora privada de gastos y contenido de apoyo público documentados; no equivalen a plataforma de pagos/contabilidad |
| Clinical Access | Lectura temporal, identidad profesional, consentimiento granular, atenciones/documentos y auditoría implementados en slices; no es toda la clínica digital |
| PET ALERT/SOS | PET ALERT tiene fichas públicas, comunidad, claims, moderación, fotos, directorio/mapa y reporte externo. Foundation SOS de seguridad/medios avanzada; cierre operativo pendiente |
| Payments | `documented_on_hold`; Wompi Panamá figura como candidato sujeto a validación, no integración activa ni decisión comercial definitiva |
| Travel Passport | Diseño V2 en espera; no implementado ni emisor de certificados oficiales |
| Clínica completa, comercio, farmacia, finanzas, beneficios, telecare | Fuera del baseline comercial actual; no inferir disponibilidad por tablas conceptuales o documentos de visión |

Fuentes de detalle: [estado de módulos](product/MODULE_STATUS.md), [plan de release](product/RELEASE_PLAN.md), [módulos](modules), [pagos](payments/PAYMENTS_DECISION_RECORD.md), [embudo de adopción](product/ADOPTION_PUBLIC_FUNNEL.md), [acceso clínico](modules/clinical_access.md).

## 8. Frente inmediato: Pet Ecosystem SOS

Leer primero [piloto en entorno actual](pet-sos/CURRENT_ENVIRONMENT_PILOT.md), [ready-media](pet-sos/FOUNDATION_1C_READY_MEDIA.md), [validación](audit/2026-09-21-sos-ready-media/VALIDATION.md), [plan SOS](pet-sos/README.md) y [delta comunitario](pet-sos/FOUNDATION_DELTA_ASSESSMENT.md).

### Último estado registrado (26/09)

| Componente | Estado documentado |
| --- | --- |
| Foundation-1A | Corrección de autorización geográfica aplicada; guards null-safe y revocación de ejecución anónima |
| Foundation-1B | Tipos, semántica de presentación y flags; no sustituye autorización backend |
| Foundation-1C.1 | Integridad de claims/moderación y snapshots, aplicada |
| Foundation-1C.2 | Feed público geográfico acotado, aplicado; no certifica toda RLS ni rate limiting |
| Foundation-1C.3 | Saneamiento de medios, derivados, gateway, consentimiento y mantenimiento implementados; cuatro migraciones aplicadas |
| Edge Owner/Community/External | Versiones v1 ACTIVE, desplegadas con WASM |
| Gateway `pet-alert-public-photo` | v2 conservada |
| Correo/CAPTCHA | Secretos registrados como configurados; Site Key en candidata web |
| Auth | Registro/código/login confirmados por usuario; no demuestra OTP/CAPTCHA de reporte externo |
| Fotos | Nuevos flags y `ready_only=false`; sin conversión/limpieza global |
| Inventario observado | Una alerta activa/compartible, cero reportes comunitarios, 31 objetos; cifras históricas, recontar antes de actuar |
| Pruebas del 26/09 | Deno 5 tests/44 pasos y 7 checks HTTP de fronteras negativas; sin prueba remota real completa de fotos |

Migraciones 1C.3 aplicadas según evidencia del 21/09: `20260921120000`, `20260921140000`, `20260921160000` y `20260921180000`. No modificarlas ni reaplicarlas por seguir instrucciones antiguas que dicen “pendiente”.

### Candidata web pendiente

- Directorio: `/var/www/pet-releases/sos-services-d646476`.
- Build: `nOz0xh6TKi0JVHOZnHY03`.
- PM2: `pet-sos-web-candidate`, puerto `3074`; seis rutas HTTP 200 en la revisión registrada.
- Web/admin activos permanecían en `/var/www/pet-releases/sync-7c9fabb`.
- La activación anterior fue rechazada por la política de herramienta antes de ejecutarse; no se encontró `activation.json` en aquella inspección. No afirmar que quedó publicada ni que ese rechazo se ha repetido en este hilo.
- Existe [script de activación acotada](../scripts/activate-sos-web-20260926.mjs), documentado para el operador de esa candidata exacta. No es un deploy genérico ni habilita flags/Supabase. Inspeccionar procesos/release antes de reanudar; no duplicar candidatas.

### Flags que deben coordinarse

| Variable/control | Función |
| --- | --- |
| `NEXT_PUBLIC_PET_ALERT_SANITIZED_UPLOADS` | Subida comunitaria web mediante procesador |
| `EXPO_PUBLIC_PET_ALERT_SANITIZED_UPLOADS` | Equivalente mobile, requiere build compatible |
| `NEXT_PUBLIC_PET_ALERT_READY_MEDIA` | Lectura web/admin por gateway |
| `EXPO_PUBLIC_PET_ALERT_READY_MEDIA` | Gateway y consentimiento de foto Owner mobile |
| `PET_ALERT_OWNER_DERIVATIVES_ENABLED` | Procesador Owner, secreto de servidor |
| `PET_ALERT_PUBLIC_MEDIA_ENABLED` | Gateway público, secreto de servidor |
| `ready_only` | Corte DB hacia medios listos; control separado de los flags |

Un flag no aplica SQL, no procesa fotos y no prueba adopción de clientes. Las betas existentes con flags false no prueban las nuevas acciones de consentimiento.

### Reglas de medios/privacidad

- Consentimiento Owner explícito por alerta; preparar derivados no autoriza publicarlos. Retirar foto conserva avatar privado.
- Solo derivados saneados elegibles, sin EXIF/GPS; sin fallback al original cuando falla gateway/procesamiento.
- Gateway revalida visibilidad y devuelve `404` indistinguible/no-store para contenido no elegible; no entrega URL firmada del original.
- External exige Turnstile + OTP por correo, nace `pending_review` y requiere moderación. No crea usuario Auth automáticamente.
- Conversión histórica community/external y limpieza son herramientas implementadas, no ejecutadas globalmente. Owner queda fuera de conversión masiva.
- Mantenimiento limitado a IDs/versiones revisados; preserva originales y `pet-avatars`. Limpieza usa API Storage, no DELETE SQL de `storage.objects`.
- Retirada no recupera copias descargadas ni invalida retrospectivamente todas las URLs firmadas antiguas.

### Pendientes reales SOS

1. Revalidar estado remoto y activar/verificar candidata conforme al alcance operativo autorizado; conservar rollback.
2. Completar recorrido humano CAPTCHA → OTP → foto → moderación, diferenciándolo de Auth.
3. Validar permisos con sesiones reales entre hogares, Storage, concurrencia y reintentos, runtime/límites de WASM, rendimiento y abuso del gateway.
4. Completar QA Android/iOS de consentimiento, publicación, retirada y errores con builds/flags apropiados.
5. Antes del corte global: respaldo recuperable de DB y objetos, inventario actualizado, cobertura de medios/consentimientos y adopción de clientes. La inspección anterior no encontró backups administrados/PITR; no demuestra ausencia de copias externas ni recuperación certificada.
6. Cerrar Foundation antes de ampliar UX SOS. Foundation-1D sigue sin implementar: gestión privada externa, recuperación/vinculación segura, identidad ligera y asociación opcional a Pet conservando ID/slug.

Decisión de producto para lo siguiente: **ayudar primero, incorporarse después**. Lectura/compartir abiertos; escritura con verificación proporcional, sin forzar hogar o pago. Una sola identidad Auth; `external_reporters` no es otro login. “Resguardada”, “propietario verificado” y “recuperada” son situaciones diferentes. RescueCase, matching IA, heatmaps, predicción y fases posteriores no están implementados por estos documentos.

El usuario había autorizado usar el entorno actual para piloto sin proyecto Supabase QA separado. Eso reemplaza la recomendación histórica de exigir otro staging, pero no acredita QA ni permite borrar datos reales o publicar reportes ficticios. Esta petición de handoff no ejecuta ninguna de esas operaciones.

## 9. Reservas: expiración y cierre

Fuente vigente: [BOOKING_LIFECYCLE.md](delivery/BOOKING_LIFECYCLE.md).

- `pending_approval` vence al llegar `scheduled_start_at`, con reloj servidor; estado nuevo `expired`.
- `confirmed` después de `scheduled_end_at` sigue confirmada y se clasifica como **Pendiente de cierre**. No implica no-show, servicio prestado ni completado automático.
- Clasificación/contadores compartidos y refresco temporal de UI; historial conserva acceso.
- `20260918150000_booking_expiration.sql` aplicada según nota del 20/09: restricciones, barrido y rechazo inmediato de aprobaciones tardías.
- **`20260918150100_booking_expiration_schedule.sql` pendiente** de confirmar actualización/adopción de dispositivos. No activarlo incidentalmente al desplegar SOS.
- `expire_unapproved_bookings()` solo servidor/service role, lotes de 500, locks e historial/auditoría atómicos; el scheduler propuesto es cada minuto.
- El último corte documentado tenía 7 solicitudes vencidas, 19 confirmadas pasadas y 0 expiradas; no es inventario actual ni conjunto exclusivamente QA.
- Futuros resultados “Cliente no asistió”, “Servicio no prestado por proveedor” y avisos 24/72 horas no están implementados en este bloque.

## 10. Releases y distribución

| Superficie | Último estado documentado |
| --- | --- |
| Web | `https://petecosyst.com`, release `sync-7c9fabb`; candidata SOS separada sin activar |
| Admin | `https://admin.petecosyst.com`, mismo release `sync-7c9fabb` |
| Portal beta | `https://petecosyst.com/beta`; no asumir que todos sus enlaces apuntan a la beta SOS más reciente |
| Android SOS | Base `d646476`, EAS `2bafeef4-4274-4907-a8c6-2a060b86b71b`; APK `dist/pilot/android/pet-ecosystem-sos-d646476.apk`; Firebase `4vkg63dqtpkc8`, distribuido al tester existente |
| iOS SOS | `0.3.1 (50)`, EAS `8ffd91c7-68bf-43f9-88dd-f98cf43ab9ef`; submission `8265f178-6782-4db0-a97c-6ef1c18d29d1` FINISHED; Apple VALID e IN_BETA_TESTING en BetaTester |

Las betas SOS mantienen flags nuevos false. No se certificó instalación/QA nativa de esas capacidades. Android conserva numeración heredada `0.0.0 (1)` y requiere normalización antes de tienda; no está publicado en Google Play por estos releases. No repetir builds/submissions por desconocer su estado: consultar IDs existentes.

Infraestructura documentada: DigitalOcean Droplet con PM2/Nginx; comprobar ruta activa, puertos y rollback. La guía App Platform existe, pero no sustituye el estado del Droplet. Documentos: [Droplet](deployment/DIGITALOCEAN_DROPLET.md), [iOS](deployment/IOS_TESTFLIGHT_BETA.md), [Android](deployment/MOBILE_APK_RELEASE.md), [beta SOS](audit/2026-09-21-sos-ready-media/BETA_RELEASE.md), [sync 19/09](audit/2026-09-19-release-sync/RELEASE_SYNC.md), [acceso beta](beta-access.md).

## 11. Validación y deuda conocida

- El MVP tiene PASS históricos de smoke/QA manual; no reutilizarlos como aprobación universal del HEAD o de nuevos slices.
- Auditoría del 17/09: H01–H03 de autorización clínica, H04/H05 de idempotencia/revocación y H06 de capacidad cuentan con correcciones servidor registradas. H07/H08 de layout/hidratación tuvieron correcciones de clientes y releases posteriores; contrastar evidencia de publicación, no quedarse en el estado inicial del informe.
- H06 tuvo pruebas de concurrencia real para capacidad; no extender esa conclusión a excepciones, cambios de horarios/servicios ni a todos los módulos.
- El informe registra 49/110 fichas con evidencia parcial y 61 sin ejecución en una actualización; no significa 49 flujos aprobados integralmente. Faltan recorridos por rol y controles nativos/documentales según matriz.
- Foundation medios registra 28 grupos SQL, 17 pruebas API y 54 pasos Deno en la campaña local del 21/09; la campaña posterior de 5 tests/44 pasos es distinta. No sumar unidades como si fueran cobertura homogénea.
- Persisten bloques SOS `NOT_RUN` de roles/Storage alojados, concurrencia real, dispositivos, operación de medios y carga. Checks HTTP negativos y despliegue WASM no los cierran.
- `corepack pnpm test` no garantiza cobertura de UI: mobile/web tienen scripts que informan que no hay tests configurados. Revisar los scripts de cada workspace.

Fuentes: [auditoría](audit/2026-09-17/INFORME_AUDITORIA.md), [validación medios](audit/2026-09-21-sos-ready-media/VALIDATION.md), [QA Xiaomi parcial](audit/2026-09-18-booking-lifecycle/XIAOMI_NATIVE_QA.md), [matriz piloto](delivery/PILOT_QA_UAT_MATRIX.md).

## 12. Entorno y comandos para desarrollo

Las variables y ubicaciones se documentan en [ENVIRONMENT_VARIABLES.md](architecture/ENVIRONMENT_VARIABLES.md); usar `.env.example` como plantilla. No adjuntar `.env`, claves, tokens, credenciales QA, enlaces privados de gestión ni datos personales a un handoff.

- Web/admin: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` en sus archivos locales.
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `apps/mobile/.env`.
- Operaciones: proyecto/credenciales solo por entorno seguro; service role nunca dentro de variables públicas ni bundles.
- SOS externo: Resend, remitente, pepper OTP, Turnstile secret y allowed origins server-side; Site Key pública en web. SMTP de Auth y correo OTP del reporte externo son circuitos diferentes.
- Smokes: `QA_OWNER_*`, `QA_MEMBER_*`, `QA_PROVIDER_*`, `QA_ADMIN_*` y `SMOKE_ARTIFACT_DIR`. Verificar disponibilidad y alcance actual; evidencia antigua no garantiza cuentas utilizables hoy.

Comandos locales habituales, desde la raíz:

```powershell
git status --short
git log -5 --oneline
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @pet/web build
corepack pnpm --filter @pet/admin build
corepack pnpm --filter @pet/mobile build
git diff --check
```

El build mobile anterior exporta bundles Android/iOS: no genera por sí solo APK/IPA ni instala una app. Elegir checks según el cambio; no ejecutar todos los workflows por una edición documental.

Regresiones específicas disponibles:

```powershell
corepack pnpm --filter @pet/api-client test
node supabase/tests/pet-sos-ready-media.test.mjs
node supabase/tests/pet-sos-location-authorization.test.mjs
node supabase/tests/booking-expiration.test.mjs
```

Consultar los documentos de cada suite para dependencias PGlite/Deno/WASM. Las pruebas con fixtures/mocks no acreditan RLS de producción. Las smokes `smoke:mvp`, `smoke:mvp:critical`, `:admin`, `:providers`, `:health` y `:reminders` usan backend real: revisar runner, entorno y actores antes de ejecutarlas; no tratarlas como comprobaciones locales sin efectos.

## 13. Skills disponibles

Las cuatro skills del repo están disponibles en el catálogo de esta sesión; el directorio figuraba sin seguimiento en Git. Ver [guía](architecture/REPOSITORY_SKILLS.md).

| Skill | Cuándo leerla |
| --- | --- |
| [pet-feature-delivery](../.agents/skills/pet-feature-delivery/SKILL.md) | Implementar/corregir producto |
| [pet-supabase-security](../.agents/skills/pet-supabase-security/SKILL.md) | RLS, RPC, Storage, SQL o autorización |
| [pet-role-qa](../.agents/skills/pet-role-qa/SKILL.md) | Validar flujo/aislamiento por actor con evidencia |
| [pet-release-operations](../.agents/skills/pet-release-operations/SKILL.md) | Preparar/publicar/verificar releases |

Usar solo las pertinentes. No se activó un workflow funcional, de seguridad, QA o release para redactar este documento. Las skills no conceden por sí solas permiso para publicaciones, delegación o comunicación externa.

## 14. Inconsistencias documentales a tener presentes

- README y varios estados globales conservan commits del baseline `v0.1.0` o `v0.3.0`; no son el HEAD ni el release SOS actual.
- Modelo/API/RLS mezclan propuestas, implementación inicial y adendas posteriores. No implementar tablas conceptuales ni reaplicar SQL solo porque una sección antigua dice “propuesto”.
- El runbook SOS ya indica servicios desplegados el 26/09; instrucciones inferiores sobre descargar runtime o desplegar por primera vez son históricas.
- El inventario SOS inicial decía cero alertas; la revisión posterior registra una activa. No suponer ambiente vacío.
- Notas antiguas de reservas dicen dos migraciones pendientes; la actualización del 20/09 deja pendiente solo el scheduler.
- `docs/modules/clinic.md`, `commerce.md` y `telecare.md` contienen encabezados/contenidos cruzados con otros dominios. Verificar alcance contra visión/release/modelo antes de construir esas verticales; esta entrega no corrige esos archivos.
- Hay documentación de datos tanto en `docs/data` como en `supabase/data`; AGENTS señala `docs/data` como lectura canónica. No editar copias divergentes sin revisar su propósito.

Estas diferencias son motivo para contrastar fuentes, no para reescribir masivamente el proyecto en el siguiente hilo.

## 15. Secuencia recomendada para el siguiente hilo

1. Leer este archivo, AGENTS y el canon obligatorio; ejecutar `git status` y revisar cambios del dominio de la tarea.
2. Identificar la petición concreta del usuario. Si desea retomar el último frente, partir del cierre operativo SOS, no de otra feature ni del cron de reservas.
3. Contrastar la última evidencia y, cuando corresponda a la tarea, inspeccionar estado remoto de solo lectura antes de reanudar operaciones.
4. Mantener los cambios previos y distinguir archivos versionados, locales, evidencia y configuración sensible. Preparar commits por alcance, sin `git add .` indiscriminado.
5. Implementar o completar el bloque autorizado con pruebas relevantes, documentación y límites explícitos. No convertir una corrección local en despliegue automático.
6. Actualizar este resumen si cambia HEAD, release activo, flags, migraciones, artefactos, validación o próximo paso; añadir detalle fechado al handoff histórico cuando proceda.

### Texto para iniciar el nuevo hilo

```text
Continúa en C:\Users\Ramon Sulvaran\pet-ecosystem.
Lee AGENTS.md y docs/HANDOFF_NUEVO_HILO.md, después el canon obligatorio y los documentos del módulo correspondiente.
Revisa git status y preserva todos los cambios previos. Distingue el estado local del último estado remoto documentado; no des por ejecutado un despliegue, una migración o QA por aparecer en un plan.
El frente más reciente es Pet Ecosystem SOS: servicios Edge desplegados según el registro del 26/09, candidata web pendiente de activación, flags de fotos y ready_only desactivados, y QA operativo/nativo pendiente. El cron de expiración de reservas sigue separado y pendiente.
Primero reconstruye el punto exacto de continuación y trabaja dentro de esta tarea:
[ESCRIBIR AQUÍ LA TAREA CONCRETA QUE QUIERO CONTINUAR].
```

## 16. Mapa documental para ampliar contexto

| Necesidad | Fuente |
| --- | --- |
| Relato histórico de decisiones y entregas | [HANDOFF](HANDOFF.md) |
| Explicación funcional transversal | [Canvas](functional/PET_ECOSYSTEM_CANVAS_FUNCIONAL.md) |
| Flujos básicos por rol | [Owner](delivery/PILOT_OWNER_QUICK_START.md), [provider](delivery/PILOT_PROVIDER_QUICK_START.md), [admin](delivery/PILOT_ADMIN_QUICK_START.md) |
| Operación de piloto | [Runbook](delivery/PILOT_CONTROLLED_RUNBOOK.md), [hardening](delivery/PILOT_OPERATIONS_HARDENING.md) |
| Datos/API PET ALERT | [Modelo](data/PET_ALERT_DATA_MODEL.md), [contrato](api/PET_ALERT_API_CONTRACT.md), [módulo](modules/pet_alert.md), [mapa](modules/pet_alert_map.md), [externos](modules/pet_alert_external_owner_reports.md) |
| Datos/API adopción | [Modelo](data/ADOPTION_PUBLIC_FUNNEL_DATA_MODEL.md), [contrato](api/ADOPTION_PUBLIC_FUNNEL_API_CONTRACT.md), [Foster](modules/foster_adoption.md) |
| Clínica | [Clinical Access](modules/clinical_access.md), [corrección de permisos](audit/2026-09-17/CORRECCION_CLINICA.md), [reintentos](audit/2026-09-17/CORRECCION_REINTENTOS.md) |
| Privacidad y tiendas | [Inventario](release/PRIVACY_DATA_INVENTORY.md), [readiness](deployment/STORE_READINESS.md), [Google Play](deployment/GOOGLE_PLAY_READINESS.md) |
| Limpieza operativa | [Runbook](delivery/PRODUCTION_DATA_CLEANUP_RUNBOOK.md); consultar no autoriza ejecutar borrados |
| Diseño visual web | [Skin](ux/PROFESSIONAL_WEBSITE_SKIN.md), [QA visual](ux/PROFESSIONAL_SKIN_QA.md) |

El repositorio y sus evidencias siguen siendo necesarios para continuar desarrollo. Este documento transporta contexto y decisiones; no contiene credenciales ni sustituye los contratos completos o la inspección del código de la tarea.
