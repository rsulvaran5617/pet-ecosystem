# Pet Ecosystem · Canvas funcional

Documento integral por roles, funciones y canales · Versión 1.0 · 16 de septiembre de 2026

## 01 · Alcance y lectura del documento

Este canvas reúne el funcionamiento de Pet Ecosystem para usuarios, negocios y operación de plataforma. Incluye Mobile, Web pública, Web autenticada y Admin. Sirve como mapa de producto, catálogo funcional y guía de recorridos; las fichas describen entrada, acciones, resultado y reglas de cada capacidad.

**Base de revisión:** repositorio local en rama `master`, commit `1352e4c272d1475520a0409ad32e336967c343b0`. Se contrastaron documentación de producto, módulos, contratos, tipos compartidos, rutas y componentes actuales. Fecha de corte: 16/09/2026. No se consultaron cuentas de usuarios ni datos productivos para elaborar este documento.

**Interpretación del estado:** «Implementada» significa que existe capacidad funcional en el código revisado. No certifica que el último binario, despliegue web o esquema remoto estén actualizados. «Condicionada» identifica una dependencia operativa o una limitación explícita. «Planificada» identifica alcance documental sin experiencia completa implementada. La matriz de pendientes al final conserva estas diferencias.

**Criterio para resolver contradicciones:** se prioriza el comportamiento actual de componentes y contratos para describir lo que el usuario puede hacer; las notas de cierre más recientes precisan evolución y despliegue. Los párrafos históricos de diseño permanecen como antecedentes. Por ejemplo, el handoff dice que MAP-8 estaba pendiente de commit, pero el HEAD local ya contiene ese cambio. No se verificó sincronización remota ni publicación de producción.

**Alcance funcional completo:** identidad, hogares, mascotas, documentos, salud, recordatorios, marketplace, reservas, ejecución de servicios, mensajería, reseñas, soporte, proveedores, acogida/adopción, gastos de acogida, PET ALERT, acceso clínico y administración. Las verticales futuras también se enumeran en una sección separada, sin presentarlas como disponibles.

### Convenciones del canvas

| Marca | Significado |
| --- | --- |
| M | Aplicación Mobile Android/iOS; los permisos y capacidades nativas dependen del binario y dispositivo. |
| W | Web; se especifica si es pública, Owner, Provider, Foster o clínica. |
| A | Web Admin, protegida por permisos de plataforma. |
| Implementada | Presente en el repositorio; disponibilidad remota no comprobada en esta revisión. |
| Condicionada | Código existente con despliegue, configuración, verificación o QA pendiente identificado. |
| Planificada | Definida como evolución; no forma parte de los recorridos disponibles descritos. |
| S01–S20 | Referencias de trazabilidad del capítulo 15. |

El rol activo organiza la experiencia. El permiso efectivo depende además del hogar, organización, participación en la reserva, autoría o consentimiento. Adoptante, reportante y profesional son actores funcionales; no todos constituyen un rol global adicional.

## 02 · Canvas general del ecosistema

| Bloque | Propósito | Funciones principales | Resultado |
| --- | --- | --- | --- |
| Propietario y hogar | Centralizar el cuidado de mascotas propias. | Cuenta, miembros, mascotas, expediente, salud, recordatorios, servicios, reservas y seguimiento. | Información compartida dentro del hogar y continuidad del cuidado. |
| Proveedor comercial | Publicar y operar servicios. | Negocios, perfil público, servicios, horarios/cupos, documentos, solicitudes, atención y mensajes. | Oferta visible tras aprobación y reservas gestionadas. |
| Familia protectora | Gestionar acogida y adopción responsable. | Identidad aprobada, acogida, expediente privado, gastos, publicaciones, solicitudes, compromisos y transferencias. | Adopción trazable conservando la identidad de la mascota. |
| Adoptante | Conocer mascotas y completar una adopción. | Vitrina, interés público, invitación, solicitud formal, compromiso y aceptación de custodia. | Mascota incorporada al hogar receptor por consentimiento. |
| Comunidad PET ALERT | Ayudar ante pérdidas y avistamientos. | Boletines, fotos, carteles QR, aportes, reclamos, contacto controlado, lista y mapa aproximado. | Información útil con privacidad y moderación. |
| Profesional de salud animal | Consultar y anexar información autorizada. | QR temporal, identificación, verificación, solicitud de permisos, atención, documentos y rectificación. | Historial profesional atribuible que conserva los registros originales. |
| Plataforma/Admin | Tomar decisiones y atender incidentes. | Aprobaciones, moderación Foster/PET ALERT, verificación profesional, auditoría limitada y soporte. | Control de publicación, seguridad y trazabilidad. |
| Visitante público | Conocer el producto y contenido compartible. | Landing, ayuda, beta, protectoras, adopciones y PET ALERT. | Descubrimiento sin acceso al expediente privado. |

### Relaciones que gobiernan el producto

Una cuenta puede participar en varios contextos. El hogar familiar agrupa mascotas propias; el hogar protector agrupa acogida. La organización proveedora agrupa oferta comercial. Una reserva conecta hogar, mascota, organización y servicio. Una publicación de adopción conecta mascota y protectora. El boletín PET ALERT describe un evento y no otorga propiedad. El consentimiento clínico conecta una mascota, un profesional, acciones concretas y una vigencia.

**Fronteras esenciales:** los importes de reserva no son pagos cobrados; una aprobación de adopción no transfiere custodia; un QR clínico no concede escritura; una organización aprobada no acredita a un veterinario; un reclamo PET ALERT no demuestra propiedad; una foto privada no se vuelve pública por existir en el expediente.

## 03 · Canales, navegación y actores

| Actor | Mobile | Web | Admin |
| --- | --- | --- | --- |
| Visitante | Bienvenida, registro y acceso. | Landing, ayuda, beta, páginas públicas de adopción y PET ALERT. | Sin acceso. |
| Propietario | Inicio, Mascotas, Buscar, Reservas, Mensajes y Cuenta. Salud, Docs y Recordatorios dentro del contexto de mascota; adopción y PET ALERT desde Inicio. | `/app`: Panel, Hogar, Mascotas, Salud, Agenda, Buscar, Reservas, Mensajes y Cuenta. | Sin acceso por ser propietario. |
| Miembro del hogar | Mismas superficies Owner limitadas por permisos. | Gestión del hogar y mascotas conforme a permisos. | Sin acceso. |
| Proveedor | Inicio, Negocio, Servicios, Horarios, Reservas, Mensajes, Estado y Cuenta. | `/app` en modo Provider: panel multinegocio y secciones operativas. | No utiliza Admin para operar su negocio. |
| Familia protectora | Inicio, Acogida, Publicaciones, Solicitudes y Cuenta. | `/foster`: Panel, Perfil, Mascotas, Publicaciones, Solicitudes y Transferencias; interés público separado. | Solo plataforma revisa sus solicitudes. |
| Adoptante | Modo Owner, discovery de adopción, solicitudes, documentos e invitaciones de mascota. | Descubrimiento e interés inicial público; página puente de invitación. | Sin acceso. |
| Profesional | El Owner gestiona consentimiento; no hay consola clínica profesional nativa equivalente. | `/clinical-access/[token]`: lectura y panel profesional autenticado. | Plataforma verifica identidades. |
| Administrador | No se identifica un backoffice nativo equivalente. | Aplicación web separada de administración. | Inicio, Proveedores, Familias protectoras, PET ALERT, Profesionales, Soporte y Manual admin. |

### Inventario de entradas web

| Ruta | Audiencia y función |
| --- | --- |
| `/` | Presentación pública del producto y accesos principales. |
| `/app` | Registro/acceso y consola autenticada según rol activo Owner o Provider; derivación de Foster a su consola. |
| `/foster` | Operación de familias protectoras autenticadas y alta de hogar protector. |
| `/ayuda` | Manual público para propietarios, proveedores, protectoras y adoptantes. |
| `/account-deletion` | Explicación pública de solicitud de eliminación de cuenta. |
| `/beta` | Selección de acceso Android, iPhone o Web. |
| `/beta/android`, `/beta/ios`, `/beta/web` | Redirección a destinos configurados; no inventa un enlace si falta configuración. |
| `/protectoras/[slug]` | Presentación pública de una protectora aprobada y sus publicaciones. |
| `/adopciones/[slug]` | Ficha pública de una mascota en adopción. |
| `/adopciones/[slug]/solicitar` | Interés inicial público, previo al proceso formal en Mobile. |
| `/adoption-invite/[token]` | Puente de invitación para continuar en la app Owner. |
| `/pet-alert` | Centro comunitario: Extraviadas, Mascotas vistas y Encontradas; Lista/Mapa. |
| `/pet-alert/reportar-mi-mascota` | Reporte externo con correo verificado, fotos y moderación. |
| `/pet-alert/reportar-mascota-vista` | Alta comunitaria con sesión. |
| `/pet-alert/mascota-perdida/[slug]` | Boletín público de mascota extraviada y cartel QR. |
| `/pet-alert/mascota-perdida/[slug]/avistamiento` | Aporte de avistamiento, protegido por sesión. |
| `/pet-alert/mascota-vista/[slug]` | Ficha comunitaria, galería y reclamo controlado. |
| `/clinical-access/[token]` | Consulta sanitaria temporal y experiencia profesional. |
| Admin `/` | Entrada de la app Admin; no comparte permisos con `/app`. |

## 04 · Cuenta y funciones compartidas

Canvas del actor: cualquier persona autenticada. Objetivo: entrar, identificar su contexto y administrar datos personales. Canales: M/W, con diferencias indicadas. Estado general: implementada. Fuentes: S01, S02, S03.

### C01 · Registro con intención de uso

**Entrada y datos:** correo, contraseña, nombre/apellidos y elección de propietario, proveedor o familia protectora. En Mobile la intención no se preselecciona y se confirma la contraseña.

**Recorrido y resultado:** crear cuenta → verificar correo cuando corresponda → entrar al modo elegido. El Owner continúa con hogar y primera mascota; la protectora con su hogar y solicitud; el proveedor con su organización.

**Reglas y excepciones:** correo existente, contraseñas incompatibles o datos incompletos requieren corrección. Crear cuenta no aprueba un negocio, no verifica un profesional y no aprueba una protectora.

### C02 · Inicio, cierre y recuperación de sesión

