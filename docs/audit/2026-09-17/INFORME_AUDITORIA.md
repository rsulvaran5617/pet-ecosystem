# Auditoría funcional por roles — resultados y plan de cierre

## Actualización de publicación y aislamiento Core — 18/09/2026

Se verificaron siete rutas públicas de https://petecosyst.com a 1440/390 px: todas devuelven HTTP 200. Inicio y Ayuda todavía sirven CSS inline y reproducen errores React; Inicio mide 420 px de documento a 390 px de viewport. Esto no valida H07/H08 como desplegados. La conexión SSH documentada fue rechazada por autenticación; no se modificó el servidor. Evidencia: `evidence/deployed-public-check.json`.

Pasaron 40 comprobaciones de lectura/aislamiento Core con owner, provider, miembro y visitante: perfiles, preferencias, direcciones y métodos referenciales. Las direcciones y métodos existentes de owner/provider no son visibles a otras cuentas ni al visitante; el miembro no tiene filas propias en esas dos tablas y no se afirma aislamiento sobre fixtures inexistentes. Solo login/logout y SELECT; sin ediciones ni solicitudes de eliminación. Se añaden C04/C06/C07/C08 con cobertura parcial: **49/110 fichas con evidencia parcial, 61 sin ejecución**. UI, CRUD y pruebas nativas siguen pendientes. Evidencia: `evidence/core-read-isolation.json`.

Preparación mobile desde copia aislada de a7b89d3: lint y typecheck pasan. ADB no detecta dispositivos. El estado del build/distribución se registra en `PUBLICACION_Y_CORE.md`; un APK compilado no equivale a una prueba nativa. Los apartados siguientes conservan el historial de cada fase.

**Corte: 17 de septiembre de 2026, Panamá.** Código local `1352e4c272d1475520a0409ad32e336967c343b0`. Pruebas API ejecutadas contra el backend configurado del proyecto; navegador contra la aplicación local. Los JSON registran fecha UTC del 18 de septiembre.

**Actualización posterior: H01, H02 y H03 corregidos y verificados en el servidor vinculado.** Migración `20260918010000_clinical_write_authorization_revalidation.sql`, aplicada el 18/09/2026 a las 01:43 UTC. Pasaron 21 regresiones SQL locales y 12 comprobaciones remotas antes y después de aplicar. Los ocho hallazgos y su evidencia original se conservan abajo; H04/H05 tienen además corrección de servidor aplicada y clientes locales implementados, con publicación pendiente; H06 corregido en servidor; H07/H08 corregidos localmente, publicación pendiente. Detalle en `CORRECCION_CLINICA.md` y `CORRECCION_REINTENTOS.md`.



## Actualización H04/H05: servidor aplicado, clientes por publicar

Migración 20260918020000 aplicada tras comparar cuatro funciones remotas y probar la candidata dentro de rollback. Pasaron 36 casos SQL locales, 9 de cliente/servicio y 25 remotos antes y después. Web local completó 7 comprobaciones con un PNG real y pérdida simulada de respuesta: recuperó el documento sin duplicar atención ni subida. El owner revocó la autorización completed y mantuvo el historial.

El botón mobile de revocación residual está implementado, sin prueba en dispositivo. No hubo despliegue web ni distribución mobile. La recuperación web conserva claves/archivo en memoria y se pierde al recargar. Las pruebas SQL no simulan dos conexiones concurrentes. Perfil QA suspendido nuevamente y accesos revocados. Ver CORRECCION_REINTENTOS.md.

## Actualización H06: capacidad corregida en servidor

La migración 20260918030000 bloquea cambios de capacidad inferiores a la ocupación por franja futura/en curso. Se reprodujo el fallo anterior; pasaron 16 pruebas con candidata dentro de rollback y las mismas 16 después de aplicar. Dos conexiones reales verificaron ambas carreras (reserva primero y edición primero), con 9 comprobaciones correctas y espera por lock observada. Las reservas QA quedaron canceladas, reglas desactivadas y proveedor privado.

Sin cambios de pantallas ni nuevo binario para este control. Conserva excepciones por fecha e historial; la edición de excepciones y los cambios de horario/servicio no forman parte de este cierre. Evidencia en CORRECCION_CAPACIDAD.md. H07/H08 corregidos localmente, publicación pendiente; H04/H05 requieren publicación de clientes y QA nativo.

