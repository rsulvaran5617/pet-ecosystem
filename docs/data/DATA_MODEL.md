# DATA_MODEL.md

## Entidad central
La entidad principal del sistema es `pet`.

## Relaciones clave
- un usuario autenticado tiene un perfil base en `profiles`
- un usuario puede tener multiples `user_roles`
- un usuario puede tener multiples `user_addresses`
- un usuario puede tener multiples `payment_methods`
- un usuario puede pertenecer a multiples hogares
- un hogar puede tener multiples mascotas
- una mascota pertenece a un hogar
- una mascota puede tener multiples documentos y registros de salud
- un proveedor puede tener multiples servicios
- una reserva conecta mascota, hogar, proveedor y servicio
- pagos, soporte, reviews y chat orbitan alrededor de la reserva o transaccion

## Reglas estructurales
- `auth.users` es la fuente de identidad autenticada y sincroniza el perfil base en `profiles`
- `profiles` concentra perfil base y preferencias
- `user_roles` resuelve el cambio de rol basico del MVP
- `user_addresses` pertenece al usuario, no al hogar
- `payment_methods` almacena metodos guardados del usuario; el cobro ocurre en `payments`
- no mezclar ownership de dueno con ownership de proveedor
- la visibilidad de datos depende de household membership y organization scoping
- las entidades sensibles deben quedar auditadas
- el diseno debe permitir crecer a V2 y V3 sin rehacer el nucleo del MVP