**Canales:** M/W; Admin tiene acceso separado. El usuario introduce correo y contraseña, inicia sesión y accede a su contexto. Cerrar sesión termina el acceso del dispositivo. La recuperación solicita correo y permite establecer contraseña dentro de una sesión de recuperación válida.

**Resultado y excepciones:** acceso recuperado sin crear otra cuenta; enlace inválido, vencido o sesión expirada exige repetir el acceso correspondiente. Mobile atiende el enlace de recuperación de la app.

### C03 · Confirmación por código y reenvío

**Canales:** M/W. El usuario introduce correo y OTP recibido por email; puede solicitar reenvío controlado. Web muestra «Confirmar código» como opción visible y conduce allí después del registro, conservando el correo.

**Reglas:** el campo web acepta seis dígitos y autocompletado compatible. Código vencido/incorrecto y límite de solicitudes generan un mensaje accionable; la UI no evita las restricciones del proveedor de identidad.

### C04 · Perfil y pasos de cuenta

**Canales:** M/W. Consultar y editar datos personales disponibles y revisar tareas de cuenta. En Mobile, los pasos pendientes abren acceso, perfil, preferencias, roles, direcciones o métodos guardados.

**Resultado:** información personal actualizada. Las secciones colapsables reducen contenido visible sin eliminar funciones. Completar un dato de perfil no cambia autorizaciones de hogares ni de organizaciones.

### C05 · Roles y cambio de modo

**Canales:** M/W. Consultar roles disponibles y activar el contexto deseado. Una persona puede tener más de un rol, pero usa uno activo para organizar la experiencia.

**Reglas:** Owner, Provider y Familia protectora tienen recorridos propios. La habilitación efectiva depende del flujo de cuenta y los roles asignados. El rol Admin se provisiona administrativamente. Cambiar de modo no transforma hogares, mueve mascotas ni concede permisos clínicos.

### C06 · Preferencias personales

**Canales:** M/W. Consultar y modificar preferencias de comunicaciones, recordatorios por correo y push modeladas en el perfil.

**Límite:** guardar una preferencia expresa intención; no demuestra que exista un servicio de envío remoto. Las notificaciones locales de recordatorios son una capacidad Mobile separada.

### C07 · Direcciones personales

**Canales:** M/W. Crear o editar dirección, destinatario, etiqueta Casa/Trabajo/Otro, ciudad, región, país y campos postales; seleccionar dirección predeterminada según el formulario.

**Reglas:** pertenecen a la persona, no al hogar ni al perfil público del negocio. No se publican en mapas, adopciones o PET ALERT. El marketplace no obtiene automáticamente coordenadas de estas direcciones.

### C08 · Métodos guardados como referencia

**Canales:** M/W. Registrar referencia de tarjeta con marca, últimos cuatro dígitos, titular y vencimiento; elegir la predeterminada. Seleccionarla en una reserva es opcional y existe la opción sin tarjeta.

**Resultado y límite:** se conserva una referencia operacional. No se realiza autorización, captura, transferencia, devolución o liquidación. No se documenta como una billetera ni como tarjeta tokenizada para cobrar.

### C09 · Solicitud de eliminación de cuenta

**Canales:** acción desde M > Cuenta; W pública `/account-deletion` explica el proceso y canal manual. El usuario revisa consecuencias y confirma la solicitud.

**Resultado:** el flujo documentado anonimiza datos personales aplicables, desactiva roles/métodos y bloquea acceso futuro; conserva historial transaccional necesario para operación y auditoría. No equivale a borrar físicamente todas las reservas, conversaciones, reseñas o expedientes compartidos.

### C10 · Ayuda y acceso beta

**Canales:** W pública, accesible desde navegador móvil. `/ayuda` organiza guías por rol. `/beta` ofrece Android, iPhone y Web cuando existe destino configurado; los accesos no disponibles muestran una alternativa informativa.

**Reglas:** el manual administrativo permanece protegido. La existencia de configuración para TestFlight no prueba que haya un enlace público activo; el estado de distribución se valida operativamente.

## 05 · Propietario y miembros del hogar

Canvas del actor: `pet_owner` y miembros autorizados de hogares `owner`. Objetivo: cuidar mascotas propias y contratar servicios. Canales: M/W Owner. Estado: implementada, salvo condiciones expresas. Fuentes: S02–S09, S17.

### O01 · Inicio contextual y mascota activa

Mobile prioriza un siguiente paso: registrar primera mascota, atender una reserva, revisar recordatorio, completar foto o buscar servicios según el contexto. El usuario selecciona mascota y conserva esa selección al consultar ficha, salud, documentos, recordatorios y preparar una reserva. Si pierde acceso a esa mascota, se limpia el contexto. Web ofrece un panel y navegación por sección. Los resúmenes reflejan información cargada, no una garantía de ausencia de pendientes fuera de esa consulta.

### O02 · Crear, seleccionar y consultar hogares

**Entrada:** sesión Owner y nombre del hogar. Crear o aceptar un hogar precede al alta de la primera mascota. Listar hogares y abrir miembros, permisos e invitaciones.

**Resultado y reglas:** se crea un hogar familiar separado del protector. Se pueden mantener varios hogares. Un mismo hogar no opera simultáneamente como familiar y protector; ambos contextos requieren hogares distintos.

### O03 · Invitar y aceptar miembros

El administrador del hogar introduce el correo de una cuenta existente y los permisos previstos. El destinatario consulta invitaciones, acepta o rechaza. Aceptar permite entrar al cuidado compartido con los permisos asignados; rechazar no concede membresía. Este flujo base no constituye una invitación por correo a una persona todavía inexistente en el sistema.

### O04 · Administrar permisos del hogar

El miembro administrador consulta integrantes y modifica permisos básicos: ver, editar, reservar, pagar y administrar. Debe mantenerse al menos un administrador. Ver no autoriza editar; pertenecer al hogar no convierte a todos sus miembros en participantes del chat de una reserva. El permiso de pagar es parte del modelo; los cobros reales siguen sin implementarse. No hay permisos granulares por mascota en el baseline.

### O05 · Registrar y editar mascotas

**Datos:** hogar, nombre, especie, raza opcional, sexo, fecha de nacimiento opcional, esterilización y notas. M/W permiten crear, consultar y editar con permiso de edición o administración.

**Resultado:** expediente identificado por la misma mascota durante su ciclo de vida. La fecha de ingreso a acogida se reserva al hogar protector; no debe confundirse con nacimiento ni con fecha de creación. Los campos de fecha opcionales vacíos se normalizan sin inventar fechas.

### O06 · Foto de perfil

M permite cámara o galería con permiso del dispositivo; W permite seleccionar archivo. El usuario revisa el encuadre y carga o reemplaza el avatar. La imagen se sirve mediante acceso temporal controlado. Una alerta pública Owner puede reutilizar ese avatar si se cumplen sus reglas de publicación; esto no abre los demás archivos del expediente.

### O07 · Estado «En memoria» y reactivación

Desde la gestión de mascota se puede pasar entre activa y En memoria. Se conserva perfil, documentos, salud e historial. La experiencia separa consulta histórica de acciones operativas y bloquea reservas nuevas para mascotas En memoria. Reactivar cambia el estado, sin crear otra mascota. No es una operación de borrado físico.

### O08 · Cargar y clasificar documentos

**Datos:** archivo, título y tipo: cartilla/registro de vacunación, registro médico, identidad, seguro u otro. Se requiere permiso de edición/administración.

**Resultado:** el documento pertenece al expediente privado de la mascota y aparece en su grupo. No se publica por subirlo. Salud puede reutilizar un documento de vacunación como sticker o soporte, evitando una biblioteca paralela.

### O09 · Ver, corregir, reemplazar y eliminar documentos

M/W permiten abrir archivo con enlace temporal, editar título/tipo/vigencia, reemplazar un archivo erróneo o eliminar con confirmación. Mobile previsualiza imágenes y abre PDF/otros formatos con el visor compatible. Un enlace vencido exige obtener otro. Estas correcciones de documentos Owner no equivalen a editar anexos clínicos profesionales finalizados.

### O10 · Vigencia documental

El usuario indica si el documento vence, fecha de emisión, vencimiento y ventana de aviso. La ficha muestra documentos vencidos, por vencer o con fecha pendiente según sus datos. Se puede corregir vigencia sin cambiar el archivo; no se acepta vencimiento anterior a emisión en la validación Mobile. El estado documental es informativo y no bloquea automáticamente reservas ni sustituye la próxima dosis de una vacuna.

### O11 · Resumen de salud

Desde una mascota, consultar vacunas, alergias y condiciones. Las condiciones críticas reciben énfasis. El resumen de vacunas distingue Al día, Por vencer, Vencida, Revisar o Sin registro según fechas y datos; tener una vacuna cargada no basta para afirmar que todo está al día. No se trata de un diagnóstico automático.

### O12 · Vacunas y soporte de aplicación

M/W permiten listar, registrar y editar vacuna, fecha de aplicación, próxima dosis y notas. La próxima dosis no debe ser anterior a la aplicación. Con próxima fecha, el sistema integra el recordatorio correspondiente. Mobile permite adjuntar foto/PDF del sticker, abrirlo y editar su vigencia documental. Cambiar la vigencia del archivo no cambia por sí mismo las fechas clínicas.

### O13 · Alergias y condiciones

Los miembros con permisos de edición registran y corrigen alergeno/reacción/notas y condiciones con nombre, estado, fecha diagnóstica, criticidad y notas. Los miembros de lectura consultan el resumen. Medicación avanzada, laboratorios e incidentes no se presentan como módulos Owner completos por existir entradas o documentos profesionales.

### O14 · Recordatorios y calendario

Crear un recordatorio para hogar o mascota con título, fecha y detalle; consultar pendientes, completados y calendario; completar o posponer. Mobile organiza «Próximo cuidado» y pendientes por fecha. Inicio y ficha consumen el resumen de la mascota. La agenda de recordatorios no integra automáticamente todos los eventos de reserva; el seguimiento de citas permanece en Reservas.

### O15 · Hora y notificación local

**Canal:** M. Al elegir una hora explícita y una fecha futura, el dispositivo puede programar una notificación local si el permiso está concedido. Completar cancela la notificación local vinculada; posponer reprograma o cancela según el nuevo dato.

**Límites:** no es push remoto ni sincroniza alarmas entre dispositivos. Denegar permiso no impide conservar el recordatorio. Repetición, urgencia y anticipación configurable quedan fuera del alcance actual.