## Actualización H07/H08 — 18/09/2026: web corregida y validada localmente

Corregidos el desbordamiento de cabeceras/paneles y el recorte del aviso de mensajes; la tabla de capacidad tiene scroll propio. Inicio y Ayuda usan CSS estático importado. Pasaron 24 combinaciones de página/rol/ancho/texto o JavaScript en desarrollo y producción local, con datos cargados en producción, sin errores de hidratación ni desbordamiento. Build, tipos y lint correctos. Ver CORRECCION_WEB.md.

El trabajo previo H01–H06 y los documentos descargables quedaron en origin/master mediante fcdb056. H07/H08 requieren despliegue web; H04/H05 requieren publicación de clientes y QA nativo. Push de código no certifica la versión publicada. La cobertura sigue en 45/110 fichas parcialmente ejecutadas.

## Resultado principal

La reserva concurrente del último cupo, los permisos granulares del hogar y la transferencia privada de una mascota de prueba funcionaron en los casos ejecutados. Se confirmaron fallos en la revocación y suspensión de permisos clínicos, en el reintento de una atención y en la reducción de capacidad con reservas existentes. La web presentó problemas de adaptación a pantallas estrechas y de hidratación en dos páginas públicas.

**Recomendación: priorizar las correcciones clínicas antes de ampliar su uso con datos reales.** Este informe no certifica todas las funciones: la matriz anexa enumera las 110 fichas del canvas e identifica qué se probó, en qué canal y qué falta.

Durante la fase de auditoría no se modificó código de producto. Posteriormente se aplicó la migración acotada H01–H03 descrita arriba. Los perfiles, mascotas y operaciones creados para probar están identificados como QA. No se procesaron cobros ni se enviaron mensajes de chat o correos desde herramientas.

## Alcance y método

- Sesiones separadas de propietario, miembro, proveedor, administrador y visitante.
- Hogares, mascotas, negocio y registros clínicos sintéticos, sin alterar negocios ni expedientes previos.
- Cliente API compartido y RPC reales: resultados funcionales y permisos del servidor.
- Chrome local: siete rutas públicas, inicio/cierre de sesión de proveedor y propietario, navegación de secciones de proveedor y PET ALERT; anchos de 1440 y 390 px.
- Compilación/exportación, tipos y lint como comprobaciones técnicas independientes de la validación funcional.

Un resultado API no acredita un formulario web ni una pantalla nativa. Una captura a 390 px es una prueba de web adaptable, no una prueba React Native. Los clics de navegación no equivalen a comprobar todos los formularios de cada sección. No se ejecutaron OTP por correo, recuperación, eliminación de cuentas, cobros, notificaciones push, cámara ni geolocalización real.

## Casos que funcionaron

| Área | Evidencia ejecutada | Límite de la conclusión |
| --- | --- | --- |
| Proveedor y administrador | Alta QA, aprobación por administrador, bloqueo de autoaprobación y publicación/ocultación | No verifica documentos o avatar |
| Reserva básica | Preview, creación pendiente, confirmación, finalización, cancelación y aislamiento frente a otro usuario | No hubo cobro ni reprogramación |
| Último cupo | Tres rondas de cuatro solicitudes concurrentes: una aceptada y tres rechazadas por ronda | Una misma cuenta QA con cuatro sesiones; no prueba carga masiva |
| Capacidad | Cancelar libera el cupo; se rechazan capacidad cero y rango inválido; 09:00 Panamá se proyecta como 14:00 UTC | No cubre excepciones por fecha ni toda la política de cancelación |
| Hogar | Lectura permitida; edición y reserva requieren sus permisos; no hay autoescalamiento; revocar edit/admin surte efecto; se conserva un último admin | El permiso pay se probó como control y rechazo de método inexistente; no como pago |
| Transferencia privada | Doce verificaciones correctas: protectora aprobada, destinatario y hogar válidos, movimiento y pérdida de acceso del emisor, bloqueo de doble aceptación | No cubre el embudo completo de solicitud pública y compromiso documental |
| Profesional suspendido | Se bloquea crear una atención nueva | Las rectificaciones y finalización documental fallan, como se detalla abajo |
| Enlaces inválidos | Las rutas de acceso clínico e invitación de adopción muestran estado no disponible | No prueba todos los casos de expiración |
| PET ALERT público | Cambio entre extraviadas/vistas/encontradas y lista/mapa; estados vacíos; sin desbordamiento a 390 px en esta muestra | Directorio vacío; no acredita marcadores, moderación, OTP ni publicación |

