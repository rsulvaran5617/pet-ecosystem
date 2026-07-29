# GOOGLE_PLAY_READINESS.md

## Objetivo

Preparar Pet Ecosystem mobile para Google Play Console en modalidad `closed testing`, sin publicacion publica todavia.

## Diagnostico Android actual

| Area | Estado |
| --- | --- |
| App mobile | `apps/mobile` Expo SDK 51 / React Native 0.74 |
| Package Android | `com.petecosystem.mobile` |
| Version Expo | `0.3.1` en `apps/mobile/app.json` |
| Gradle local | `versionName "0.0.0"` / `versionCode 1` en `android/app/build.gradle`; EAS usa `appVersionSource: remote` y `autoIncrement` en production |
| targetSdkVersion | `34` desde `apps/mobile/android/build.gradle` |
| minSdkVersion | `23` |
| Build production | `apps/mobile/eas.json` genera `android.buildType = app-bundle` |
| Firma | EAS/Play App Signing recomendado para tienda; el release local Gradle usa debug keystore y no debe subirse a Play |
| APK QA | Solo para piloto privado; Play Store debe recibir `.aab` |

## Permisos y capacidades declaradas

Declarados desde Expo/config plugins:

- Camara: QR, fotos de mascotas y evidencia de servicio.
- Fotos/galeria: imagenes de mascotas, documentos y evidencia.
- MapLibre: mapa/ubicacion publica de proveedores. La app no debe rastrear ubicacion del owner en este baseline.
- Notificaciones locales: recordatorios en dispositivo con permiso del usuario. No hay push remoto obligatorio en este baseline.

## STORE-DEL-2

URL publica requerida:

```text
https://petecosyst.com/account-deletion
```

Estado local:

- ruta creada en `apps/web/src/app/account-deletion/page.tsx`;
- enlace agregado al footer de la landing publica;
- explica eliminacion desde la app mobile y solicitud manual por correo;
- detalla datos anonimizados y datos transaccionales retenidos;
- no llama APIs, no toca Supabase y no cambia reglas de negocio.

Correo operativo mostrado:

```text
hola@pet-ecosystem.com
```

Si se define un correo oficial bajo `petecosyst.com`, actualizar la pagina y esta documentacion antes de enviar a Play.

## Data Safety preliminar

Declaracion preliminar para completar en Play Console. Debe ser validada contra la politica de privacidad final.

Datos que la app puede recopilar o procesar:

- Informacion personal: nombre, correo, telefono opcional, rol.
- Mascotas: nombre, especie, raza, sexo, fecha de nacimiento, fotos/avatar.
- Salud/documentos: vacunas, alergias, condiciones, documentos de mascota y evidencia.
- Hogar: nombre del hogar, miembros, invitaciones y permisos.
- Reservas: proveedor, servicio, horario, estado, mascota, precio snapshot.
- Mensajes: chats vinculados a reservas.
- Soporte/reviews: casos de soporte y resenas basicas.
- Fotos/archivos: mascotas, documentos, evidencia y adopcion/familia protectora cuando aplique.
- Ubicacion publica de proveedores: ciudad/pais/coordenadas declaradas por provider, no direccion privada del owner.

Usos principales:

- funcionamiento de cuenta y autenticacion;
- gestion de mascotas/hogar;
- descubrimiento de proveedores;
- reservas y seguimiento operacional;
- mensajeria y soporte;
- seguridad, auditoria y prevencion de abuso;
- notificaciones/recordatorios locales.

Comparticion:

- no hay venta de datos;
- provider ve solo informacion necesaria de reservas visibles;
- admin ve informacion para aprobacion, soporte o auditoria segun alcance;
- datos publicos del marketplace/adopcion se limitan a campos publicados.

Eliminacion:

- app mobile: Cuenta > Eliminar cuenta;
- web publica: `https://petecosyst.com/account-deletion`;
- STORE-DEL-1 anonimiza datos personales y conserva historial transaccional necesario para operacion/soporte/auditoria.

## Checklist Play Console closed testing

1. Confirmar cuenta Google Play Developer activa.
2. Crear app en Play Console con package `com.petecosystem.mobile`.
3. Configurar App signing by Google Play.
4. Completar ficha Store listing: nombre, descripcion corta/larga, categoria, contacto, screenshots, icono y grafica.
5. Configurar Privacy Policy URL y Account deletion URL.
6. Completar Data Safety con base en esta matriz.
7. Completar App content: target audience, ads, content rating, data safety, government apps si aplica, financial features si aplica.
8. Generar AAB production con EAS.
9. Subir AAB a `Closed testing`.
10. Crear tester list y compartir enlace privado.
11. Ejecutar smoke QA con testers: registro, login, mascotas, marketplace, reservas, chat, QR/evidencia, eliminacion de cuenta con usuario descartable.
12. Registrar incidencias antes de solicitar production access.

Nota: cuentas personales nuevas de Play Developer pueden requerir prueba cerrada con al menos 12 testers durante 14 dias antes de solicitar acceso a produccion. Confirmar en la consola de la cuenta real.

## Comando para generar AAB production

Desde la raiz:

```powershell
cd "C:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/mobile lint
corepack pnpm --filter @pet/mobile typecheck
corepack pnpm --filter @pet/mobile exec eas build --platform android --profile production
```

Alternativa desde `apps/mobile`:

```powershell
cd "C:\Users\Ramon Sulvaran\pet-ecosystem\apps\mobile"
eas build --platform android --profile production
```

El resultado esperado es un Android App Bundle `.aab` gestionado por EAS.

## Riesgos pendientes antes de closed testing

- `targetSdkVersion 34`: Google Play exige niveles actuales; desde el 31 de agosto de 2026 nuevas apps/updates deben apuntar a Android 16/API 36. Planificar upgrade de Expo/React Native/Android antes de produccion publica.
- falta politica de privacidad publica final y URL canonica;
- falta confirmar correo oficial de soporte bajo dominio de produccion;
- falta generar AAB production firmado por EAS/Play App Signing;
- falta QA real de eliminacion de cuenta en build mobile posterior a STORE-DEL-1;
- Data Safety debe validarse legalmente antes del envio publico.

## Fuentes oficiales

- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Android App Bundles: https://developer.android.com/guide/app-bundle
- Target API level: https://developer.android.com/google/play/requirements/target-sdk
