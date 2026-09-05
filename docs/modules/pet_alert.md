# Modulo PET ALERT

## Estado

`slice_7a_community_photos_applied`

PET ALERT esta documentado como frente independiente para mascotas perdidas/vistas. Slice 1A de tablas, RLS, tipos y API owner esta aplicado remoto. Slice 2 agrega en mobile owner el recorrido guiado `Mi mascota se perdio`. Slice 3 agrega ficha publica web sanitizada y formulario de avistamiento protegido por sesion. Slices 4, 5, 6, 7A y 7B estan aplicados remoto. Notificaciones remotas todavia no existen.

## Alcance aprobado para diseno

- Flujo owner desde una mascota registrada.
- Flujo comunitario desde una observacion.
- Avistamientos, claims controlados, historial y moderacion.
- Paginas publicas compartibles con proyecciones seguras.

## Fuera de alcance inicial

- push masivo o por proximidad;
- tracking y ubicacion continua;
- mapa de calor o matching automatico;
- pagos/recompensas;
- declaracion de abandono;
- transferencia de mascota/custodia;
- mezcla con Foster/adopcion.

## Documentos relacionados

- `docs/product/PET_ALERT.md`
- `docs/ux/PET_ALERT_UX.md`
- `docs/data/PET_ALERT_DATA_MODEL.md`
- `docs/api/PET_ALERT_API_CONTRACT.md`
- `docs/release/PET_ALERT_RISKS.md`

## Slice 2 mobile owner

- Entrada contextual desde la ficha de una mascota owner activa.
- Cuatro pasos: ultimo avistamiento, zona aproximada, descripcion publica y vista previa.
- Contacto interno por defecto, sin GPS, mapa ni direccion exacta.
- Guardado de borrador y publicacion por 30 dias mediante las RPC existentes.
- Estado activo con compartir texto seguro, refrescar avistamientos y marcar encontrada.
- No aparece en hogares protectores ni mascotas `in_memory`.

## Slice 5 reclamo y contacto controlado

- Una persona autenticada puede indicar que reconoce una mascota de un reporte comunitario.
- El claim exige una sena privada, consentimiento de contacto y aplica rate limit server-side.
- Solo existe una solicitud activa por usuario/reporte y una aprobada por reporte.
- El autor del reporte revisa en mobile y decide aprobar o rechazar.
- El contacto del reportante solo se proyecta al reclamante despues de aprobar.
- No cambia ownership, no transfiere custodia y no mezcla PET ALERT con Foster.

## Proximo slice

Aplicar y validar Slice 6 antes de abrir historial en expediente o integracion QR no destructiva.

## Pet Alert 8 - propietario externo (diseno)

- Se diseno el reporte de mascota extraviada por una persona no registrada, sin habilitar escritura anonima todavia.
- La decision recomendada reutiliza `pet_alert_lost_pets` como boletin canonico y separa contacto, OTP y acceso privado en entidades no publicas.
- Publicar exigira correo verificado; esto no equivale a validar propiedad.
- El reporte externo reutilizara directorio, ficha publica, avistamientos, moderacion, media y QR actuales.
- La implementacion queda condicionada a seleccionar correo transaccional, CAPTCHA y politica legal de retencion.
- Diseno completo: `docs/modules/pet_alert_external_owner_reports.md`.

## Slice 6 admin y moderacion

- Usuarios autenticados reportan contenido con motivo estable y detalle opcional.
- Solo admin consulta la cola completa y registra decisiones justificadas.
- Admin puede pausar, restaurar o cerrar publicaciones y rechazar claims conflictivos.
- Cada decision queda en historial y `audit_logs`.
- No cambia ownership, custodia ni `pets.household_id`.

## Slice 3 ficha publica

- `/pet-alert/mascota-perdida/[slug]` muestra exclusivamente el DTO publico sanitizado.
- La ficha expone foto publica controlada, descripcion, zona aproximada, fecha, senas, comportamiento y nota medica explicitamente publica.
- Nunca muestra `household_id`, coordenadas, direccion, contacto privado ni expediente.
- `/pet-alert/mascota-perdida/[slug]/avistamiento` exige sesion autenticada antes del envio.
- El contacto del reportante solo se comparte si marca consentimiento explicito.
- El owner comparte desde mobile el enlace real de la ficha publica.

## Slice 4 reporte comunitario

- Nueva entidad separada `pet_alert_community_sightings`; no crea `pets`, hogares, adopciones ni transferencias.
- Solo usuarios autenticados publican y pueden cerrar sus reportes; el backend limita a tres altas por hora.
- Mobile owner ofrece `Vi una mascota perdida` desde Inicio, con reporte manual sin GPS, mapa ni direccion exacta.
- `/pet-alert` lista DTOs sanitizados; `/pet-alert/reportar-mascota-vista` crea con sesion y `/pet-alert/mascota-vista/[slug]` muestra la ficha compartible.
- La base del Slice 4 no cargaba fotos; Slice 7A las agrega sin exponer identidad/contacto del reportante. Escritura anonima sigue diferida.
## Slice 7A fotos comunitarias

