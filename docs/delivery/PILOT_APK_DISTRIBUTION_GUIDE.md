# PILOT_APK_DISTRIBUTION_GUIDE.md

## Objetivo

Distribuir la APK Android de Pet Ecosystem a usuarios piloto mediante enlace privado, sin publicar en Play Store y sin usar Firebase App Distribution en esta primera ronda.

## Audiencia

- Propietarios piloto.
- Proveedores piloto.
- Equipo interno/admin.

## Version del APK

| Campo | Valor |
| --- | --- |
| Archivo local | `dist/pilot/android/pet-ecosystem-pilot-v0.3.0-android-release.apk` |
| Fecha de preparacion | 2026-05-17 |
| Rama | `master` |
| Commit | `pendiente: cierre QA mobile pre-piloto` |
| Referencia | `v0.3.0-booking-capacity-ops.1 + hardening QA mobile` |
| Ambiente | Supabase remoto configurado en mobile `.env` |
| Uso | Piloto controlado, no produccion comercial |
| SHA256 | `2F2B9F0A638723783900328EEBDC0A416068567B53BE6A670550BF6FD79442A7` |

La app sigue en modo `payment-ready`: no realiza cobros reales.

## Dónde guardar el APK

Subir manualmente el APK a una carpeta privada:

- Google Drive;
- OneDrive;
- SharePoint.

Estructura recomendada:

```text
Pet Ecosystem / Piloto / APK / v0.3.0 / 2026-05-17 /
```

Archivo recomendado:

```text
pet-ecosystem-pilot-v0.3.0-android-release.apk
```

No subir el APK a carpetas publicas, redes sociales, grupos abiertos o enlaces sin control de acceso.

No distribuir APK debug. El APK debug requiere Metro activo en desarrollo y puede mostrar el error `Unable to load script` en telefonos piloto. Para distribucion privada se debe usar el APK release generado con bundle JavaScript incluido.

## Cómo compartir

1. Subir el APK manualmente a la carpeta privada.
2. Crear enlace privado.
3. Restringir acceso a emails de usuarios piloto.
4. Compartir el enlace solo por WhatsApp/email directo o grupo controlado.
5. Indicar que el enlace no debe reenviarse.
6. Registrar quién recibió el enlace y en qué fecha.

## Instrucciones para instalar en Android

1. Abrir el enlace privado desde el celular Android.
2. Descargar el archivo APK.
3. Aceptar la descarga si Android muestra advertencia.
4. Abrir el archivo descargado.
5. Si Android bloquea la instalacion, entrar a Ajustes.
6. Permitir `Instalar apps desconocidas` solo para el navegador, Drive, OneDrive o app de archivos usada.
7. Volver al APK e instalar.
8. Abrir `Pet Ecosystem`.
9. Registrarse o iniciar sesion.
10. Si el usuario lo desea, volver a desactivar el permiso de instalacion desconocida.

## Advertencias para usuarios

- Esta es una app piloto.
- No hay cobros reales.
- Puede requerir permiso de camara para QR.
- Puede requerir acceso a archivos/fotos para cargar evidencia o documentos.
- Si aparece un error, tomar captura de pantalla.
- Reportar modelo del telefono y version Android si falla la instalacion o apertura.

## Mensaje para propietarios

```text
Hola. Ya esta disponible la APK privada del piloto de Pet Ecosystem.

Por favor instala la app desde este enlace privado:
[PEGAR ENLACE PRIVADO]

Pasos:
1. Descarga el APK.
2. Si Android lo solicita, permite instalar apps desde esta fuente.
3. Abre Pet Ecosystem.
4. Crea tu cuenta como Propietario de mascota.
5. Completa tu perfil, crea tu hogar y registra tu mascota.
6. Busca el proveedor asignado y realiza la reserva de prueba.
7. Durante el servicio, muestra el QR de check-in y luego el QR de check-out al proveedor.

No habra cobros reales durante esta prueba.
Si algo falla, envia captura de pantalla y modelo de tu telefono.
```

## Mensaje para proveedores

```text
Hola. Ya esta disponible la APK privada del piloto de Pet Ecosystem.

Por favor instala la app desde este enlace privado:
[PEGAR ENLACE PRIVADO]

Pasos:
1. Descarga el APK.
2. Si Android lo solicita, permite instalar apps desde esta fuente.
3. Abre Pet Ecosystem.
4. Crea tu cuenta como Proveedor.
5. Completa tu perfil y crea tu negocio.
6. Configura perfil publico, ubicacion, servicio, horarios/capacidad y documentos.
7. Espera la aprobacion del admin.
8. Cuando recibas una reserva, apruebala si corresponde.
9. Escanea el QR de check-in y luego el QR de check-out del propietario.
10. Carga la evidencia documental al finalizar.

No habra cobros reales durante esta prueba.
Si algo falla, envia captura de pantalla y modelo de tu telefono.
```

## Checklist de soporte

| Item | Estado | Observaciones |
| --- | --- | --- |
| Usuario recibio enlace privado | TBD |  |
| Usuario pudo descargar APK | TBD |  |
| Usuario pudo instalar APK | TBD |  |
| Usuario pudo abrir app | TBD |  |
| Usuario pudo registrarse | TBD |  |
| Usuario pudo iniciar sesion | TBD |  |
| Usuario acepto permiso de camara cuando corresponde | TBD |  |
| Usuario pudo cargar documento/evidencia si aplica | TBD |  |
| Usuario reporto dispositivo/modelo Android si falla | TBD |  |

## Comando usado para preparar APK

En Windows, para evitar limites de longitud de ruta con CMake/PNPM, se uso una copia corta local en `C:\pb` con el mismo commit que `master`.

```powershell
git clone --local "c:\Users\Ramon Sulvaran\pet-ecosystem" C:\pb
cd C:\pb
corepack pnpm install --frozen-lockfile
cd C:\pb\apps\mobile\android
$env:NODE_ENV="production"
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2
```

Despues se copio:

```text
C:\pb\apps\mobile\android\app\build\outputs\apk\release\app-release.apk
```

a:

```text
dist/pilot/android/pet-ecosystem-pilot-v0.3.0-android-release.apk
```

## Verificacion local del APK

La verificacion ZIP basica confirmo:

- `AndroidManifest.xml` presente;
- archivos `.dex` presentes;
- `assets/index.android.bundle` presente;
- `resources.arsc` presente.

No se subio el APK a ningun servicio externo desde el agente.