### O16 · Buscar proveedores y servicios

M/W Owner ofrecen texto, categorías y filtros disponibles de ciudad/especie u origen aproximado. Abrir una card muestra perfil público, servicios y ubicación publicada. Solo participan proveedores aprobados con organización, perfil y servicios publicables/activos. Buscar conserva hogar y mascota para continuar. No hay favoritos, cotización, ranking avanzado o recontratación automática completos en el alcance actual.

### O17 · Ubicación y mapa de proveedores

La ubicación es la que el negocio decide publicar. Se puede seleccionar un origen de zona/ciudad controlada para distancia aproximada cuando está disponible. Mobile incluye una vista de mapa de proveedores con alternativa de lista.

**Estado condicionado:** es una capacidad de piloto; debe revisarse el proveedor de estilo productivo. No hay seguimiento continuo ni permiso GPS implícito para el Owner. Es un mapa diferente del mapa público PET ALERT y no hereda sus reglas de generalización.

### O18 · Consultar horarios y preparar reserva

Seleccionar proveedor → servicio → «Ver horarios»/cupos → día y franja → continuar a Reservas. Mobile despliega horarios dentro del servicio. Se preservan servicio, hogar, mascota y franja seleccionada; el usuario completa solo lo pendiente. W también permite consultar franjas publicadas y continuar con contexto. Consultar o previsualizar un horario no lo reserva.

### O19 · Revisar y confirmar reserva

**Datos:** hogar autorizado, mascota activa, servicio, horario y método referencial opcional. El resumen muestra proveedor, mascota, fecha/hora, precio, moneda, modo de confirmación y política de cancelación.

**Resultado:** confirmar crea reserva y snapshot de precio. Un servicio inmediato queda Confirmado; uno sujeto a aprobación queda Pendiente. La confirmación valida cupo en servidor; si otro usuario tomó el último, se informa y se elige otra franja. El flujo de disponibilidad anterior permanece como alternativa de piloto cuando corresponde. No se procesa pago.

### O20 · Historial, detalle y seguimiento

M/W permiten listar y filtrar reservas y abrir detalle con estado, participantes, servicio, precio y cambios disponibles. Mobile prioriza activas y siguiente paso; W permite desplegar historial. Los cambios se refrescan mediante los mecanismos existentes de consulta y actualización. La pantalla debe informar error/carga sin confundirlos con ausencia de reservas.

### O21 · Cancelar dentro de política

Abrir una reserva cancelable, revisar la política e indicar el motivo solicitado. El sistema valida ventana y permiso, registra cancelación y conserva historial. Fuera de plazo, la acción se rechaza con explicación. Cancelar no genera una devolución automática porque no hay cobro real. Reprogramar y repetir reserva no son acciones implementadas equivalentes.

### O22 · QR de llegada y salida

**Canal principal:** M Owner. En una reserva confirmada, generar QR temporal de llegada; el proveedor lo escanea y registra check-in. Después se ofrece QR de salida para check-out. El QR consumido deja de mostrarse como acción pendiente.

**Reglas:** código de un solo uso, vigencia corta y reserva/organización validada. Un QR vencido o ajeno no sirve. La familia genera el código, pero la operación la registra el proveedor. Este QR no es el QR clínico ni el cartel PET ALERT.

### O23 · Consultar evidencia del servicio

Mobile muestra el timeline y permite abrir documentos de actividad de la reserva propia mediante enlace temporal. La consulta no autoriza cargar, editar o borrar evidencia del proveedor. La evidencia documenta la actividad y no sustituye el check-in/check-out. La lectura Owner de evidencia está documentada como habilitada; no se afirma paridad de visor QR/evidencia en Web Owner sin una pantalla equivalente comprobada.

### O24 · Conversaciones con proveedor

M/W: abrir Mensajes o el chat asociado a una reserva; leer y enviar texto. Mobile tiene bandeja por actividad y conversación desplegable; desde Reservas abre solo el hilo correspondiente.

**Reglas:** cada reserva crea su hilo; solo reservante y propietario de la organización proveedora participan. No es chat libre con cualquier negocio ni chat de soporte. No incluye archivos ni contador persistente canónico de no leídos. Los avisos existentes son dentro de la app abierta, no push remoto.

### O25 · Reseñar un servicio completado

M/W: desde una reserva completada, el usuario que la hizo puede enviar puntuación de 1 a 5 y comentario. Solo se admite una reseña por reserva. El proveedor involucrado puede verla. Pendientes, confirmadas y canceladas no son elegibles. No se promete rating público agregado, respuesta pública del proveedor, fotos, recompensas o moderación avanzada.

### O26 · Abrir y seguir soporte

M/W: desde una reserva autorizada, registrar asunto y descripción; consultar el caso, estado y resolución. El baseline admite un caso por reserva. Admin lo revisa y actualiza; el proveedor no se incorpora automáticamente al caso. Soporte no es disputa financiera, conversación en vivo ni canal general sin reserva.

### O27 · Acceso sanitario temporal e historial profesional

M > Salud permite generar y compartir QR/enlace por una hora, un día o una semana; consultar su vigencia y revocarlo. Solo se mantiene un acceso de lectura activo por mascota. El Owner con edición/admin revisa solicitudes profesionales, aprueba alcances solicitados, rechaza o revoca. M/W > Salud consultan el historial profesional con autor, organización, atención, entradas, documentos y rectificaciones. El detalle profesional se describe en el capítulo 10.

### O28 · Badge del icono Mobile

La app recalcula el contador local usando datos operativos cargados. Owner incluye reservas pendientes/confirmadas, recordatorios pendientes vencidos o próximos siete días e invitaciones de hogar. Provider cuenta pendientes del negocio cargado; Foster usa invitaciones y estado de su perfil protector. Cerrar sesión limpia el contador. Android depende del launcher; no constituye un contador global garantizado ni incluye mensajes no leídos o todas las solicitudes Foster.

## 06 · Proveedor comercial

Canvas del actor: propietario de una organización proveedora, rol `provider`. Objetivo: publicar una oferta y ejecutar reservas. Canales: M Provider y W `/app` Provider. Estado: implementada con extensiones de piloto. Fuentes: S07, S08, S09.

### P01 · Inicio y selección de negocio

Consultar estado operativo, pendientes y siguiente acción; seleccionar el negocio que se va a administrar. El usuario solo opera organizaciones propias. La Web incorpora panel multinegocio; Mobile ofrece su consola y selección de negocio. Cambiar organización debe cambiar sus servicios, horarios, documentos y reservas, evitando operaciones en el contexto anterior.

### P02 · Crear y editar negocio

Registrar datos de la organización y completar perfil de negocio. La consola conserva el estado de aprobación y permite corregir datos maestros. Tener un negocio creado no lo hace público. Varias organizaciones administradas por una persona no equivalen a un módulo de staff, sucursales y permisos corporativos completo.

### P03 · Perfil público y avatar

Configurar presentación visible, datos de contacto y contenido del perfil; cargar o reemplazar foto/logo controlado. La visibilidad efectiva exige aprobación de organización y configuración pública coherente. La foto pública del negocio es independiente de los documentos privados de aprobación. Un perfil sin contenido requerido, servicios o publicación puede quedar fuera del descubrimiento.

### P04 · Ubicación pública declarada

M/W permiten definir nombre del lugar, dirección pública opcional, ciudad/región/país, precisión y visibilidad; coordenadas manuales están disponibles como configuración. Mobile puede precargar aproximación de una ciudad soportada. El negocio decide qué ubicación publicar. No se copia la dirección personal del usuario ni se activa GPS continuo.

### P05 · Catálogo de servicios

Crear y editar servicio con nombre/descripción, categoría, precio/moneda, duración cuando aplica, modo inmediato o sujeto a aprobación, ventana de cancelación y estado activo/público. El servicio pertenece a una organización. Desactivar u ocultar modifica oferta futura, conservando reservas e importes históricos. La categoría veterinaria es comercial y no acredita a la persona para escribir en un expediente clínico.

### P06 · Disponibilidad semanal y capacidad

M/W: elegir servicio, día, hora de inicio/fin, capacidad y estado de una regla. Consultar y editar las reglas existentes. W ofrece agenda semanal compacta y consulta de cupos calculados. Se requieren intervalos coherentes y capacidad positiva entera en reglas activas. Los horarios de capacidad usan el contexto operacional de Panamá. El inventario por recursos/staff y la UI completa de excepciones por fecha no se dan por implementados solo por existir un diseño o tabla.

### P07 · Documentos de aprobación

Subir documentos del negocio y consultar los cargados. En W se encuentran dentro de la edición del negocio; M los vincula con Estado/aprobación. Admin puede abrirlos para decidir. Los archivos son evidencia privada de revisión, no publicaciones del marketplace. El baseline no implementa un proceso de aprobación individual para cada documento del proveedor.

### P08 · Estado y checklist de publicación

Consultar aprobación y pendientes de negocio, perfil, visibilidad, servicios, horarios/cupos, ubicación y documentos. Las tarjetas conducen a la sección que permite resolver cada pendiente. El checklist presenta datos existentes, pero no sustituye la aprobación de plataforma ni garantiza visibilidad si otras reglas fallan.

### P09 · Reservas entrantes y decisiones

Consultar reservas del negocio por Pendientes, Confirmadas, Completadas o Canceladas; abrir detalle de servicio, mascota, cliente, hogar, horario e importe referencial. Aprobar una pendiente la confirma; rechazarla se registra como cancelación con motivo dentro del modelo vigente. La decisión afecta el cupo según reglas del servidor. No existe un estado canónico independiente «rejected» en `BookingStatus` actual.

### P10 · Llegada y salida del servicio

**Mobile:** abrir reserva confirmada y escanear QR Owner para llegada/salida. El sistema valida uso, vigencia, reserva, organización y secuencia. **Web:** ver timeline y ejecutar controles manuales disponibles como alternativa de piloto.

**Resultado:** registro operacional de check-in/check-out. El estado operacional no sustituye el estado comercial de la reserva; completar la cita es una acción distinta. No hay rastreo del recorrido de la mascota.

### P11 · Evidencia documental posterior

M/W permiten cargar evidencia de actividad una vez registrado check-out. Queda asociada a reserva y autor y se muestra en timeline. Los archivos se consultan mediante accesos temporales; no se aceptan enlaces externos arbitrarios como equivalente al archivo controlado. Report card y notas internas completas siguen pendientes; su presencia en documentos de diseño no implica UI disponible.