La suite ampliada de capacidad y hogar contiene 22 aserciones: 21 correctas y una fallida. Transferencia contiene 12 correctas. El conteo representa casos de prueba, no funciones completas aprobadas.

## Hallazgos confirmados

### H01 — Alta: revocar el enlace clínico no impide finalizar una atención pendiente

**Roles y funciones:** propietario y profesional; O27, V01, V05, V06.

**Reproducción:** crear un acceso de una hora para la mascota QA; profesional verificado solicita scopes; propietario aprueba; propietario revoca el acceso; profesional finaliza una atención con aquella autorización. La operación fue aceptada.

**Esperado:** la regla de revocación de lectura debe suspender borradores asociados no finalizados. Está definida en `docs/modules/clinical_access.md`, sección 16. El historial ya finalizado se debe conservar.

**Evidencia:** `evidence/clinical.json`, observación `CLIN-LINK-REVOCATION`; atención `a30030ef-ef36-4da2-902b-5e53b81bede7`.

**Referencia técnica:** `supabase/migrations/20260901110000_clinical_access_read_only.sql`, función `revoke_pet_clinical_access`; `20260901170000_clinical_access_append_only_encounters.sql`, función `finalize_clinical_encounter`. La finalización valida autorización y profesional, pero no el estado actual del grant.

**Corrección propuesta:** comprobar grant y consentimiento bajo la misma transacción; definir propagación a solicitudes pendientes. Regresión: revocar antes de guardar y en carrera con el guardado; nunca invalidar retroactivamente el historial finalizado.

### H02 — Alta: un profesional suspendido puede rectificar una entrada

**Roles y funciones:** profesional y administrador; V03, V08, A08.

**Reproducción:** registrar una atención QA con diagnóstico sintético; aprobar una nueva solicitud de escritura; suspender el perfil mediante administrador; intentar una nueva atención y una rectificación propia. La atención se bloqueó por identidad no verificada, pero la rectificación fue aceptada.

**Esperado:** toda mutación revalida la verificación vigente del profesional, conforme a la regla general de validación transaccional de `docs/modules/clinical_access.md`.

**Evidencia:** `evidence/clinical.json`, `CLIN-SUSPENDED-ENCOUNTER` y `CLIN-SUSPENDED-CORRECTION`.

**Referencia técnica:** `supabase/migrations/20260901190000_clinical_access_documents_timeline.sql`, `create_clinical_entry_correction`, no comprueba estado/expiración de la verificación.

**Corrección propuesta:** centralizar los controles clínicos y aplicarlos también a rectificaciones. Regresión con profesional suspendido, vencido, autorización revocada y registro de otro autor.

### H03 — Alta: la finalización de un documento omite la suspensión del profesional

**Roles y funciones:** profesional y administrador; V03, V07, A08.

**Reproducción:** preparar documento y subir PNG sintético a Storage con autorización válida; suspender al profesional; llamar a `finalize_clinical_document_upload`. El documento pasó a disponible pese a la suspensión.

**Esperado:** la finalización vuelve a verificar identidad, autorización, alcance y vigencia; haber preparado un archivo no concede permiso permanente.

**Evidencia:** `evidence/clinical.json`, `CLIN-SUSPENDED-DOCUMENT-FINALIZE`; documento `195c7b40-4428-4464-98e1-5dbec6dd8247`.

**Referencia técnica:** `supabase/migrations/20260901190000_clinical_access_documents_timeline.sql`, `finalize_clinical_document_upload`. Comprueba autor, estado pendiente y metadata del objeto, pero no la autorización y verificación actual.

**Corrección propuesta:** revalidar al finalizar y cubrir también revocación/vencimiento durante la subida. Mantener el documento no disponible cuando falle el control.

### H04 — Media: repetir una atención con la misma clave no devuelve el resultado anterior

**Roles y funciones:** profesional; V06.

**Reproducción:** finalizar la atención QA y repetir exactamente el mismo payload y `idempotencyKey`. La segunda llamada falla con `Active clinical authorization required`.