- El reportante autenticado puede tomar una foto o elegirla de la galeria antes de publicar.
- Cada reporte admite cero a tres imagenes JPG, PNG o WebP; el reporte sigue siendo valido sin fotos.
- Los archivos viven en el bucket privado `pet-alert-media` y la metadata en `pet_alert_community_sighting_media`.
- Mobile y web usan URLs firmadas temporales. La visibilidad hereda el estado y moderacion del reporte.
- No se solicita GPS y la UI advierte que no deben fotografiarse personas, placas ni domicilios.

## Slice 7B centro comunitario publico

- `/pet-alert` unifica la consulta publica en tres vistas: `Extraviadas`, `Mascotas vistas` y `Encontradas`.
- La proyeccion publica se obtiene exclusivamente mediante `list_public_pet_alert_directory`; no abre lectura directa de tablas sensibles.
- Permite buscar por nombre, especie, raza o zona, filtrar por ciudad/especie y paginar resultados.
- Cada resultado enlaza a su ficha publica existente. No cambia reportes, claims, moderacion, ownership ni custodia.
- No expone usuario, household, coordenadas, contacto privado, direccion exacta ni identificadores internos.
- Las fotos comunitarias se resuelven mediante una proyeccion RPC sanitizada y URLs firmadas; un reporte sin media conserva un estado explicito sin imagen.
- Las alertas de mascotas owner usan como portada el avatar actual del perfil mediante URL firmada temporal, sin duplicar archivos ni publicar el bucket completo.
- El directorio encuadra cada portada completa dentro de un marco uniforme y evita recortes destructivos ante distintas proporciones de imagen.
- Las portadas se resuelven tambien en navegadores anonimos: las policies de Storage validan el objeto publico mediante helpers acotados y no dependen de una sesion autenticada.
- La ficha publica owner genera un QR estable hacia su slug y carteles PNG para impresion o redes; no crea tracking, URLs alternas ni datos publicos adicionales.

## PET ALERT MAP-2 - base geografica segura

- La ubicacion confirmada permanece privada y la publicacion usa un punto generalizado independiente.
- La generalizacion ocurre en servidor con desplazamiento estable de 250 a 500 metros.
- La lectura publica no devuelve IDs internos, contacto, ownership ni coordenadas privadas.
- No hay todavia mapa visual, solicitud de GPS ni geocodificacion.
- Migracion remota aplicada: `20260904130000_pet_alert_map2_secure_locations.sql`.

## PET ALERT MAP-3 - captura Owner Mobile

- El permiso de ubicacion se solicita solamente al pulsar la accion correspondiente.
- La captura requiere confirmacion y puede descartarse antes de guardar.
- Negar el permiso no bloquea el reporte textual existente.
- El cliente envia solo la coordenada privada al setter autenticado de MAP-2; el servidor decide el punto publico.
- La seleccion manual cartografica permanece diferida hasta contar con proveedor productivo.

## PET ALERT MAP-4 - reporte externo Web

- El propietario sin cuenta puede capturar opcionalmente la ubicacion foreground desde un navegador compatible.
- La captura requiere confirmacion; denegarla o descartarla conserva el flujo textual.
- La Edge Function valida nuevamente el dato y usa el setter seguro de MAP-2 con `service_role`.
- El reporte permanece en moderacion y solo puede aparecer en el mapa despues de ser aprobado.
- No se exponen coordenadas privadas en respuestas, logs o contratos publicos.

## PET ALERT MAP-5 - comunidad y avistamientos

- Reportes comunitarios Mobile/Web admiten ubicación opcional confirmada y publican solo el punto generalizado.
- Avistamientos ligados a una alerta admiten ubicación privada confirmada, sin marcador público individual.
- Rechazar geolocalización no bloquea ciudad, referencia ni descripción.
- Un fallo del setter posterior no provoca reintentos que dupliquen el evento ya creado.

## PET ALERT MAP-6 - mapa publico Web

- El directorio permite alternar entre Lista y Mapa sin perder filtros.
- El mapa consume solo coordenadas publicas generalizadas, agrupa puntos y abre una ficha compacta hacia el boletin.
- Los eventos sin punto confirmado siguen disponibles exclusivamente en Lista.
- La URL del estilo MapLibre es configurable y el fallo cartografico conserva el directorio operativo.

## PET ALERT MAP-7 - moderacion geografica Admin

- Platform Admin consulta una cola geografica separada con coordenada privada sensible y punto publico generalizado.
- Puede ocultar, restaurar o regenerar el punto publico con justificacion obligatoria.
- Regenerar ocurre en servidor; Admin nunca selecciona manualmente el punto publico.
- Las decisiones quedan auditadas sin coordenadas y no modifican el contenido ni estado del boletin.