### P12 · Completar reserva

Desde una reserva confirmada propia, marcar Completada cuando corresponde. El historial registra el cambio y habilita la elegibilidad de reseña del cliente. El importe puede alimentar estadísticas operacionales, pero no demuestra que se haya cobrado. La pantalla no debe equiparar check-out o finalización con liquidación financiera.

### P13 · Mensajes y avisos en consola

M tiene acceso a conversaciones de reservas; W abre el chat dentro del acordeón de cada cita. Enviar y recibir texto entre cliente y responsable del negocio. Web muestra avisos de solicitudes pendientes y mensajes entrantes mientras está abierta; el CTA selecciona negocio, reserva y conversación correctos. Realtime/consultas de respaldo actualizan la información. No hay notificación web o móvil remota garantizada con la app cerrada.

### P14 · Panel multinegocio e indicadores

**Canal destacado:** W. Consultar comparativo por negocio, reservas, pendientes, preparación de publicación, servicios, capacidad/ocupación y ranking global de servicios. Los importes por completadas, pendientes/confirmadas o cancelaciones son estimaciones derivadas de reservas. No son ingresos conciliados, dinero recibido ni pagos por liquidar. Las cifras dependen de los datos consultados y no sustituyen contabilidad.

### P15 · Eliminar configuraciones creadas por error

**Canal comprobado:** W. Eliminar un servicio sin reservas históricas o un negocio sin historial de reservas, chats, reseñas y soporte; confirmar la acción. La operación valida autoría y trazabilidad. Cuando existe actividad, se bloquea el borrado y corresponde ocultar/desactivar. No se ofrece el borrado de historial transaccional como limpieza cotidiana.

## 07 · Familia protectora, rescate y acogida

Canvas del actor: rol `protective_family`, hogar `protective` y perfil protector aprobado para la operación restringida. Objetivo: cuidar, publicar y entregar mascotas de forma responsable. Canales: M Foster y W `/foster`. Fuentes: S10, S11, S12.

### F01 · Crear familia y solicitar aprobación

Seleccionar intención Familia protectora → crear hogar protector separado → completar nombre visible, tipo de organización, ubicación y contexto → enviar a revisión. M guía Identidad, Ubicación, Contexto y Enviar; W permite alta cuando no existe familia. Borrador, En revisión, Aprobada, Rechazada y Suspendida determinan el siguiente paso. Elegir el rol no concede por sí solo permiso de publicación o transferencia.

### F02 · Inicio y gestión por contexto

M muestra progreso Familia → Revisión → Mascotas → Publicar → Adoptar y accesos contextualizados. W ofrece selector de familia y secciones de trabajo. La consola distingue falta de sesión, falta de hogar, revisión pendiente y familia aprobada. Un usuario dual conserva separados sus hogares familiares y protectores.

### F03 · Perfil público de la protectora

Preparar nombre visible, misión, historia, ciudad/país, necesidades y política de contacto. Guardar borrador y enviar a revisión pública. La aprobación interna de la familia y la aprobación de su perfil público son decisiones distintas. Cambios publicables de un perfil aprobado pueden devolverlo a borrador/no público hasta nueva revisión. No se publican dirección exacta o notas internas por defecto.

### F04 · Logo, redes y apoyo declarado

M/W permiten gestionar logo del perfil público; W incluye enlaces sociales y contenido de apoyo declarado. El público solo ve los datos autorizados en un perfil aprobado y público. El apoyo puede describir canales externos o instrucciones declaradas por la organización. No procesa ni verifica donaciones, no genera comprobante fiscal y no condiciona la aprobación de adopción. Las cards de mascotas mantienen estos detalles fuera del resumen principal.

### F05 · Registrar mascotas bajo acogida

Dar de alta mascota en el hogar protector activo, cargar foto interna y registrar fecha real de ingreso a acogida además de datos básicos. Cuando falta la fecha, se informa; no se infiere desde la creación del registro. Registrar no publica una adopción. El expediente reutiliza la mascota canónica y se mantiene separado de mascotas propias del modo Owner.

### F06 · Expediente privado de acogida

Consultar y corregir documentos con permisos del hogar protector. W los agrupa dentro del acordeón de mascota y permite cargar, abrir, editar datos/vigencia, reemplazar y eliminar; M reutiliza Docs y las capacidades de mascota autorizadas. Salud y recordatorios disponibles se mantienen privados en el contexto de la mascota. La foto interna y documentos no se convierten automáticamente en galería pública ni historia publicable.

### F07 · Gastos de acogida

M/W: registrar fecha, categoría, título, importe/moneda y descripción; opcionalmente comercio, método declarado, comprobante y control interno de reembolso/apoyo. Editar o eliminar errores. Consultar total acumulado, mes, cantidad y categorías.

**Categorías:** alimento, veterinaria, medicamentos, vacunación, desparasitación, esterilización, transporte, higiene, accesorios, documentación, emergencia y otro. Son gastos privados documentales; no pagos procesados, contabilidad fiscal ni gastos públicos de adopción.

### F08 · Comprobantes de gastos

Vincular un documento privado existente al gasto. W también permite subir un comprobante desde su formulario y seleccionarlo automáticamente. El archivo se conserva en el expediente privado de la mascota. Un gasto sin comprobante puede mantenerse según el formulario; un comprobante no debe aparecer en `/adopciones/[slug]`. No se afirma una pantalla Mobile de subida directa idéntica a la Web.

### F09 · Preparar ficha de adopción

Crear borrador separado de la mascota y completar historia, personalidad, salud pública resumida, requisitos, compatibilidad y ubicación general. El flujo guiado conduce hacia fotos y revisión de responsabilidad. La persona selecciona qué información sanitaria es publicable; no comparte automáticamente diagnósticos privados o archivos del expediente.

### F10 · Galería, portada y publicación responsable

Agregar hasta ocho fotos, elegir portada y gestionar imágenes propias de publicaciones editables. Una protectora aprobada publica ficha y fotos bajo responsabilidad, con moderación posterior. Agregar una foto a una ficha publicada no exige despublicar toda la mascota.

**Reglas:** los mínimos visibles de calidad incluyen historia, personalidad, salud pública, requisitos, ubicación y una foto. Estos guardrails de calidad se documentan como controles de cliente. No se incluye video operativo por existir el tipo `video` en el modelo.

### F11 · Pausar, cerrar y consultar historia

Pausar permite retirar temporalmente una publicación. Cerrar exige los criterios de calidad definidos en la UI y no sustituye un cierre de adopción por transferencia. Publicaciones Cerradas/Adoptadas se muestran como lectura histórica. W ofrece «Ver historia» con familia adoptante, solicitud, transferencia y eventos disponibles. La publicación no puede usarse para reescribir una adopción concluida.

### F12 · Bandeja de interés público

**Canal:** W Foster. Revisar solicitudes ligeras recibidas desde la ficha pública; consultar datos, pasar a revisión, preseleccionar o rechazar/descartar con el proceso permitido. Está separada de solicitudes formales. Un interés no reserva mascota ni abre transferencia. Los datos de interesados permanecen privados para operación autorizada.

### F13 · Invitar a continuar en la app

**Canal:** W Foster. Desde el interés seleccionado, generar enlace temporal, copiarlo y compartirlo manualmente. La página puente orienta a Mobile Owner. Se controla destinatario, vigencia y revocación/reemisión. No se implementó envío automático por email/SMS en este slice; generar un enlace no prueba que la persona lo recibió ni crea solicitud formal.

### F14 · Evaluar solicitudes formales

M/W: bandeja filtrable por mascota/estado y detalle del solicitante. Revisar convivencia, experiencia, motivación y otros campos; avanzar Enviada → En revisión → Entrevista → Aprobada, o rechazar con nota. Conservar historial de cambios y respuesta respetuosa. Las aprobadas pendientes de transferencia se destacan. Aprobar todavía no mueve custodia.

### F15 · Compromiso documental

La familia configura una plantilla privada y, cuando corresponde, exige compromiso antes de transferir. El adoptante descarga, firma y carga el documento; la protectora lo revisa. W obtiene enlaces frescos para abrir la plantilla. Si está configurado como obligatorio, la UI espera revisión antes de habilitar transferencia. Es intercambio/revisión de documento; no se presenta como firma electrónica certificada ni validación jurídica automática.

### F16 · Cierre responsable y transferencia

Revisar checklist de cierre, solicitud aprobada y compromiso si se requiere; iniciar invitación privada al receptor. También existe transferencia privada de custodia desde familia autorizada sin que toda invitación nazca del embudo público. El receptor debe aceptar en su hogar Owner. Solo entonces cambia la custodia; si está vinculada a adopción, se actualizan solicitud y publicación. Rechazo/cancelación/vencimiento no completan la adopción.

### F17 · Seguimiento de transferencias y custodia

Consultar salientes, estado e historial autorizado; cancelar pendientes cuando corresponde. La mascota conserva identidad y expediente permitido. No viajan automáticamente reservas, conversaciones, pagos, soporte ni recordatorios futuros del hogar anterior. Gastos y comprobantes de acogida no se exponen como información pública del adoptante. El cierre conserva atribución y eventos.

### F18 · Panel y embudo de adopción

**Canal destacado:** W Foster. Consultar mascotas, publicaciones, solicitudes, entrevistas, aprobadas pendientes, transferencias, calidad documental y gastos privados disponibles. «Mascotas entregadas» cuenta mascotas únicas con transferencia aceptada. El embudo público agrega 90 días de vistas/acciones y conversiones derivadas de transacciones. No es seguimiento individual público ni prueba causal de que una visita produjo una adopción.

## 08 · Adoptante y visitante interesado

Canvas del actor: visitante que pasa a Owner para formalizar adopción. Objetivo: conocer, solicitar y recibir una mascota. Canales: W pública y M Owner. Estado: implementada en los slices existentes. Fuentes: S10, S12.

### D01 · Conocer una protectora y sus mascotas

W `/protectoras/[slug]` muestra nombre, logo, misión/historia, ubicación general, mascotas publicadas y datos de contacto/redes/apoyo autorizados. Si el perfil no es público/aprobado, no se abre su información privada. La página no da acceso a gastos, comprobantes, solicitantes, documentos o direcciones exactas.

