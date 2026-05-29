# UX_AUDIT.md

## Auditoria UX/UI consolidada

Fecha: 2026-05-29

Alcance revisado:

- Documentacion canonica: `docs/HANDOFF.md`, `docs/delivery/MVP_SCOPE.md`, `docs/product/MODULE_STATUS.md`, `docs/api/API_CONTRACT.md`, `docs/api/ENDPOINTS_BY_MODULE.md`, `docs/data/SUPABASE_SCHEMA.md`, `docs/data/DATA_MODEL.md`, `docs/ux/SCREEN_SPECIFICATIONS.md`.
- Codigo revisado: `apps/mobile`, `apps/web`, `packages/ui`, `packages/api-client`, `packages/types`.
- Modulos auditados: autenticacion, perfil/cuenta, hogares, mascotas, documentos de mascota, salud, recordatorios y navegacion general.

Restricciones respetadas:

- No se modifico codigo funcional.
- No se modifico base de datos.
- No se modificaron contratos API.
- No se ejecutaron migraciones ni `supabase db push`.

Metodo:

- Revision estatica de documentacion y componentes.
- No sustituye una QA con dispositivo/navegador grabada.
- Los hallazgos se priorizan por impacto en piloto controlado y riesgo de confusion de usuario real.

## Resumen ejecutivo

La aplicacion ya tiene una base funcional amplia y operativa para piloto controlado. La deuda principal no es de capacidad funcional sino de experiencia: algunos flujos todavia exponen mensajes tecnicos, varios componentes concentran demasiada responsabilidad, algunos estados dependen de requery/polling no siempre visible para el usuario, y los formularios de cuidado de mascota pueden sentirse densos en pantallas pequenas.

No se detecta un bloqueo critico unico que impida continuar piloto, pero si hay hallazgos altos que conviene resolver antes de escalar usuarios: autenticacion/recovery, rol posterior al registro, compuerta de hogar, persistencia de contexto mascota/hogar y consistencia de estados operativos.

## Tabla consolidada de hallazgos

Ordenada por severidad y prioridad sugerida.

