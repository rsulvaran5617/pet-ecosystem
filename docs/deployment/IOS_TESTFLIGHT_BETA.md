# IOS_TESTFLIGHT_BETA.md

## Objetivo

Preparar una beta privada iOS de Pet Ecosystem mediante EAS Build y TestFlight, sin abrir nuevas funcionalidades ni cambiar reglas de negocio.

## Alcance

- App mobile Expo en `apps/mobile`.
- Distribucion privada iOS por TestFlight.
- Usuarios piloto internos o externos aprobados desde App Store Connect.
- Sin cambios de Supabase, RLS, RPCs, Payments ni backend.

## Configuracion actual

- Expo SDK: 51.
- App version: `0.3.1`.
- iOS bundle identifier: `com.petecosyst.mobile`.
- iOS build number inicial: `1`.
- Scheme/deep link: `petecosystem`.
- EAS project id configurado en `apps/mobile/app.json`.
- Perfil EAS iOS `production` usa imagen `latest` para cumplir el requisito vigente de App Store Connect de compilar con iOS 26 SDK / Xcode 26 o superior.
- Variables esperadas:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Permisos iOS

La app declara textos de permiso para:

- camara: QR operativo, fotos de mascotas y evidencia del servicio;
- fotos: seleccion de imagenes de mascotas, documentos y evidencia;
- guardado en fototeca si el usuario decide guardar imagenes desde la app.

La app no debe pedir ubicacion GPS en este baseline iOS. El marketplace geolocalizado usa ubicacion publica declarada por proveedores y origen controlado, sin tracking.

## Prerrequisitos Apple

1. Cuenta Apple Developer activa.
2. App creada en App Store Connect.
3. Bundle ID registrado: `com.petecosyst.mobile`.
4. Acceso a App Store Connect para subir builds.
5. Testers internos o externos definidos.
6. Variables `EXPO_PUBLIC_*` disponibles para EAS.

## Validaciones previas

Ejecutar desde la raiz del repo:

```powershell
corepack pnpm --filter @pet/mobile lint
corepack pnpm --filter @pet/mobile typecheck
corepack pnpm --filter @pet/mobile build
git diff --check
```

## Generar build iOS

Desde la raiz del repo:

```powershell
cd "C:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/mobile exec eas login
corepack pnpm --filter @pet/mobile exec eas build --platform ios --profile production
```

Tambien puede ejecutarse desde `apps/mobile`:

```powershell
cd "C:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"
eas login
eas build --platform ios --profile production
```

## Subir a TestFlight

Cuando el build termine:

```powershell
cd "C:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"
eas submit --platform ios --profile production --latest
```

Si EAS solicita credenciales, usar cuenta Apple Developer o App Store Connect API Key segun la politica del proyecto.

## Checklist de QA iOS privado

| Area | Esperado | Estado |
| --- | --- | --- |
| Instalacion TestFlight | Usuario instala la beta privada | TBD |
| Login/registro | Usuario puede entrar sin errores tecnicos | TBD |
| Owner mascotas | Crear/ver mascota y avatar | TBD |
| Marketplace | Buscar proveedor y revisar ubicacion publica | TBD |
| Reservas | Seleccionar slot, preview y confirmar | TBD |
| QR | Generar/leer QR en flujo operativo | TBD |
| Evidencia | Subir/consultar evidencia segun rol | TBD |
| Mensajes | Enviar/recibir mensajes in-app | TBD |
| Provider | Crear/editar negocio, servicios y horarios | TBD |
| Admin web | Aprobar proveedor desde web/admin fuera de la app iOS | TBD |

## Riesgos y notas

- MapLibre usa modulo nativo; el primer build iOS debe confirmar compilacion y render en dispositivo fisico.
- TestFlight requiere configuracion Apple y puede pedir revision beta para testers externos.
- El uso de cifrado se declara como no exento solo para cifrado estandar de plataforma/HTTPS; si se incorpora criptografia propia o pagos, revisar de nuevo.
- No hay push notifications iOS en este baseline.
- No hay pagos reales en este baseline.
- Si App Store Connect rechaza el binario por SDK antiguo, confirmar que `apps/mobile/eas.json` mantiene `ios.image: latest` o una imagen EAS con Xcode 26+.

## Criterio de cierre

El frente iOS Beta Privada queda listo cuando:

- el build EAS iOS termina correctamente;
- el build se sube a TestFlight;
- al menos un tester instala la beta;
- se ejecuta smoke owner/provider sobre iPhone fisico;
- no aparecen errores criticos de permisos, auth, QR o modulos nativos.