### D02 · Explorar una mascota en adopción

M Owner > Inicio > Mascotas que buscan hogar y W `/adopciones/[slug]` muestran ficha, galería, historia, personalidad, salud pública, requisitos, compatibilidad y protectora responsable. Mobile permite ampliar y recorrer fotos. Compartir la ficha no reserva la mascota. Una adopción cerrada puede conservar vista histórica de lectura con el estado correspondiente.

### D03 · Enviar interés inicial público

W `/adopciones/[slug]/solicitar` captura datos básicos de contacto, interés y consentimiento con validación, prevención de duplicados y controles antiabuso. Mostrar confirmación no significa solicitud formal aprobada. La familia revisa este interés en su bandeja privada. No crea una mascota, hogar o transferencia.

### D04 · Abrir invitación y continuar en Mobile

Abrir el enlace compartido por la protectora; la página puente dirige a la app. Mobile conserva el contexto durante registro/login. El claim exige sesión cuyo correo coincida con el destinatario y un hogar familiar. Una invitación inválida, revocada o vencida no se puede reutilizar. Si no hay mascota propia, la continuación de adopción evita bloquearse en el onboarding de primera mascota.

### D05 · Presentar solicitud formal

En M Owner, completar formulario estructurado de convivencia, experiencia, motivación y datos solicitados. El nombre/correo se precargan desde el perfil. Enviar sobre una publicación elegible; se evitan solicitudes activas duplicadas. La conversión desde invitación es idempotente, de modo que repetir la continuación no debe crear dos solicitudes.

### D06 · Seguir o retirar solicitud

Consultar estado y respuesta de la protectora. Enviada, En revisión, Entrevista, Aprobada, Rechazada y Retirada comunican avance. Retirar una solicitud activa no transfiere ni elimina la mascota. La aprobación muestra que falta la transferencia; no debe interpretarse como mascota ya incorporada al hogar.

### D07 · Compromiso de adopción

Cuando la familia lo solicita, descargar plantilla privada, completar y firmar fuera del sistema según instrucciones y cargar el documento firmado. Esperar revisión y corregir lo solicitado. El archivo no se expone en la ficha pública. El requisito depende de la configuración protectora; no todas las adopciones exigen el mismo documento.

### D08 · Aceptar o rechazar transferencia

M > Cuenta > Invitaciones de mascota permite revisar una transferencia pendiente y elegir hogar receptor autorizado. Aceptar actualiza custodia de forma transaccional, conserva la mascota y abre su ficha como contexto activo. Rechazar deja la entrega sin completar. Esta aceptación constituye el paso operativo de cierre; no se sustituye por email, interés público, claim PET ALERT o aprobación de solicitud.

## 09 · Comunidad y PET ALERT

Canvas de actores: propietario registrado, propietario externo, observador, reclamante y visitante. Objetivo: difundir y aportar información ante pérdida o avistamiento. Canales: M Owner, W pública/autenticada; moderación en A. Fuentes: S13, S14, S15.

### T01 · Centro público y filtros

W `/pet-alert` permite alternar Extraviadas, Mascotas vistas y Encontradas; buscar texto, filtrar ciudad/especie, paginar y abrir boletín. Las portadas muestran imágenes públicas autorizadas, con alternativa sin foto. El acceso público no devuelve contactos privados, integrantes del hogar, expediente ni identificadores internos operativos.

### T02 · Reportar pérdida de mascota registrada

**Canal:** M, desde mascota propia activa. «Mi mascota se perdió» abre último avistamiento → zona → descripción pública → vista previa. Guardar borrador y publicar con vigencia de 30 días mediante el flujo existente. Usar datos públicos revisados y contacto interno por defecto. No aparece para mascota En memoria o del hogar protector.

### T03 · Administrar la alerta propia

Consultar alerta activa, compartir su enlace, refrescar avistamientos y marcar Encontrada con motivo/cierre disponible. El boletín tiene ciclo de vida y vigencia, conserva trazabilidad y no elimina expediente. La revisión de pistas permite seguimiento de la familia; los estados modelados adicionales no implican matching automático.

### T04 · Reportar mascota propia sin cuenta

**Canal:** W `/pet-alert/reportar-mi-mascota`. Describir mascota y extravío, adjuntar de una a cuatro fotos, indicar contacto privado y consentimientos, superar CAPTCHA, verificar código recibido por correo y enviar.

**Resultado:** boletín pendiente de revisión humana; no crea cuenta ni publica por verificar email. **Estado condicionado:** requiere configuración de correo/Turnstile y despliegue de la función externa. El primer slice emite token privado, pero recuperación, edición, retiro, cierre autónomo y vinculación posterior a cuenta siguen pendientes de 8C. No se presentan como acciones disponibles.

### T05 · Ficha y cartel compartible

W muestra foto, nombre/descripción, estado, zona aproximada, fecha, señas y datos explícitamente públicos. El cartel incluye QR estable al boletín, versión para redes y PNG de proporción A4 para impresión. Compartir archivo usa soporte del navegador o descarga alternativa. No contiene contacto privado, coordenadas exactas o expediente; el QR no realiza seguimiento de escaneos.

### T06 · Aportar avistamiento a una alerta

**Canal:** W con sesión. Desde «Tengo información»/formulario de avistamiento, introducir zona, observación y contacto solo con consentimiento. La información se vincula al boletín para el seguimiento autorizado, sin abrir los datos privados del Owner al colaborador. Una ubicación opcional confirmada queda privada y no se convierte en marcador público individual.

### T07 · Reportar mascota vista en la comunidad

**Canales:** M Owner > Inicio y W con sesión. Introducir rasgos de la mascota, zona, referencia y observación; adjuntar cero a tres fotos opcionales en formatos admitidos. Publicar genera un reporte independiente, no una mascota registrada ni una adopción. El límite documentado es tres altas por hora por usuario. No se afirma abandono ni propiedad por haber visto o resguardado al animal.

### T08 · Gestionar reportes propios

En la experiencia comunitaria Mobile se consultan reportes propios/recientes, se revisan solicitudes recibidas y se puede cerrar el caso con motivo, por ejemplo reunida, salió del área o duplicado. El cierre cambia el seguimiento del evento; no mueve custodia ni entrega el expediente de otra persona.

### T09 · Reconocer una mascota y solicitar contacto

**Canal de reclamo:** W con sesión, ficha comunitaria. Indicar señal privada para demostrar conocimiento y consentir contacto; enviar claim. Solo puede existir una solicitud activa por usuario/reporte y una aprobada por reporte. El reclamante consulta En revisión, Contacto autorizado o No aprobada. La plataforma no emite una prueba de propiedad.

### T10 · Revisar reclamos y liberar contacto

**Actor:** autor del reporte, principalmente M. Revisar señal privada y aprobar o rechazar el claim. Solo tras aprobación se muestra el contacto autorizado al reclamante. Se conserva historial; no cambia hogar, dueño o custodia de una mascota. Si existe conflicto, corresponde moderación; no se resuelve por un botón de transferencia Foster.

### T11 · Confirmar ubicación opcional

**Canales:** M pérdida Owner/comunidad; W reporte externo, comunidad y avistamiento ligado. Pulsar uso de ubicación, conceder permiso si se desea, confirmar que corresponde al evento o descartar. Negar/fallar GPS mantiene el ingreso textual.

El dato exacto queda privado. Para boletines publicables, el servidor genera un punto estable desplazado entre 250 y 500 metros. No hay captura en segundo plano, ubicación continua, geocodificación silenciosa ni selección manual de punto en mapa implementada en estos formularios. Mobile requiere un binario con la dependencia de ubicación.

### T12 · Mapa público aproximado

**Canal:** W `/pet-alert`, Lista/Mapa. Usa los filtros compartidos, agrupa marcadores y abre ficha compacta hacia el boletín. El movimiento consulta puntos de la zona visible con límites; las respuestas obsoletas no reemplazan consultas recientes. Existen alternativas textuales accesibles para los puntos.

**Estado condicionado:** necesita estilo cartográfico autorizado para producción. Si falta o falla, conserva Lista. Registros sin ubicación confirmada permanecen en Lista sin marcador inventado. No publica pistas individuales ni coordenadas privadas. El mapa no certifica la ubicación actual de una mascota.

### T13 · Denunciar contenido y límites comunitarios

Usuarios autenticados pueden reportar contenido con motivo: datos sensibles, información falsa, fraude, acoso, seguridad animal u otro. Admin decide y registra justificación. No hay recompensa, pago, alerta masiva por proximidad, push remoto, matching automático o moderación automática de imágenes implementados. Las capacidades administrativas se detallan en A05–A07.

## 10 · Profesional de salud animal y consentimiento Owner

Canvas del actor: persona autenticada con identidad profesional revisada; vínculo opcional a organización propia. Objetivo: agregar una atención autorizada conservando historia. Canal profesional: W `/clinical-access/[token]`; consentimiento: M Owner; historial Owner: M/W. Fuentes: S16, S17.

### V01 · Consulta temporal por QR

Abrir enlace/QR vigente para ver identidad básica, vacunas, alergias, condiciones y metadata documental de la mascota. No exige identidad profesional para la lectura limitada. Token vencido, revocado o inválido produce respuesta genérica. La vista anónima no abre archivos privados, contactos, miembros del hogar ni historial completo de terceros.

### V02 · Identificación profesional

Desde la misma página, iniciar sesión y conservar contexto. Registrar nombre, tipo de profesional, referencia de licencia, jurisdicción, país y organización opcional de las disponibles para el usuario. Guardar y enviar a verificación. La aprobación comercial de un negocio o una categoría veterinaria no son equivalentes a esta identidad individual.

### V03 · Verificación y estados

Consultar Borrador, Pendiente, Verificada, Rechazada, Suspendida o Vencida. Admin revisa y decide. Sin verificación vigente se mantiene la consulta limitada, sin escritura profesional. **Condición operativa:** el procedimiento documental/legal de verificación para el piloto debe quedar definido; el formulario implementado no representa verificación gubernamental automática ni acredita personal completo de una clínica.

### V04 · Solicitar alcances de escritura

El profesional verificado selecciona acciones necesarias y nota para el Owner: crear atención, diagnóstico, vacuna, indicación, tratamiento o documento clínico. La solicitud identifica mascota, profesional y vigencia. Debe esperar aprobación del Owner; abrir QR y estar autenticado no bastan. El consentimiento no permite editar mascota, cambiar hogar o acceder a contacto privado.

