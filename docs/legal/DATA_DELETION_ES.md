# Eliminacion de Cuenta y Datos

Estado: borrador para revision humana/legal antes de publicacion.

Fecha de borrador: 2026-08-06

## Objetivo

Este documento explica como Pet Ecosystem gestiona solicitudes de eliminacion o anonimizacion de cuenta y datos personales.

## Canales de solicitud

El usuario puede solicitar eliminacion o anonimizacion por:

1. App mobile: `Cuenta > Eliminar cuenta`.
2. Pagina publica: `https://petecosyst.com/account-deletion`.
3. Correo de soporte/privacidad pendiente de confirmar.

## Flujo dentro de la app

En la app mobile, el usuario debe:

1. Iniciar sesion.
2. Abrir `Cuenta`.
3. Seleccionar `Eliminar cuenta`.
4. Escribir `ELIMINAR`.
5. Confirmar la accion irreversible.

Despues de la solicitud, la app cierra sesion.

## Comportamiento tecnico actual

El flujo actual usa la RPC `request_account_deletion()` en Supabase.

La operacion:

- marca el perfil como `deletion_requested`;
- registra `deletion_requested_at` y `deleted_at`;
- anonimiza nombre, apellido, correo visible, telefono, avatar y preferencias;
- anonimiza direcciones guardadas;
- desactiva roles de usuario;
- desactiva metodos de pago guardados del piloto;
- bloquea acceso futuro en `auth.users`;
- registra un evento de auditoria;
- cierra la sesion desde la app.

## Datos que se anonimizan o desactivan

Se anonimizan o desactivan datos personales directos, incluyendo:

- perfil base;
- datos visibles de contacto;
- direcciones guardadas;
- roles activos;
- metodos guardados en modo piloto/payment-ready;
- metadata de acceso futuro.

## Datos que pueden conservarse

Pet Ecosystem puede conservar datos transaccionales o historicos cuando sean necesarios para operacion, soporte, seguridad, auditoria o cumplimiento.

Ejemplos:

- reservas;
- historial de estados de reservas;
- chats asociados a reservas;
- casos de soporte;
- resenas;
- evidencia operacional;
- reportes de servicio;
- audit logs;
- trazabilidad de adopciones o transferencias;
- documentos o registros vinculados a operaciones que deban conservarse temporalmente.

La conservacion debe limitarse al proposito necesario y evitar exponer datos personales innecesarios.

## Reservas activas o procesos pendientes

La eliminacion de cuenta no cancela automaticamente:

- reservas activas;
- procesos de soporte;
- solicitudes de adopcion en curso;
- transferencias pendientes;
- obligaciones operativas o legales.

Si existe un proceso activo, soporte puede requerir informacion adicional para cerrar el caso de forma ordenada.

## Solicitudes manuales

Si el usuario no tiene acceso a la app, puede solicitar eliminacion desde `https://petecosyst.com/account-deletion`.

La solicitud manual debe incluir:

- correo registrado;
- nombre o referencia de cuenta si la recuerda;
- descripcion breve de la solicitud;
- informacion adicional que ayude a validar titularidad.

Plazo documental estimado: hasta 7 dias calendario para revision inicial. Este plazo debe confirmarse antes de publicacion legal.

## Limitaciones

Pet Ecosystem puede rechazar, pausar o pedir validacion adicional si:

- no se puede verificar la titularidad;
- existe riesgo de fraude o abuso;
- hay una obligacion operacional, legal, soporte o auditoria pendiente;
- la solicitud afecta datos de terceros, proveedores, hogares o adopciones que requieren tratamiento separado.

## Relacion con tiendas

Este documento soporta los requisitos de App Store y Google Play sobre eliminacion de cuenta, pero no reemplaza la politica de privacidad completa.

URL publica de eliminacion:

```text
https://petecosyst.com/account-deletion
```

## Pendientes antes de publicar

- Confirmar correo oficial de privacidad.
- Confirmar responsable legal.
- Confirmar plazos definitivos de atencion y retencion.
- Confirmar tratamiento de archivos sensibles asociados a mascotas/adopcion.
- Confirmar si se implementara borrado fisico diferido en un slice futuro.