**Esperado:** un reintento legítimo devuelve el identificador de la operación ya confirmada, sin duplicar ni exigir una nueva autorización para leer ese resultado.

**Evidencia:** `evidence/clinical.json`, `CLIN-IDEMPOTENCY`.

**Referencia técnica:** `finalize_clinical_encounter` verifica `request.status = approved` antes de resolver la clave, aunque la primera llamada cambia el estado a `completed`. En `apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx`, un fallo posterior del adjunto además deja un mensaje conjunto de fallo y cada intento genera una clave nueva. Este último comportamiento se revisó en código; no se reprodujo visualmente una caída de red durante la subida.

**Corrección propuesta:** resolver reintentos autorizados antes del bloqueo por estado terminal; conservar la clave por operación y separar éxito de atención de fallo del archivo. Regresión ante timeout después del commit y subida fallida.

### H05 — Media: una autorización completada no admite revocación aunque permite preparar adjuntos

**Roles y funciones:** propietario y profesional; V05, V07, O27.

**Reproducción:** finalizar una atención; el propietario intenta revocar su autorización y recibe `Clinical write authorization is not active`; acto seguido, el profesional prepara y sube un documento con esa autorización.

**Impacto:** hay capacidad de escritura residual mientras el propietario no dispone de una revocación efectiva para ese estado. El historial finalizado debe conservarse; revocar acciones futuras no equivale a borrar la atención.

**Evidencia:** `evidence/clinical.json`, `CLIN-COMPLETED-AUTH-REVOCABLE` y documento preparado a continuación.

**Referencia técnica:** `20260901150000_clinical_access_owner_consent.sql`, `revoke_clinical_write_authorization`, exige estado `approved`; `prepare_clinical_document_upload` permite usar la autorización asociada a la atención sin exigir ese estado.

**Corrección propuesta:** definir explícitamente cuándo termina el permiso de adjuntar y permitir retirar cualquier permiso residual. Probar finalización de atención, revocación, preparación/subida/finalización del adjunto y conservación del historial.

### H06 — Media: se puede reducir capacidad por debajo de reservas existentes

**Roles y funciones:** proveedor y propietario; P06, O18, O19.

**Reproducción:** configurar capacidad dos, reservar dos cupos, editar capacidad a uno. La edición fue aceptada; la proyección devuelve `capacityTotal: 1`, `reservedCount: 2`, `availableCount: 0`.

**Esperado:** bloquear la reducción o exigir un procedimiento explícito para resolver las reservas existentes, como establece `docs/modules/providers.md`. El bloqueo concurrente del último cupo sí funciona; esta es una vía distinta que afecta la configuración.

**Evidencia:** `evidence/capacity-permissions.json`, `CAP-REDUCE-OCCUPIED` y `capacityAfterReductionAttempt`.

**Referencia técnica:** `packages/api-client/src/providers.ts`, `updateProviderAvailabilityRule`, actualiza la tabla directamente; restricciones de `provider_availability_rules` en `20260507212815_booking_capacity_v2.sql`.

**Corrección propuesta:** validación transaccional del ajuste contra ocupación futura, coordinada con las altas de reserva. Probar reducción concurrente con reserva y franjas con reservas completadas/canceladas.

### H07 — Media: desbordamiento horizontal en las consolas web a 390 px

**Roles y funciones:** propietario y proveedor; O01, P01, P14.

**Reproducción:** iniciar sesión en `/app` y reducir viewport a 390 px. La página del proveedor mide 422 px de ancho y la del propietario 412 px. Parte de la cabecera y contenido queda fuera del viewport.

**Evidencia:** `evidence/web.json`, sesiones autenticadas y `overflowElements`; `evidence/provider-web-390.png`. La captura se revisó visualmente; el correo QA se oculta en la captura final.

**Corrección propuesta:** ajustar tamaños mínimos, distribución y corte de identificadores largos en la cabecera/contenedores. Regresión a 360/390/414 px y con nombres/correos largos. No hay evidencia de este problema en la app nativa.

### H08 — Media: discrepancia de HTML del servidor en Inicio y Ayuda

**Roles y funciones:** visitante y todos los roles; C10 y entrada pública.