### V05 · Aprobar, rechazar o revocar consentimiento

M Owner > Salud muestra profesional, organización, acciones y vencimiento. Un miembro con edición/admin aprueba solo alcances solicitados, rechaza o revoca. Un miembro de lectura no concede escritura. La autorización efectiva queda limitada por el acceso, consentimiento y estado profesional. Expiración/revocación impiden nuevas acciones; no borran una atención ya finalizada.

### V06 · Registrar, revisar y finalizar atención

W profesional: completar fecha/tipo de atención, resumen y entradas de hallazgo, diagnóstico, vacuna, indicación o tratamiento según permisos. Revisar contenido y confirmar. La finalización transaccional/idempotente evita duplicación por el mismo envío y deja autoría y consentimiento vinculados.

**Resultado:** comprobante e historial de atención finalizada. No sobrescribe vacunas, alergias o condiciones Owner, ni crea factura, pago, cita clínica o receta electrónica interoperable. Las vacunas profesionales permanecen como registros de origen, sin copiarse automáticamente al módulo de vacunas Owner.

### V07 · Documentos clínicos privados

Con alcance autorizado, adjuntar título, tipo y archivo PDF, JPEG o PNG de hasta 15 MB en el formulario actual. Tipos: receta como documento, resultado, informe de imagen, informe clínico u otro. La carga usa destino controlado y validación; los archivos autorizados se consultan con enlace temporal corto.

**Límite:** antimalware es una dependencia de infraestructura pendiente. Un documento titulado receta no habilita automáticamente farmacia, dispensación, refill o firma regulatoria. Si falla la carga, no debe confundirse con inexistencia de la atención ya finalizada.

### V08 · Rectificar y consultar historial

El profesional puede registrar una rectificación propia con motivo y permisos vigentes; se crea una nueva entrada enlazada, manteniendo la original. Owner M/W consulta autor, organización, resumen, entradas, documentos, autorizaciones y correcciones. Admin recibe eventos sanitizados, sin texto clínico. No hay edición destructiva ni borrado cotidiano de historia profesional por Owner o Admin.

## 11 · Administración de plataforma

Canvas del actor: administrador de plataforma autenticado y autorizado. Objetivo: revisar, moderar y resolver. Canal: A. Estado: implementada; moderación geográfica condicionada a migración/despliegue vigente. Fuentes: S09–S17, S19.

### A01 · Acceso y panel de colas

Iniciar sesión en Admin y superar compuerta de autorización. Inicio presenta decisiones pendientes y accesos a Proveedores, Familias protectoras, PET ALERT, Profesionales y Soporte. Un usuario Owner/Provider no obtiene acceso por conocer la URL. El panel no se documenta como un backoffice financiero o de configuración global completo.

### A02 · Revisar y aprobar proveedores

Listar pendientes, abrir detalle, revisar perfil, servicios, horarios/capacidad, ubicación, visibilidad y documentos con enlace temporal; aprobar o rechazar. La decisión se registra con trazabilidad y condiciona publicación. El checklist es apoyo a la revisión; aprobar una organización no verifica a un profesional sanitario ni aprueba separadamente cada archivo.

### A03 · Aprobar familias y perfiles públicos

Revisar solicitudes internas de hogares protectores, datos y contexto; aprobar, rechazar o suspender. En cola diferenciada, revisar nombre/historia/contacto/logo y contenido publicable del perfil público. La aprobación interna no publica por sí sola todo contenido. Cambios de perfil público pueden requerir nueva revisión. No se convierte un hogar Owner automáticamente en protector.

### A04 · Moderar adopciones y auditar cierres

Consultar publicaciones y media, aprobar/rechazar/pausar según la acción disponible; conservar capacidad de moderación posterior aun con publicación responsable directa. Consultar solicitudes y transferencias para trazabilidad. Admin no acepta custodia por el adoptante ni recibe por defecto los gastos/documentos privados de todas las familias para publicarlos.

### A05 · Moderar denuncias PET ALERT

Listar casos por estado, abrir contenido/historial, introducir motivo y aplicar acción contextual: señalar/retirar visibilidad, restaurar, cerrar, rechazar claim o descartar denuncia. Cada decisión conserva historial y auditoría. No modifica propiedad, custodia o adopción y no publica las señales privadas del reclamante.

### A06 · Revisar reportes externos

Abrir reportes de propietarios sin cuenta, revisar fotografías, relato y contacto privado; aprobar o rechazar con decisión registrada. Publicar exige evidencia fotográfica. Un correo verificado es señal de control del canal, no prueba de propiedad. La clasificación automática de fotos y su bandeja especializada siguen siendo propuesta futura.

### A07 · Moderación geográfica diferenciada

Consultar cola de alertas perdidas/reportes comunitarios por tipo y visibilidad; comparar punto privado sensible y punto público. Ocultar, restaurar o regenerar punto con motivo de al menos ocho caracteres. La regeneración ocurre en servidor y no permite elegir manualmente la coordenada pública.

**Condición:** el handoff deja la migración MAP-7 pendiente; su aplicación remota no fue comprobada aquí. La acción solo afecta proyección/visibilidad geográfica: no cambia el boletín, contacto o punto privado. La auditoría no copia coordenadas y las pistas individuales quedan fuera de esta cola.

### A08 · Verificar profesionales y revisar eventos

Consultar identidad, referencia profesional, jurisdicción y organización; verificar, rechazar o suspender con justificación. Consultar eventos clínicos sanitizados y filtrar referencias disponibles. No puede conceder consentimiento en lugar del Owner ni modificar registros clínicos. La operación requiere un procedimiento de verificación definido para el piloto.

### A09 · Soporte por reserva

Listar casos y abrir contexto, asunto/descripción, estado y notas disponibles. Cambiar Abierto → En revisión → Resuelto y registrar nota o resolución según corresponda. El usuario ve el seguimiento autorizado. Se conserva auditoría mínima. No existen asignación de agentes, SLA, macros, adjuntos, chat de soporte o devoluciones financieras en esta capacidad.

### A10 · Manual interno

Consultar guías protegidas de aprobación, moderación y soporte. El material Admin se mantiene separado de `/ayuda` pública. La existencia de instrucciones de baja de cuenta o auditoría no implica un botón administrativo nuevo para ejecutar cualquier operación descrita.

## 12 · Matriz consolidada de funciones por canal

«Sí» indica experiencia comprobada en código/documentación actual; «parcial» detalla el alcance. «—» significa que no se identificó esa experiencia de usuario en ese canal, aunque pueda existir un contrato compartido.

| Familia funcional | M Owner | M Provider | M Foster | W pública/Owner | W Provider | W Foster | A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cuenta, perfil y cambio de modo | Sí | Sí | Sí | Sí | Sí | Acceso compartido | Acceso protegido |
| Baja de cuenta | Sí | Cuenta compartida | Cuenta compartida | Página informativa | — | — | Guía interna |
| Hogar y permisos | Sí | — | Hogar protector | Owner sí | — | Alta/contexto protector | Revisión protectora |
| Mascotas y documentos | Sí | Solo resumen de cita | Sí | Owner sí | Solo resumen de cita | Sí | Contexto autorizado |
| Salud Owner básica | Sí | — | Contexto mascota | Owner sí | — | Expediente parcial | — |
| Recordatorios/calendario | Sí | — | Contexto mascota | Owner sí | — | — | — |
| Aviso local con hora | Sí | — | Según contexto disponible | — | — | — | — |
| Marketplace de servicios | Sí | Oferta propia | — | Owner sí; discovery público según entrada | Oferta propia | — | Aprobaciones |
| Mapa de proveedores | Piloto | Ubicación propia | — | Ubicación/lista | Ubicación propia | — | Revisión ubicación |
| Reserva por cupos | Sí | Reglas y recepción | — | Owner sí | Reglas y recepción | — | Contexto soporte |
| QR check-in/check-out | Mostrar | Escanear | — | — | Alternativa manual | — | — |
| Evidencia operacional | Consultar | Cargar/consultar | — | No se afirma paridad | Cargar/consultar | — | No se afirma consola completa |
| Chat de reserva | Sí | Sí | — | Owner sí | Inline en reserva | — | No es chat de soporte |
| Reseña | Crear elegible | Ver propia cita | — | Owner sí | Ver propia cita | — | Moderación avanzada pendiente |
| Soporte | Crear/seguir | Sin participación automática | — | Owner sí | — | — | Resolver |
| Perfil protector y publicaciones | Como adoptante | — | Sí | Fichas públicas | — | Sí | Revisar/moderar |
| Gastos de acogida | — | — | Sí | — | — | Sí | Acceso general futuro |
| Interés público/invitación | Continuar invitación | — | Solicitud formal | Interés y puente | — | Gestionar/generar | Auditoría existente |
| Solicitud formal y compromiso | Sí | — | Revisar | Entrada pública, formal en M | — | Revisar/plantilla | Auditoría |
| Transferencia de custodia | Aceptar/rechazar | — | Iniciar/seguir | Formal en M | — | Iniciar/seguir | Auditoría |
| Pérdida de mascota registrada | Crear/seguir | — | — | Consultar boletín | — | — | Moderar |
| Reporte externo sin cuenta | Navegador web | — | — | Condicionado | — | — | Revisar |
| Reporte comunitario PET ALERT | Sí | — | — | Sí con sesión | — | — | Moderar |
| Claim/contacto PET ALERT | Revisar como autor | — | — | Solicitar/seguir | — | — | Moderar |
| Mapa PET ALERT | En navegador | — | — | Condicionado | — | — | Geografía condicionada |
| QR clínico/consentimiento | Generar/revisar | — | No se afirma paridad | Lectura temporal | No por rol comercial | — | Verificar profesional |
| Atención profesional | Historial | — | — | Profesional en ruta temporal | No consola clínica comercial | — | Solo eventos |
| Historial clínico profesional | Sí | — | — | Owner sí | — | — | Sin contenido clínico |

## 13 · Recorridos, estados y reglas de aceptación

### R01 · Primer cuidado del Owner

Registro con intención Owner → confirmación de correo → hogar familiar o invitación aceptada → primera mascota → ficha → foto/documento/salud opcional → recordatorio o servicio. Resultado esperado: hogar y mascota quedan seleccionables, con permisos correctos. El usuario que continúa una invitación de adopción no queda obligado a crear una mascota ficticia antes de recibir la real.