| ID | Modulo | Severidad | Tipo | Flujo | Problema resumido | Prioridad |
|---|---|---:|---|---|---|---:|
| AUTH-001 | Auth | Alto | Funcional | Recovery / OTP | El recovery y los deep links pueden fallar o abrir una pantalla no util si el enlace se consume fuera del contenedor correcto. | P0 |
| AUTH-002 | Auth | Alto | Texto/UX Writing | Login / Registro | Errores tecnicos de Supabase pueden llegar al usuario sin traduccion operativa. | P0 |
| PROF-001 | Perfil | Alto | Procedimental | Roles | No hay camino self-service claro para agregar un rol nuevo despues del registro. | P0 |
| HH-001 | Hogares | Alto | Procedimental | Primer uso owner | La compuerta de hogar existe, pero el copy y la jerarquia todavia pueden sentirse internos/tecnicos. | P0 |
| PET-001 | Mascotas | Alto | Funcional | Contexto mascota | El contexto de mascota depende de coordinacion entre shell y workspaces; riesgo de perdida de foco al navegar. | P0 |
| PET-003 | Mascotas | Alto | Procedimental | En memoria | Una mascota `En memoria` conserva historial, pero se requiere una regla visual mas clara de gestion controlada. | P1 |
| NAV-001 | Navegacion | Alto | Arquitectura | Shell mobile/web | Los shells y workspaces concentran muchos estados, aumentando riesgo de inconsistencias de navegacion. | P1 |
| AUTH-003 | Auth | Medio | Procedimental | Acceso web/mobile | Mobile abre login por defecto; web mantiene patrones historicos de registro/acceso mas densos. | P1 |
| AUTH-004 | Auth | Medio | Accesibilidad | Formularios auth | Controles custom no siempre declaran `accessibilityLabel`, rol o hints. | P1 |
| PROF-002 | Perfil | Medio | Procedimental | Cuenta | Perfil, preferencias, direcciones y pagos referenciales compiten en el mismo espacio. | P1 |
| PROF-003 | Perfil | Medio | Texto/UX Writing | Metodos guardados | Los metodos guardados pueden interpretarse como pagos reales si el copy no se mantiene consistente. | P1 |
| HH-002 | Hogares | Medio | Texto/UX Writing | Invitaciones/permisos | Permisos `view/edit/book/pay/admin` no se traducen a consecuencias claras. | P1 |
| HH-003 | Hogares | Medio | Accesibilidad | Permisos | Switches de permisos no explican impacto ni destino. | P2 |
| HH-004 | Hogares | Medio | Funcional | Contexto hogar | El hogar activo no siempre aparece como contexto global persistente en todos los modulos. | P1 |
| PET-002 | Mascotas | Medio | Visual | Hub mascotas | La compactacion visual puede reducir legibilidad y area tactil. | P2 |
| PET-004 | Mascotas | Medio | Funcional | Documentos | La gestion documental requiere mejor feedback de carga, vista/descarga y recuperacion de error. | P1 |
| PET-005 | Mascotas | Medio | Texto/UX Writing | Ficha mascota | Estados como `Verificado` deben estar respaldados por dato real o cambiar a copy neutral. | P2 |
| HEALTH-001 | Salud | Medio | Procedimental | Salud por mascota | La navegacion por vacunas/alergias/condiciones oculta detalles; necesita senales mas claras. | P1 |
| HEALTH-002 | Salud | Medio | Funcional | Vacunas -> Recordatorios | La relacion entre proxima vacuna y recordatorio no queda visible para el usuario. | P1 |
| HEALTH-003 | Salud | Medio | Accesibilidad | Date pickers | El icono `+` en selectores de fecha no comunica claramente que abre calendario. | P2 |
| REM-001 | Recordatorios | Alto | Funcional | Home / Mascotas / Recordatorios | Los recordatorios deben aparecer consistentemente en resumen, ficha de mascota y modulo dedicado. | P0 |
| REM-002 | Recordatorios | Medio | Procedimental | Mascota En memoria | Crear/posponer recordatorios para mascotas `En memoria` requiere politica visible. | P1 |
| REM-003 | Recordatorios | Medio | Funcional | Fecha/hora | La normalizacion de fechas puede confundir por timezone si no se comunica. | P2 |
| REM-004 | Recordatorios | Medio | Texto/UX Writing | Notificaciones | No se distingue claramente recordatorio in-app vs push/notificacion externa. | P2 |
| NAV-002 | Navegacion | Medio | Visual | Menu por rol | Etiquetas y nombres cambian entre mobile/web (`Cuenta`, `Perfil`, `Estado`, `Publicacion`). | P2 |
| NAV-003 | Navegacion | Medio | Accesibilidad | Bottom nav | Iconos y botones compactos requieren etiquetas accesibles y hit targets consistentes. | P1 |
| NAV-004 | Navegacion | Medio | Funcional | Requery / estados | La actualizacion de estados depende de mezcla de polling, requery y refresh manual. | P1 |
| NAV-005 | Navegacion | Bajo | Visual | Sistema UI | Hay estilos duplicados fuera de `packages/ui`, lo que complica consistencia visual. | P3 |
| NAV-006 | Navegacion | Medio | Procedimental | Usuarios duales | Usuarios con dos roles pueden necesitar mejor confirmacion de contexto activo. | P2 |
| PROFILE-004 | Perfil | Bajo | Accesibilidad | Formularios cuenta | Validaciones de formularios no siempre se anuncian de forma accesible. | P3 |
| HEALTH-004 | Salud | Bajo | Texto/UX Writing | Salud base | Terminos medicos y estados pueden simplificarse para usuarios no tecnicos. | P3 |

## Lecturas por modulo

- Auth: `docs/UX_AUDIT_AUTH.md`
- Perfil: `docs/UX_AUDIT_PROFILE.md`
- Hogares: `docs/UX_AUDIT_HOUSEHOLDS.md`
- Mascotas y documentos: `docs/UX_AUDIT_PETS.md`
- Salud: `docs/UX_AUDIT_HEALTH.md`
- Recordatorios: `docs/UX_AUDIT_REMINDERS.md`
- Navegacion: `docs/UX_AUDIT_NAVIGATION.md`

## Recomendacion de ejecucion

1. Resolver P0 antes de ampliar piloto: auth/recovery, mensajes tecnicos, rol nuevo, compuerta de hogar, contexto mascota y consistencia de recordatorios.
2. Agrupar P1 en slices pequenos por modulo, sin tocar backend salvo que el hallazgo lo exija.
3. Antes de cualquier refactor de shell/navegacion, capturar una matriz de smoke manual owner/provider/admin con dispositivo real.
