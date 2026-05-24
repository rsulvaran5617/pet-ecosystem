# apps/mobile

Super app Expo del duenio de mascota para el MVP.

## Responsabilidad

- auth/core
- households
- pets
- health
- reminders
- marketplace
- bookings
- messaging
- reviews
- support
- provider workspace base cuando el usuario activa rol `provider`

## Estado actual

Ya no es bootstrap tecnico. Este workspace usa clientes reales de Supabase y mantiene el baseline funcional del MVP en React Native + Expo.

El script `build` de este workspace valida export nativo `android + ios`. La exportacion web no forma parte del baseline movil canónico.

## Reglas

La APK piloto Android se genera con EAS Build usando el perfil `preview`. Ver `docs/deployment/MOBILE_APK_RELEASE.md`.

- no duplicar tipos ni DTOs de dominio
- usar `packages/types`, `packages/api-client`, `packages/config` y `packages/ui`
- no acceder directo a SQL ni reimplementar reglas del backend en UI
