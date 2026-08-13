# STORE_READINESS.md

## Objetivo

Preparar Pet Ecosystem mobile para revision de App Store y Play Store sin abrir pagos reales ni cambiar reglas de negocio del MVP.

## STORE-DEL-1 - Eliminacion de cuenta

Estado: implementado y aplicado remoto.

Alcance:

- mobile muestra la opcion `Eliminar cuenta` dentro de `Cuenta`;
- el usuario debe escribir `ELIMINAR` y confirmar una alerta irreversible;
- el cliente llama la RPC `request_account_deletion()`;
- la RPC anonimiza `profiles`, desactiva `user_roles`, desactiva `payment_methods`, anonimiza `user_addresses`, bloquea acceso futuro en `auth.users` y registra `audit_logs`;
- la app cierra sesion despues de la solicitud.

Retencion:

- se conservan reservas, chats, soporte, reviews, operaciones y auditoria;
- se conserva historial provider/admin necesario para continuidad operacional y soporte;
- no se borra fisicamente `auth.users` en este slice para evitar cascadas destructivas sobre tablas transaccionales.

Fuera de alcance:

- endpoint web publico de solicitud de eliminacion para usuarios que no tienen la app instalada;
- politica legal final de privacidad/retencion;
- borrado fisico diferido despues de ventana legal/operativa;
- pagos reales.

## Validaciones esperadas

```powershell
corepack pnpm --filter @pet/mobile typecheck
corepack pnpm --filter @pet/mobile lint
corepack pnpm --filter @pet/mobile build
git diff --check
```

## Siguiente slice recomendado

## STORE-DEL-2 - Pagina publica de eliminacion

Estado: implementado localmente en web, pendiente de desplegar en `petecosyst.com`.

URL esperada:

```text
https://petecosyst.com/account-deletion
```

Alcance:

- pagina publica sin login en `apps/web/src/app/account-deletion/page.tsx`;
- explica solicitud desde app mobile: Cuenta > Eliminar cuenta;
- ofrece solicitud manual por correo;
- explica datos personales anonimizados y datos transaccionales retenidos;
- queda enlazada desde el footer de la landing publica.

## Siguiente slice recomendado

Publicar la web en la gota/DigitalOcean y completar politica de privacidad/Data Safety/App Privacy antes de envio publico a tiendas.

## MOBILE-BADGES-1 - Badge count del icono

Estado: implementado localmente para mobile iOS/Android sin push notifications server-side.

Alcance:

- usa `expo-notifications` ya instalado en `apps/mobile`;
- actualiza el badge del icono con `Notifications.setBadgeCountAsync`;
- limpia el badge a `0` cuando no hay sesion autenticada;
- no solicita permisos invasivos ni agrega pantallas nuevas;
- no crea migraciones, tablas, RLS, pagos ni reglas de negocio nuevas.

Fuentes reales del contador:

- Owner: reservas `pending_approval`/`confirmed`, recordatorios `pending` vencidos o dentro de 7 dias, invitaciones de hogar pendientes.
- Provider: reservas `pending_approval` de la organizacion cargada.
- Familia Protectora: invitaciones de hogar pendientes y perfil protector que requiere atencion (`draft`, `pending_review` o `rejected`).

Limitaciones:

- Mensajes no leidos quedan fuera porque no existe marca canonica de lectura por participante.
- Solicitudes Foster nuevas y transferencias pendientes quedan fuera hasta exponer un conteo canonico fuera del componente de mascotas o crear fuente persistida segura.
- iOS soporta badge nativo. Android se maneja como best effort porque depende del launcher/fabricante; si el dispositivo no lo soporta, la app no falla.