### R02 · Reserva y prestación

Proveedor configura negocio/servicio/cupo → Admin aprueba → oferta pública → Owner elige servicio/franja → revisa resumen → confirma → proveedor aprueba si corresponde → QR de llegada → atención → QR de salida → evidencia → completar → reseña o soporte. El chat acompaña una reserva existente. Consultar horario o resumen no consume cupo; confirmar sí lo valida. La ejecución y el cobro son dimensiones distintas.

### R03 · Adopción responsable

Protectora aprobada → perfil público aprobado → mascota en acogida → ficha completa/fotos → publicación responsable → visitante deja interés → protectora preselecciona e invita → persona entra como Owner y crea/elige hogar → solicitud formal → revisión/entrevista/aprobación → compromiso si requerido → transferencia pendiente → receptor acepta → mascota aparece en su hogar. El solicitante también puede llegar directamente desde el discovery autenticado. Ningún paso previo a aceptar la transferencia entrega la custodia.

### R04 · Pérdida, ayuda y reencuentro

Owner prepara alerta o externo verifica correo y pasa moderación → boletín/QR/cartel público → visitante consulta → colaborador autenticado aporta avistamiento → familia revisa → se marca encontrada. En la ruta comunitaria: observador publica → persona reconoce → envía claim → autor evalúa → se autoriza contacto → se cierra/reúne el caso. Ninguna ruta modifica por sí sola el registro de propiedad.

### R05 · Atención clínica autorizada

Owner genera acceso temporal → lector abre Web → profesional inicia sesión y verifica identidad → solicita alcances → Owner consiente → profesional revisa/finaliza atención → incorpora documento autorizado → Owner consulta historia → rectificación posterior enlazada si procede. La revocación o expiración bloquea nuevas escrituras y conserva el contenido ya finalizado.

### Estados funcionales canónicos

| Entidad | Estados vigentes o principales | Regla de interpretación |
| --- | --- | --- |
| Mascota | `active`, `in_memory` | En memoria conserva expediente y bloquea reserva nueva. |
| Invitación de hogar | `pending`, `accepted`, `rejected` | Aceptar concede membresía con permisos; no transfiere mascota por sí mismo. |
| Reserva | `pending_approval`, `confirmed`, `completed`, `cancelled` | Rechazo se representa en cancelación/motivo; el estado operacional es separado. |
| Franja | `available`, `low_capacity`, `full`, `unavailable`, `expired` | Es proyección consultada; la confirmación revalida cupo. |
| Soporte | `open`, `in_review`, `resolved` | Estado del caso, no de la reserva ni de pago. |
| Familia/perfil público | `draft`, `pending_review`, `approved`, `rejected`, `suspended` | Son dos procesos de revisión diferentes. |
| Publicación de adopción | `draft`, `pending_review`, `published`, `paused`, `closed`, `rejected`, `adopted` | Estados heredados de revisión coexisten con publicación responsable directa. |
| Interés público | `submitted`, `in_review`, `preselected`, `invited_to_app`, `converted_to_application`, `rejected`, `cancelled`, `expired` | No todos son botones libres; algunos derivan de la conversión. |
| Invitación a app | `created`, `sent`, `opened`, `claimed`, `expired`, `revoked` | Token y destinatario controlan continuidad; no implica entrega automática de correo. |
| Solicitud formal | `submitted`, `in_review`, `interview`, `approved`, `rejected`, `withdrawn`, `converted_to_transfer` | Aprobada no es adopción completada. |
| Transferencia | `pending`, `accepted`, `rejected`, `cancelled`, `expired` | Solo aceptada cambia custodia. |
| Alerta de pérdida | Borrador/verificación/revisión; activa/con avistamiento/posible coincidencia; encontrada/cerrada; pausada/retirada/rechazada/vencida/señalada | El contrato incluye estados de distintos slices; no se promete UI para cada transición. «Posible coincidencia» no implica matching automático. |
| Reporte comunitario | Abierto, resguardado, posible dueño, dueño verificado, reunido, cerrado, vencido o señalado | Son estados del evento y no títulos jurídicos de propiedad. |
| Claim comunitario | `pending`, `approved`, `rejected`, `cancelled` | Contacto solo tras autorización aplicable. |
| Caso de moderación | `open`, `resolved`, `dismissed` | No se confunde con estado del contenido moderado. |
| Acceso clínico de lectura | `active`, `revoked`, `expired` | La posesión de enlace vigente solo concede proyección de lectura. |
| Identidad profesional | `draft`, `pending`, `verified`, `rejected`, `suspended`, `expired` | Verificación no es consentimiento Owner. |
| Solicitud clínica | `requested`, `approved`, `rejected`, `revoked`, `expired`, `completed` | Los alcances aprobados y vigencia limitan toda escritura. |
| Atención profesional | `finalized`, `corrected` | Rectificar conserva el original; no se promete borrador persistente completo. |

### Permisos y visibilidad

| Información/acción | Quién puede acceder | Frontera |
| --- | --- | --- |
| Perfil/direcciones/métodos | Persona titular y flujos autorizados. | No aparecen en directorios públicos. |
| Mascota/documentos/salud Owner | Miembros del hogar con permisos correspondientes. | Lectura no implica edición ni autorización clínica. |
| Crear/editar mascota y documentos | Edición o administración del hogar. | No modifica historia profesional inmutable. |
| Reservar | Miembro con permiso de reserva o administración conforme al servidor. | Requiere mascota elegible y oferta válida. |
| Chat | Reservante y propietario de organización proveedora. | No todos los miembros del hogar ni todo el staff. |
| Reseña | Reservante elegible; lectura por contraparte autorizada. | Una por reserva completada; no reputación pública indiscriminada. |
| Soporte | Creador autorizado y Admin según caso. | Provider no participa automáticamente. |
| Documentos del negocio | Responsable del negocio y Admin revisor. | No forman parte del perfil público. |
| Gastos y comprobantes Foster | Miembros autorizados del hogar protector. | No se publican en adopciones. |
| Solicitudes/compromisos | Solicitante, protectora y auditoría autorizada según contrato. | No figuran en landing pública. |
| PET ALERT público | Visitantes por proyecciones sanitizadas. | Sin contacto privado, expediente o coordenada exacta. |
| Coordenada PET ALERT exacta | Tratamiento privado y cola Admin geográfica autorizada. | Mapa recibe punto generalizado; pistas individuales no son marcadores. |
| QR clínico | Quien posee enlace válido ve lectura limitada. | No acredita lector ni abre archivos Owner. |
| Consentimiento clínico | Owner con edición/admin lo revisa. | No lo otorga el profesional ni Admin en nombre del Owner. |
| Anexo profesional | Autor autorizado y Owner conforme al alcance. | Admin ve eventos sanitizados, no contenido clínico. |

### Comportamientos comunes de error y resultado

Una lista vacía debe distinguirse de un error de carga. Las acciones requieren mostrar progreso, éxito o error comprensible; una sesión expirada lleva a recuperar acceso. Archivos privados usan enlaces temporales, por lo que reabrir debe renovar autorización. Denegar cámara/galería/ubicación mantiene las alternativas disponibles. El cupo se revalida al confirmar, los consentimientos al escribir y los tokens al consumirlos. Un error después de crear un reporte o atención exige revisar el resultado antes de repetir toda la operación.

### Escenarios mínimos para validar esta documentación con el producto

| Escenario | Resultado comprobable esperado |
| --- | --- |
| Owner nuevo | Completa cuenta → hogar → mascota sin ver operación Foster/Provider mezclada. |
| Miembro de solo lectura | Consulta expediente y no puede editar ni otorgar escritura clínica. |
| Dos clientes intentan el último cupo | Solo la confirmación válida obtiene el cupo; el otro recibe una alternativa. |
| Proveedor ajeno escanea QR | Se rechaza la operación sobre reserva de otra organización. |
| Reserva completada | Permite una reseña del reservante y conserva seguimiento/evidencia. |
| Adopción aprobada sin aceptación | Mascota sigue en custodia protectora; aparece transferencia pendiente. |
| Perfil protector público cambiado | Se respeta la revisión requerida antes de volver a publicar el perfil. |
| PET ALERT sin GPS | El reporte textual funciona y no se inventa un marcador. |
| Claim sin aprobación | No se revela contacto privado. |
| Profesional comercial no verificado | No obtiene escritura por ser Provider. |
| Consentimiento clínico revocado | Nuevas escrituras se rechazan; lo finalizado sigue en historia. |
| Mapa sin estilo o con fallo | Lista continúa operativa y ofrece información accesible. |

Estos escenarios son criterios funcionales de revisión, no pruebas ejecutadas contra producción durante la elaboración del documento.

## 14 · Límites, pendientes y evolución documentada

### Condiciones de disponibilidad que requieren seguimiento

| Frente | Capacidad presente | Pendiente/condición documentada |
| --- | --- | --- |
| PET ALERT MAP-2 | Persistencia privada/pública y generalización. | Handoff registra aplicación remota el 04/09; no se revalidó en esta revisión. |
| PET ALERT MAP-3/5 | Captura confirmada Mobile y comunidad. | Nuevo binario con ubicación y QA física de permisos/captura. |
| PET ALERT MAP-4 | Ubicación opcional en reporte externo. | Desplegar versión actualizada de la función externa. |
| PET ALERT MAP-6/8 | Mapa Web, filtros, agrupación y accesibilidad. | Estilo productivo, despliegue vigente y QA visual. MAP-8 ya tiene commit local. |
| PET ALERT MAP-7 | Cola y acciones geográficas Admin. | Aplicación remota de migración no confirmada; el handoff la deja pendiente. |
| Reporte externo 8B | Formulario, OTP, CAPTCHA, fotos y revisión. | Secretos/servicios de correo y CAPTCHA, función desplegada y QA integral. |
| Reporte externo 8C | Diseño de administración sin cuenta. | Recuperación/edición/retiro/cierre/vinculación no implementados como recorrido completo. |
| Clinical Access 2D/2E | Atención, anexos, documentos y timeline. | Procedimiento de acreditación; antimalware; QA y distribución vigente. |
| Foster y embudo público | Publicación, interés, invitación, solicitud y cierre. | Notas históricas se contradicen; handoff posterior registra aplicación del embudo. Validar entorno antes de declarar disponibilidad productiva. |
| Mapa de proveedores | Preview Mobile y ubicación declarada. | Verificar estilo/tiles productivos y límites del piloto; no asumir paridad con mapa PET ALERT. |
| Android/iOS beta | Rutas y configuración de distribución. | Enlaces y versiones realmente disponibles dependen de publicación externa. |
| Documentación modular | Amplio inventario de comportamiento. | Algunos archivos de verticales futuras tienen encabezado/contenido desplazado; no sirven solos para certificar implementación. |