**Reproducción:** abrir `/` y `/ayuda` en un perfil limpio de Chrome contra Next local. React reporta contenido distinto entre servidor y cliente y reemplaza la raíz con renderizado del cliente. Se reprodujo en una segunda ejecución.

**Evidencia:** `evidence/public-web-recheck.json`. La advertencia identifica bloques `<style>` con entidades HTML como `&quot;` en el contenido del servidor. No se reprodujo en `/pet-alert` durante la misma comprobación.

**Referencia técnica:** estilos incrustados en `apps/web/src/features/landing/screens/ProductLandingScreen.tsx` y `apps/web/src/features/help/components/HelpCenterPage.tsx`.

**Corrección propuesta:** mover estilos a CSS o garantizar serialización consistente. Regresión: carga directa sin errores de hidratación y estilos correctos con JavaScript inicial/deshabilitado. La reproducción fue en desarrollo local; queda pendiente confirmar el síntoma en despliegue productivo.

## Datos QA y estado final

El proveedor **QA Auditoría 2026-09-17 — NO COMERCIAL** continúa aprobado y oculto. Su perfil y servicio quedaron privados; la regla de capacidad de esta prueba quedó desactivada. Las reservas creadas por la prueba de capacidad se cancelaron. El miembro agregado al hogar QA quedó con permiso `view`.

El profesional **QA Auditoría — NO PROFESIONAL REAL** quedó suspendido. Se revocaron los grants activos y las autorizaciones aún aprobadas; las solicitudes ya completadas y sus atenciones/documento permanecen como evidencia, con vencimiento temporal original de una hora. No se deben usar esos registros como información clínica real.

La protectora **QA Protectora — NO REAL** quedó suspendida. La mascota de transferencia ficticia permanece en el hogar receptor QA, según el flujo probado; no se revirtió artificialmente el historial. No se publicó una ficha de adopción ni un perfil protector público.

Los IDs completos están en los JSON de evidencia y en el avance anterior. No se incluyeron contraseñas, claves, sesiones, tokens QR ni URLs firmadas en los entregables.

## Cobertura y límites

La matriz `MATRIZ_110_FUNCIONES.csv` relaciona las 110 fichas del canvas con resultados API, web y mobile. **Parcial** significa que hay al menos un caso ejecutado, no que todas las variantes estén cubiertas. **No ejecutada** no significa que la función falle o no exista.

No había dispositivos en `adb devices`; Docker estaba instalado pero sin motor disponible. Se logró exportar Android e iOS. No se atribuyen a esos exports pruebas de cámara, QR, permisos del sistema, notificaciones, iOS Simulator o Android real. Tampoco se sustituye esa validación por un navegador estrecho.

La documentación histórica mezcla estados de slices antiguos y actuales. Ejemplo: `docs/modules/clinic.md` contiene contenido de proveedores; el contrato clínico relevante está en `docs/modules/clinical_access.md`. La auditoría usa evidencia actual y deja las afirmaciones históricas como contexto, sin contarlas como pruebas de esta sesión.

## Orden recomendado de corrección y cierre

1. **Clínica, H01–H03 — servidor corregido:** controles y regresiones instalados; conservar prueba de concurrencia específica como pendiente.
2. **Consentimiento y recuperación, H04–H05 — servidor corregido, clientes por publicar:** publicar web/mobile y validar revocación en dispositivo. Recuperación de adjunto probada en web local.
3. **Capacidad, H06 — servidor corregido:** 16 regresiones y dos carreras reales pasaron; conservar cobertura de excepciones/horarios como pendiente.
4. **Web, H07–H08 — validado localmente:** desplegar y comprobar la versión publicada; regresiones de navegador y build pasaron.
5. **Cobertura restante:** embudo público de adopción, compromisos, PET ALERT con OTP y moderación, documentos/Storage, QR operativo, mensajes/reviews/soporte y funciones de cuenta pendientes en la matriz.
6. **Mobile real:** ejecutar recorridos por rol en un Android de pruebas y un entorno iOS, con cámara, notificaciones y permisos. Registrar versión exacta del binario.

H01–H06 tienen correcciones de servidor aplicadas y comprobadas; los pasos de reproducción anteriores corresponden al baseline auditado. H04/H05 requieren publicación de clientes y prueba nativa. H07/H08 están implementados y validados localmente. Sigue publicar clientes, verificar la versión desplegada y ampliar la cobertura pendiente.
