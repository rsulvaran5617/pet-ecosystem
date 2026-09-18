# Auditoría por roles — avance del 17 de septiembre de 2026

Estado: auditoría en curso. Este informe registra la activación del proveedor y pruebas iniciales; no certifica todas las funciones ni las interfaces web/mobile.

## Proveedor habilitado

- Negocio: **QA Auditoría 2026-09-17 — NO COMERCIAL**.
- Organización: `716bfcd5-41f5-4a93-88b2-937980a54cf9`.
- Servicio: **QA Paseo de prueba**, `0be97ab6-a83a-4dd8-94b0-cdbbd4fae5d4`.
- Cuenta: actor de pruebas configurado como `QA_PROVIDER` / `PILOT_PROVIDER`. Credenciales excluidas del informe.
- Estado: aprobado por el actor administrador; modo proveedor activo en la cuenta QA.
- Visibilidad final: negocio, perfil y servicio privados. Fue publicado temporalmente para verificar descubrimiento y reservas y ocultado al terminar.
- Disponibilidad básica: martes, 09:00–12:00. No equivale a haber verificado las reglas de capacidad por servicio.
- Para revisarlo: iniciar sesión con la cuenta QA de proveedor, entrar a la consola Proveedor y seleccionar el negocio por su nombre. No aparecerá en el marketplace público mientras esté oculto.

## Evidencia ejecutada

Pruebas mediante el cliente API compartido contra el backend configurado, usando sesiones separadas de proveedor, administrador, propietario, miembro ajeno al hogar QA y visitante. Los resultados no prueban interacción visual, dispositivos reales ni equivalencia del código local con el despliegue web.

| Rol | Comprobación | Resultado |
| --- | --- | --- |
| Proveedor | Crear organización y servicio QA | Ejecutado |
| Proveedor | Intentar aprobar su propio negocio pendiente | Bloqueado |
| Administrador | Aprobar negocio QA | Correcto |
| Propietario ajeno | Consultar detalle privado del negocio | Bloqueado |
| Visitante | Buscar proveedor privado | No aparece |
| Visitante | Buscar proveedor aprobado durante publicación temporal | Aparece |
| Propietario | Previsualizar reserva | Requiere aprobación |
| Propietario | Crear reserva | Pendiente de aprobación |
| Usuario ajeno al hogar | Consultar reserva QA | Bloqueado |
| Usuario ajeno al hogar | Aprobar reserva QA | Bloqueado |
| Proveedor | Confirmar reserva propia | Confirmada |
| Propietario | Consultar hilo generado por reserva | Existe |
| Proveedor | Completar reserva confirmada | Completada |
| Propietario | Cancelar otra reserva pendiente | Cancelada |
| Proveedor | Activar modo proveedor en cuenta QA | Correcto |
| Visitante | Reconsultar después de ocultar | No aparece |

El primer intento de previsualización se bloqueó por falta de disponibilidad. Se configuró el horario del fixture y se repitió el flujo correctamente. Es una precondición operativa, no un defecto confirmado.

No se enviaron mensajes de chat, no se generaron reseñas ni solicitudes de soporte y no se procesaron cobros. La existencia del hilo no verifica envío, recepción ni tiempo real.

## Datos de prueba conservados

| Entidad | Identificador / estado |
| --- | --- |
| Hogar QA | `07f6714d-2b98-4472-a512-bedc10a898a1` |
| Mascota QA | `8905b844-09c7-4896-ae92-8fc0400b1f67` |
| Reserva completada | `b12e53ef-4bd7-4bd4-a688-b622995ca3c6` |
| Reserva cancelada | `997ccc2d-6346-4994-8aa9-9de2cfbcd6af` |

Se conservan para trazabilidad. No se modificaron los negocios anteriores. No se desplegaron cambios de producto ni migraciones.

## Validación local y cobertura pendiente

`corepack pnpm typecheck` y `corepack pnpm lint` terminaron correctamente en los siete workspaces. Los scripts `test` de las apps y del cliente API son placeholders: no deben contarse como una suite funcional aprobada. No se certificó un build de producción en este avance.

| Grupo funcional | Evidencia actual | Trabajo pendiente |
| --- | --- | --- |
| Cuenta y roles | Login de actores QA y cambio a proveedor | Registro, recuperación, preferencias, baja y UI |
| Hogar y mascotas | Creación del fixture QA | Matriz view/edit/book/pay/admin, documentos y salud |
| Marketplace y proveedor | Alta, aprobación, publicación temporal y ocultación | Avatar, documentos, mapas y UI en ambos canales |
| Reservas | Flujo básico y dos bloqueos entre usuarios | Cupos simultáneos, zona horaria, cancelación, QR y operaciones |
| Mensajería | Hilo automático existente | Envío, recepción, adjuntos y aislamiento del contenido |
| Familia protectora y adoptante | Documentación funcional disponible | Aprobación, publicación, solicitudes y transferencia con fixtures dedicados |
| PET ALERT | Documentación funcional disponible | Reporte, moderación, privacidad, OTP y reclamaciones |
| Profesional clínico | Revisión estática iniciada | Consentimiento, revocación, adjuntos, rectificación y pruebas de regresión |
| Administrador | Aprobación del proveedor QA | Resto de decisiones, permisos y trazabilidad |

## Puntos clínicos que requieren reproducción

La revisión local identificó candidatos, aún sin reproducción remota ni calificación definitiva:

1. Contrastar la revocación de `pet_clinical_access_grants` con autorizaciones de escritura ya emitidas. Revisar `revoke_pet_clinical_access` en `supabase/migrations/20260901110000_clinical_access_read_only.sql` y consumidores en las migraciones clínicas posteriores.
2. Verificar que finalizar documentos y rectificaciones vuelva a validar autorización vigente y estado del profesional: `supabase/migrations/20260901190000_clinical_access_documents_timeline.sql`.
3. Reproducir fallo del adjunto después de guardar una atención. `ProfessionalIdentityPanel.tsx` guarda primero la atención, luego el archivo, y presenta un error conjunto; revisar recuperación e idempotencia con `20260901170000_clinical_access_append_only_encounters.sql`.

No se alteraron datos clínicos reales para investigar estos casos.

## Próximos pasos

1. Probar capacidad y concurrencia con el proveedor QA; validar permisos granulares del hogar y accesos cruzados.
2. Ejecutar recorridos visuales web/mobile, incluyendo errores, vacíos, cambio de organización y recuperación de operaciones fallidas.
3. Preparar fixtures de familia protectora, adoptante y profesional; probar transferencias y revocación de consentimiento sin datos reales.
4. Completar la matriz de las 110 funciones del canvas con estado por canal, evidencia, severidad y pasos de reproducción; generar informe final descargable.

## Archivos de evidencia y reproducción

- `evidence/provider-activation.json`: aprobación y controles de acceso/visibilidad.
- `evidence/bookings.json`: nueve aserciones del recorrido de reserva y confirmación de ocultación final.
- `evidence/typecheck.log`, `evidence/lint.log`: comprobaciones locales; archivos ignorados por Git por la regla general de logs.
- `activate-qa-provider.mjs` y `booking-probe.mjs`: scripts de ejecución; utilizan las variables QA existentes sin guardar secretos. Ejecutarlos produce cambios en el backend configurado. El segundo vuelve a crear reservas si se repite; no es una comprobación de solo lectura.

Referencia de código local: `1352e4c272d1475520a0409ad32e336967c343b0`. Fecha local: 17 de septiembre; los JSON usan UTC y registran 18 de septiembre.