### Funciones planificadas, sin promesa de disponibilidad

| Dominio/actor futuro | Funcionalidad prevista | Etapa/documentación |
| --- | --- | --- |
| Pagos Owner/Provider/Admin | Checkout real, autorización/captura, webhooks, devoluciones, conciliación y liquidaciones. | Payments MVP+ documentado en espera; proveedor financiero aún sujeto a validación. |
| Operación avanzada del proveedor | Staff, permisos por trabajador, sucursales, CRM, reportes avanzados, report card y notas internas completas. | V2 y slices separados. El panel multinegocio actual no cubre todo esto. |
| Reservas | Reprogramar, repetir, propinas, retención temporal de cupo y disputas. | Diferido; no sustituir cancelación/alta por un flujo inexistente. |
| Mensajería | Adjuntos, conversación libre, recibos/contadores canónicos de lectura y push remoto. | Fuera del chat textual actual. |
| Salud Owner | Medicación avanzada, laboratorios/imagen como módulos, incidentes y automatizaciones adicionales. | V2; un documento cargado no equivale a módulo especializado. |
| Clínica digital | Agenda por sede/profesional, preconsulta, SOAP completo, facturación y flujos clínicos integrados. | V2; Clinical Access es un subconjunto implementado, no toda la suite. |
| Tienda/comercio | Catálogo, variantes, carrito, pedidos, seguimiento, reordenar y backoffice comercial. | V2; no se identifican consolas operativas en las apps actuales. |
| Farmacia | Recetas/refill básicos y posteriormente checkout regulado, validación y fulfillment. | V2/V3 según profundidad; sin flujo farmacéutico completo actual. |
| Finanzas del Owner | Movimientos, gasto manual, clasificación y dashboard. | V2. Los gastos privados Foster no completan este módulo. |
| Rewards/beneficios | Wallet de recompensas, cupones y acumulación. | V2; membresías, cashback/beneficios complejos en V3. |
| Memberships y recurrencia | Planes, suscripciones/autoship y beneficios por nivel. | V3. |
| Telecare | Atención remota y escalamiento integrado. | V3; no es el enlace clínico temporal actual. |
| Presupuestos | Presupuestos, alertas, exportaciones e insights del costo de mascotas. | V3. |
| Pet Travel Passport | Carpeta de viaje, checklist por destino, vencimientos, compartición y exportación informativa. | V2 documentado en espera; no emite pasaporte/certificado oficial. |
| PET ALERT avanzado | Moderación automática de imágenes, matching, alertas remotas por cercanía y gestión externa 8C. | Propuestas/slices pendientes; sin tracking continuo habilitado. |
| Foster posterior | Seguimiento postadopción ampliado y automatizaciones no presentes. | Evolución documental; el cierre actual llega a transferencia e historia. |
| Admin avanzado | Disputas, pagos, SLA/asignaciones, configuración global y moderación avanzada de reseñas. | Fuera del backoffice actual. |

**Decisión de alcance:** este canvas documenta el estado y el horizonte existente; no aprueba construir nuevas funciones, no cambia prioridades del release y no autoriza migraciones o despliegues.

## 15 · Trazabilidad y mantenimiento

### Fuentes del catálogo

Las rutas siguientes son referencias del repositorio. Los documentos de diseño mezclan historia y estado; se contrastaron con las superficies y tipos indicados. Los archivos de configuración privada, credenciales, cuentas QA y datos reales de usuarios no se incorporan al entregable.

| Ref. | Documentación | Evidencia de implementación |
| --- | --- | --- |
| S01 | `README.md`; `docs/vision/PRODUCT_VISION.md`; `docs/vision/BLUEPRINT_GENERAL.md`; `docs/architecture/*`; `docs/delivery/MVP_SCOPE.md`, `V2_SCOPE.md`, `V3_SCOPE.md` | Estructura `apps/mobile`, `apps/web`, `apps/admin`, paquetes compartidos. |
| S02 | `docs/modules/core.md`; `docs/ux/ROLE_BASED_SCREEN_ARCHITECTURE.md` | `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`; `apps/web/src/features/core/screens/CoreExperienceScreen.tsx`; `packages/types/src/core.ts`. |
| S03 | `docs/modules/households.md` | Workspaces `features/households` de Mobile/Web; `packages/types/src/households.ts`. |
| S04 | `docs/modules/pets.md`; `docs/modules/pet_document_expiration.md` | Workspaces `features/pets`; `packages/types/src/pets.ts`; `packages/api-client/src/pets.ts`. |
| S05 | `docs/modules/health.md` | Workspaces `features/health`; tipos/API de salud y tarjetas de historial. |
| S06 | `docs/modules/reminders.md` | Workspaces `features/reminders`; `reminderNotifications.ts`; `appBadgeService.ts`. |
| S07 | `docs/modules/marketplace.md` | Workspaces `features/marketplace` Mobile/Web; ubicación y mapa Mobile. |
| S08 | `docs/modules/bookings.md`; `docs/modules/payments.md` | Workspaces de reservas; hooks de operaciones; `packages/types/src/bookings.ts`, `operations.ts`. |
| S09 | `docs/modules/providers.md`; `messaging.md`; `reviews.md`; `support.md`; manual de onboarding proveedor | Workspaces de proveedores/mensajes/reseñas/soporte; tipos y clientes compartidos respectivos. |
| S10 | `docs/modules/foster_adoption.md`; `docs/ux/FOSTER_PROGRESSIVE_ONBOARDING.md` | `AdoptionDiscoveryWorkspace`, `AdoptionApplicationsInbox`, `PetsWorkspace`, `HouseholdsWorkspace`, `FosterConsoleWorkspace`; `packages/types/src/foster.ts`. |
| S11 | `docs/modules/foster_expenses.md` | Gastos en `PetsWorkspace` Mobile y `FosterConsoleWorkspace` Web; contratos Foster. |
| S12 | `docs/product/ADOPTION_PUBLIC_FUNNEL.md`; documentos UX/datos/API del embudo | Rutas protectoras/adopciones/invitación; `AdoptionInviteContinuation`; consola Foster. |
| S13 | `docs/modules/pet_alert.md`; `docs/product/PET_ALERT.md`; contratos/datos/UX PET ALERT | Componentes `features/pet-alert` Mobile/Web/Admin; `packages/types/src/pet-alert.ts`. |
| S14 | `docs/modules/pet_alert_external_owner_reports.md` | `PublicExternalLostPetReportForm.tsx`; `supabase/functions/pet-alert-external-report/index.ts`; revisión Admin. |
| S15 | `docs/modules/pet_alert_map.md` | `ConfirmedBrowserLocation.tsx`; `PublicPetAlertMap.tsx`; `AdminPetAlertGeographicWorkspace.tsx`; migraciones MAP-2/MAP-7. |
| S16 | `docs/modules/clinical_access.md` | `PublicClinicalAccessPage`, `ProfessionalIdentityPanel`, `ClinicalAccessCard`; `packages/types/src/clinical-access.ts`; API clínica. |
| S17 | `docs/modules/health.md`; notas Clinical Access del handoff | `ClinicalTimelineCard`, `ClinicalTimelinePanel`, `AdminClinicalProfessionalsWorkspace`; migraciones de acceso/documentos. |
| S18 | `docs/ux/HELP_CENTER.md`; `docs/beta-access.md`; documentación legal de baja | `/ayuda`, `/beta`, `/account-deletion`; `HelpCenterPage`; componentes de beta. |
| S19 | `docs/modules/admin.md`; quick starts del piloto | `apps/admin/src/app/page.tsx`; workspaces Admin de proveedores, Foster, PET ALERT, profesionales, soporte y ayuda. |
| S20 | `docs/HANDOFF.md`; `docs/product/MODULE_STATUS.md`; `BACKLOG_MASTER.md`; `EPICS_AND_STORIES.md`; `docs/data/SUPABASE_SCHEMA.md`, `DATA_MODEL.md`, `RLS_RULES.md`; `docs/api/API_CONTRACT.md`; `docs/ux/SCREEN_SPECIFICATIONS.md` | Contraste de cambios recientes, estados y fronteras; HEAD local `1352e4c`. |

### Glosario funcional

| Término | Significado |
| --- | --- |
| Owner | Persona que usa la experiencia de cuidado de mascotas propias. |
| Household/hogar | Unidad de convivencia o cuidado con miembros y permisos. |
| Foster/protectora | Hogar separado de rescate, acogida o adopción, sujeto a aprobación. |
| Provider | Organización comercial y la persona autorizada que la administra. |
| Booking/reserva | Relación transaccional de hogar, mascota, servicio y proveedor con horario/precio/estado. |
| Slot/franja | Intervalo de servicio cuya capacidad se consulta y valida al confirmar. |
| Payment-ready | Datos preparados para una evolución de pagos; no hay cobro real. |
| Slug | Referencia legible de una ficha pública compartible. |
| Claim | Solicitud controlada de reconocimiento/contacto; no prueba propiedad. |
| Grant/acceso temporal | Permiso de consulta asociado a token, vigencia y revocación. |
| Scope/alcance | Acción concreta autorizada en el consentimiento clínico. |
| Append-only | Registro que conserva originales; las correcciones agregan nuevas entradas enlazadas. |
| URL firmada | Enlace temporal autorizado para consultar un archivo privado. |
| Moderación geográfica | Control del punto público, separado de la moderación del boletín. |

### Cómo actualizar el canvas

Actualizar fecha y commit de corte; revisar funciones nuevas o retiradas por rol/canal; conservar IDs funcionales para comparar versiones; ajustar estados de despliegue solo con evidencia; regenerar HTML/PDF desde este Markdown y comprobar índice, tablas y legibilidad. La revisión funcional de este documento no sustituye las pruebas de permisos ni el QA de cada release.

El documento se entrega en Markdown editable, HTML navegable sin dependencias externas y PDF de lectura/impresión. Las tres versiones corresponden al mismo contenido funcional.
