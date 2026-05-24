# Mobile APK release

## Objetivo

Formalizar la generacion de APK privada para pilotos Android de Pet Ecosystem.

La ruta oficial para APK piloto es EAS Build con perfil `preview`. No se recomienda compilar la APK localmente en Windows como flujo principal.

## Motivo

La app mobile usa Expo con modulos nativos:

- `@maplibre/maplibre-react-native`
- `expo-camera`
- `expo-document-picker`
- `expo-image-picker`
- `react-native-svg`
- `react-native-qrcode-svg`
- `@react-native-async-storage/async-storage`

Los builds locales Android dependen de Gradle, Android SDK, CMake, Ninja y rutas de `node_modules`. En los logs locales previos el fallo principal fue:

```text
Filename longer than 260 characters
```

El error ocurrio durante `expo-modules-core:buildCMakeDebug` por una ruta larga generada por PNPM + React Native + CMake/Ninja en Windows. Esto no indica que la app sea demasiado grande; indica que el build nativo local no es estable en ese entorno.

## Perfil oficial

Archivo:

```text
apps/mobile/eas.json
```

Perfil piloto:

```text
preview
```

Resultado esperado:

```text
APK instalable para distribucion interna
```

Perfil futuro de tienda:

```text
production -> Android App Bundle (.aab)
```

## Checklist antes de generar APK

Ejecutar desde la raiz del repo:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"

corepack pnpm install
corepack pnpm --filter @pet/mobile typecheck
corepack pnpm --filter @pet/mobile lint
git diff --check
```

Confirmar que el commit que se va a probar esta identificado:

```powershell
git status --short --branch
git rev-parse --short HEAD
```

## Generar APK piloto

Ejecutar desde la raiz del repo:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"

corepack pnpm --filter @pet/mobile build:android:preview
```

Alternativa desde la app mobile:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"

eas build --platform android --profile preview
```

## Nombre recomendado del artefacto

Usar este formato para registrar la APK:

```text
pet-ecosystem-pilot-<version>-<yyyymmdd>-<commit>.apk
```

Ejemplo:

```text
pet-ecosystem-pilot-0.0.0-20260524-9902eba.apk
```

## Registro de release piloto

Por cada APK, registrar:

- fecha
- commit
- perfil EAS usado
- cambios incluidos
- link o ubicacion del artefacto
- usuario/dispositivo de prueba
- resultado de instalacion
- incidencias encontradas

## Reglas de estabilidad

- No agregar modulos nativos sin generar una APK `preview`.
- No depender de `expo export` como APK instalable.
- No mezclar cambios mobile con backend/Supabase durante un build piloto.
- No imprimir secretos ni variables `.env`.
- Mantener `typecheck`, `lint` y `git diff --check` en verde antes del build.
- Si cambia `app.json`, permisos nativos o dependencias nativas, generar una APK nueva.

## Troubleshooting

Si el build local de Android falla con rutas largas, usar EAS Build.

Si EAS solicita autenticacion:

```powershell
eas login
```

Si EAS solicita configurar credenciales Android, permitir que EAS gestione credenciales para el piloto, salvo que se defina una keystore oficial del proyecto.
