# Inventario de Datos para Privacidad y Tiendas

Estado: borrador operativo para App Store / Google Play. Requiere validacion de Product Owner y revision legal.

Fecha de borrador: 2026-08-06

## Objetivo

Inventariar los datos tratados por Pet Ecosystem para preparar:

- politica de privacidad;
- Data Safety de Google Play;
- App Privacy de Apple;
- revision de permisos;
- matriz de retencion y eliminacion.

## Resumen ejecutivo

Pet Ecosystem trata informacion de cuenta, hogares, mascotas, documentos, salud basica, recordatorios, proveedores, reservas, mensajeria, soporte, evidencia operacional y adopcion responsable.

La mayor parte del dato privado se controla por usuario, hogar, proveedor o familia protectora. Las superficies publicas deben limitarse a perfiles publicados y datos minimizados.

## Inventario por modulo

| Modulo | Datos principales | Fuente/entidades | Visibilidad | Finalidad | Retencion/eliminacion |
| --- | --- | --- | --- | --- | --- |
| Auth/perfil | nombre, apellido, correo, telefono opcional, rol, estado de cuenta | Supabase Auth, `profiles`, `user_roles` | usuario, admin/soporte segun alcance | cuenta, autenticacion, roles, soporte | anonimizable por eliminacion de cuenta; auditabilidad conservada |
| Households | hogar, miembros, invitaciones, permisos | `households`, `household_members`, `household_invitations` | miembros autorizados | administrar grupo familiar/protector y permisos | conservar historial funcional; ajustar o anonimizar segun solicitud |
| Pets | nombre, especie, raza, sexo, fecha nacimiento, estado, avatar, notas | `pets`, `pet_profiles`, `pet-avatars` | miembros del hogar; publico solo en adopcion publicada | expediente base de mascota | no borrar fisicamente por defecto; estado `in_memory` conserva historial |
| Documents | archivos, tipo, titulo, metadata, emision/vencimiento | `pet_documents`, buckets privados | miembros autorizados; comparticion futura controlada | expediente documental y soporte | privados; posibles retenciones por operacion/adopcion/auditoria |
| Health/vaccines | vacunas, alergias, condiciones, fechas, notas, sticker | `pet_vaccines`, `pet_allergies`, `pet_conditions`, `pet_documents` | miembros autorizados del hogar | cuidado basico y organizacion; no diagnostico | privados; eliminar/anonimizar sujeto a reglas de historial y permisos |
| Reminders | recordatorio, fecha/hora, estado, mascota/hogar | `reminders`, `calendar_events` | miembros autorizados | agenda y alertas locales | pueden eliminarse o quedar historicos segun implementacion |
| Marketplace | busqueda, filtros, proveedores/servicios visibles, seleccion | provider public data, marketplace clients | publico/autenticado segun vista | descubrir servicios aprobados | busquedas no deben persistir si no hay necesidad |
| Bookings | hogar, mascota, proveedor, servicio, slot, precio, estado | `bookings`, `booking_pricing`, `booking_status_history` | owner autorizado, provider involucrado, admin soporte | reserva y seguimiento operacional | conservar por operacion, soporte, auditoria |
| QR/evidence | token/QR temporal, check-in/out, evidencia, reportes | `booking_operation_tokens`, `booking_operations`, `booking_operation_evidence`, `booking_operation_report` | provider involucrado, admin; owner segun alcance definido | ejecucion y trazabilidad del servicio | conservar por evidencia operacional y soporte |
| Provider | negocio, perfil publico, documentos, servicios, horarios/cupos, ubicacion publica | `provider_organizations`, `provider_public_profiles`, `provider_services`, `provider_availability_rules`, `provider_documents`, `provider_public_locations` | provider/admin; publico solo perfil/servicios/ubicacion publicada | operar oferta y marketplace | documentos privados; perfiles publicos retirables; historial con reservas se conserva |
| Foster/adoption | perfil protector, publicaciones, solicitudes, documentos, transferencias | `protective_household_profiles`, `pet_adoption_listings`, `pet_adoption_applications`, `pet_transfer_records`, documentos Foster | familia protectora, solicitante, admin; publico solo ficha publicada | adopcion responsable y custodia digital | conservar trazabilidad de solicitudes/transferencias; no publicar datos sensibles |
| Admin/support | casos, revision, moderacion, auditoria | `support_cases`, `audit_logs`, estados admin | admin/soporte autorizado | soporte, seguridad, cumplimiento, moderacion | conservar para auditoria y soporte |
| Analytics/logs | logs tecnicos, eventos de seguridad, errores | Supabase logs, hosting, EAS, herramientas futuras | equipo tecnico autorizado | seguridad, diagnostico, estabilidad | minimizar, rotar y documentar proveedores |

## Categorias para Google Play Data Safety

Matriz preliminar:

| Categoria Play | Aplica | Ejemplos |
| --- | --- | --- |
| Personal info | Si | nombre, correo, telefono opcional |
| Photos and videos | Si | fotos de mascotas, documentos/evidencia si son imagenes |
| Files and docs | Si | documentos de mascota, aprobacion, adopcion, evidencia |
| Health and fitness | Revisar | vacunas/alergias/condiciones de mascota; no es salud humana, pero puede requerir declaracion cuidadosa |
| Location | Si para proveedores | ubicacion publica declarada por proveedor; no tracking del owner en baseline |
| App activity | Si | reservas, busqueda, interacciones, mensajes |
| App info and performance | Posible | logs/crash si se activan herramientas |
| Device or other IDs | Posible | identificadores tecnicos por plataforma/proveedor si se activan notificaciones, analytics o crash reporting |

## Categorias para Apple App Privacy

Matriz preliminar:

| Categoria Apple | Aplica | Nota |
| --- | --- | --- |
| Contact Info | Si | email, nombre, telefono opcional |
| User Content | Si | documentos, fotos, mensajes, evidencia |
| Health and Fitness | Revisar | datos de salud de mascotas; validar clasificacion Apple |
| Location | Si limitada | ubicacion publica de proveedor; confirmar si la app solicita ubicacion del dispositivo |
| Identifiers | Posible | Supabase/auth/device/build tooling |
| Usage Data | Posible | si se habilita analytics |
| Diagnostics | Posible | si se habilita crash reporting |

## Datos sensibles y precauciones

Requieren cuidado especial:

- documentos de mascotas;
- certificados o soportes vacunales;
- datos de salud de mascotas;
- evidencia operacional;
- documentos de adopcion;
- solicitudes de adopcion;
- ubicacion publica de proveedores;
- datos de contacto;
- audit logs y soporte.

Reglas recomendadas:

- usar buckets privados para documentos;
- usar URL firmada temporal;
- no exponer rutas internas de storage;
- no publicar direcciones exactas de owners o familias protectoras;
- limitar admin a soporte, revision, auditoria y moderacion;
- registrar trazabilidad de accesos/mutaciones criticas;
- no usar datos sensibles para marketing sin consentimiento explicito.

## Permisos mobile relevantes

Permisos declarados/documentados:

- Camara: QR, fotos de mascotas y evidencia.
- Fotos/galeria: imagenes de mascotas, documentos y evidencia.
- Notificaciones locales: recordatorios del usuario.
- Mapa/ubicacion proveedor: visualizacion o declaracion de ubicacion publica de proveedores.

Pendiente:

- confirmar si se solicita ubicacion precisa del dispositivo en runtime.
- confirmar si habra push remoto.
- confirmar si se usa tracking/advertising ID.

## Eliminacion y retencion

El flujo STORE-DEL-1:

- anonimiza perfil y datos personales directos;
- desactiva roles y metodos guardados;
- bloquea acceso futuro;
- conserva reservas, chats, soporte, evidencia, reviews, operaciones y auditoria cuando sea necesario.

La pagina publica de eliminacion:

```text
https://petecosyst.com/account-deletion
```

## Puntos que requieren confirmacion del Product Owner

1. Entidad legal responsable y jurisdiccion.
2. Correo oficial de privacidad y soporte.
3. Politica de privacidad publica URL final.
4. Edad minima/audiencia objetivo.
5. Si se activara analitica, crash reporting o marketing tracking.
6. Si se solicitaran permisos de ubicacion del dispositivo.
7. Retencion por tipo de dato y plazos.
8. Tratamiento de documentos sensibles al eliminar cuenta.
9. Si Google Play/App Store se enviaran como app para publico general o piloto cerrado.
10. Si habra pagos reales en una fase posterior y su politica separada.

## Riesgos de compliance

- Falta de politica de privacidad publicada antes de enviar tiendas.
- Data Safety/App Privacy incompleta si no se declaran fotos, documentos, mensajes o reservas.
- Ambiguedad sobre datos de salud de mascotas frente a categorias de tienda.
- Riesgo de afirmar seguridad absoluta o validez oficial de documentos.
- Riesgo de no explicar retencion de reservas/chats/evidencia tras eliminacion.
- Riesgo de exponer datos de adopcion/familia protectora o ubicacion exacta.
- Falta de correo oficial bajo dominio de produccion.

## Recomendaciones para paginas publicas

Crear paginas estaticas en web:

- `/privacy` para politica de privacidad.
- `/data-deletion` o mantener `/account-deletion` como pagina de eliminacion.
- `/terms` para terminos y condiciones cuando esten listos.

Requisitos visuales:

- lenguaje claro;
- fecha de vigencia visible;
- contacto visible;
- secciones faciles de navegar;
- compatible mobile;
- no bloquear por login.

## Estado recomendado antes de tiendas

Antes de subir a revision:

- publicar politica de privacidad en URL estable;
- confirmar pagina de eliminacion con `HTTP 200`;
- completar Data Safety y App Privacy con esta matriz;
- revisar textos con asesor legal;
- conservar copia versionada en docs.
