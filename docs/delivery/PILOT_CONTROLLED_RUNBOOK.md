# PILOT_CONTROLLED_RUNBOOK.md

## Objetivo del piloto

Preparar y ejecutar un piloto controlado real de Pet Ecosystem con 3 proveedores, 3 propietarios de mascotas y 1 usuario admin interno.

El piloto busca validar que usuarios reales pueden completar el circuito operativo:

- registro y acceso mobile;
- configuracion de proveedor;
- aprobacion admin;
- discovery en marketplace;
- reserva con slot/capacidad;
- QR check-in/check-out;
- evidencia documental posterior al check-out;
- soporte y seguimiento basico.

El piloto no busca validar produccion comercial amplia ni cobro real.

## Definiciones de resultado

| Estado | Significado |
| --- | --- |
| PASS | El paso se completo sin ayuda tecnica especial y el resultado coincide con lo esperado. |
| FAIL | El paso no se completo o produjo un resultado incorrecto, pero no bloquea todo el piloto. |
| BLOCK | El paso bloquea la continuidad del flujo principal o impide completar una prueba critica. |

## Alcance incluido

- 3 proveedores reales.
- 3 propietarios reales.
- 1 admin interno.
- Instalacion Android mediante APK.
- Admin web para aprobacion y soporte.
- Registro real con email/password.
- Booking por capacidad con slots.
- QR check-in/check-out.
- Evidencia documental.
- Marketplace con proveedores aprobados/publicos.
- Ubicacion publica del proveedor ya configurada.
- Avatares/fotos si el usuario las provee.

## Alcance excluido

- Pagos reales, captura, refunds, conciliacion o payouts.
- Produccion comercial amplia.
- Publicacion en tienda abierta.
- Nuevas features V2/V3.
- Geolocalizacion avanzada, tracking o permisos GPS.
- Borrado de datos historicos.
- Limpieza destructiva de datos.
- Clinic, commerce, pharmacy, benefits, finance o telecare.

## Roles participantes

### Owner / Propietario

Usuario final que registra su hogar, mascotas, busca proveedores y crea reservas.

### Provider / Proveedor

Usuario que registra un negocio, publica servicios, configura capacidad, opera reservas, escanea QR y carga evidencia.

### Admin / Operador de plataforma

Usuario interno que revisa proveedores pendientes, aprueba/rechaza y gestiona soporte basico.

## Flujo de registro inicial

1. Instalar la APK de piloto.
2. Abrir la app.
3. Seleccionar `Crear cuenta`.
4. Completar email, contrasena, nombre y apellido.
5. Seleccionar rol inicial:
   - propietario: `Propietario de mascota`;
   - proveedor: `Proveedor`.
6. Crear cuenta.
7. Revisar correo y completar verificacion si Supabase lo solicita.
8. Iniciar sesion con email y contrasena.
9. Completar perfil desde Cuenta.
10. Confirmar que el rol activo corresponde al flujo asignado.

Nota operativa: para este piloto, crear cada usuario con su rol correcto desde el inicio. No depender de cambio/agregado de rol posterior.

## Flujo proveedor

Checklist por proveedor:

1. Instalar APK.
2. Registrarse como `Proveedor`.
3. Iniciar sesion.
4. Completar perfil personal.
5. Entrar a `Negocio`.
6. Crear negocio.
7. Completar perfil publico.
8. Subir avatar/logo si esta disponible.
9. Crear al menos 1 servicio publico y activo.
10. Configurar horarios/capacidad.
11. Configurar ubicacion publica con coordenadas validas.
12. Subir documentos de aprobacion.
13. Revisar `Estado` y confirmar pasos pendientes.
14. Esperar aprobacion admin.
15. Confirmar que aparece en marketplace owner.
16. Recibir reserva entrante.
17. Aprobar reserva si el servicio es `approval_required`.
18. Abrir detalle de reserva.
19. Escanear QR de check-in mostrado por owner.
20. Escanear QR de check-out mostrado por owner.
21. Cargar evidencia documental de actividad.
22. Confirmar timeline operacional con `Documento registrado`.

## Flujo propietario

Checklist por propietario:

1. Instalar APK.
2. Registrarse como `Propietario de mascota`.
3. Iniciar sesion.
4. Completar perfil personal.
5. Crear hogar.
6. Crear mascota activa.
7. Subir avatar/foto de mascota si aplica.
8. Entrar a `Buscar`.
9. Buscar proveedor asignado.
10. Abrir perfil del proveedor.
11. Seleccionar servicio.
12. Ver horarios/cupos.
13. Seleccionar slot disponible.
14. Generar preview.
15. Confirmar que preview no consume cupo.
16. Confirmar reserva.
17. Esperar aprobacion provider si aplica.
18. Abrir detalle de reserva confirmada.
19. Mostrar QR check-in al proveedor.
20. Ver check-in registrado.
21. Mostrar QR check-out al proveedor.
22. Ver check-out registrado.
23. Revisar timeline.
24. Revisar evidencia documental si esta visible en el flujo actual.
25. Dejar resena si la reserva queda completada y aplica.
26. Crear caso de soporte si hubo incidente.

## Flujo admin

Checklist admin:

1. Entrar al admin web.
2. Iniciar sesion con usuario admin interno.
3. Abrir `Proveedores`.
4. Revisar proveedores pendientes.
5. Abrir detalle de cada proveedor.
6. Revisar negocio, perfil publico, servicios, disponibilidad, ubicacion y documentos.
7. Aprobar proveedor si cumple criterios.
8. Rechazar solo si hay inconsistencia real y documentada.
9. Abrir `Soporte`.
10. Revisar casos creados durante el piloto.
11. Cambiar estado de soporte si aplica.
12. Registrar observaciones operativas.

## Matriz de participantes

No registrar credenciales en este documento.

| Codigo | Nombre real | Email | Rol | Negocio asignado | Mascota asignada | Estado de registro | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ADM-01 | TBD | TBD | Admin | N/A | N/A | Pendiente | Usuario interno. |
| PROV-01 | TBD | TBD | Provider | TBD | N/A | Pendiente | Proveedor piloto 1. |
| PROV-02 | TBD | TBD | Provider | TBD | N/A | Pendiente | Proveedor piloto 2. |
| PROV-03 | TBD | TBD | Provider | TBD | N/A | Pendiente | Proveedor piloto 3. |
| OWN-01 | TBD | TBD | Owner | PROV-01 | TBD | Pendiente | Owner piloto 1. |
| OWN-02 | TBD | TBD | Owner | PROV-02 | TBD | Pendiente | Owner piloto 2. |
| OWN-03 | TBD | TBD | Owner | PROV-03 | TBD | Pendiente | Owner piloto 3. |

## Datos minimos requeridos por proveedor

| Dato | Requerido | Observacion |
| --- | --- | --- |
| Nombre del negocio | Si | Debe ser reconocible para el owner. |
| Ciudad | Si | Usada en marketplace. |
| Pais | Si | Usar `PA` para piloto Panama. |
| Ubicacion publica | Si | Debe tener coordenadas distintas de `0,0`. |
| Perfil publico | Si | Debe estar visible/publico. |
| Avatar/logo | Opcional | Recomendado para confianza visual. |
| Servicio | Si | Al menos 1 servicio activo/publico. |
| Precio | Si | Referencial; sin cobro real. |
| Duracion | Si | Debe ser consistente con cupos. |
| Capacidad | Si | Recomendado cupo 1 o 2 para pruebas controladas. |
| Horarios | Si | Deben cubrir fechas del piloto. |
| Documento | Si | Al menos 1 documento de aprobacion. |
| Aprobacion admin | Si | Necesaria para marketplace. |

## Datos minimos requeridos por owner

| Dato | Requerido | Observacion |
| --- | --- | --- |
| Nombre | Si | Perfil personal. |
| Email | Si | No documentar contrasena. |
| Hogar | Si | Necesario para mascotas/reservas. |
| Mascota activa | Si | No usar mascota `En memoria`. |
| Foto/avatar mascota | Opcional | Recomendado para UX. |
| Metodo guardado | Opcional | Payment-ready, sin cobro real. |
| Proveedor asignado | Si | Facilita QA controlada. |

## Matriz de pruebas

| Caso | Usuario | Rol | Flujo | Paso | Resultado esperado | Resultado real | PASS/FAIL/BLOCK | Evidencia | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P-REG-01 | PROV-01 | Provider | Registro | Crear cuenta provider | Cuenta creada y sesion iniciada/verificable | TBD | TBD | Screenshot/video |  |
| P-SET-01 | PROV-01 | Provider | Setup negocio | Crear negocio + perfil + servicio + horario + ubicacion + documento | Estado listo para revision admin | TBD | TBD | Screenshot |  |
| A-APP-01 | ADM-01 | Admin | Aprobacion | Aprobar proveedor | Provider aprobado y visible si publico | TBD | TBD | Screenshot |  |
| O-REG-01 | OWN-01 | Owner | Registro | Crear cuenta owner + hogar + mascota | Owner listo para reservar | TBD | TBD | Screenshot |  |
| O-MKT-01 | OWN-01 | Owner | Marketplace | Buscar proveedor asignado | Provider aparece en resultados | TBD | TBD | Screenshot |  |
| O-BOOK-01 | OWN-01 | Owner | Booking | Seleccionar slot + preview + confirmar | Reserva creada sin consumir cupo en preview | TBD | TBD | Video |  |
| P-OPS-01 | PROV-01 | Provider | Operacion | Aprobar + escanear QR check-in/out | Timeline registra entrada y salida | TBD | TBD | Video |  |
| P-EVD-01 | PROV-01 | Provider | Evidencia | Cargar evidencia documental | Timeline muestra documento registrado | TBD | TBD | Screenshot |  |
| S-SUP-01 | OWN-01 | Owner/Admin | Soporte | Crear y revisar caso | Caso visible para admin | TBD | TBD | Screenshot | Opcional si hubo incidente. |

Duplicar los casos para PROV-02/OWN-02 y PROV-03/OWN-03.

## Criterios de entrada

- APK de piloto disponible.
- Admin web funcionando.
- Supabase remoto al dia.
- Usuarios piloto definidos.
- Canal de soporte definido.
- Proveedores historicos/demo ocultos o controlados.
- 3 providers piloto con datos completos.
- 3 owners piloto con hogar y mascota activa.
- Admin interno con acceso validado.
- Instrucciones de instalacion enviadas.
- Responsable de soporte disponible durante la prueba.

## Criterios de salida

- 3 owners registrados.
- 3 providers registrados.
- 3 providers aprobados.
- Al menos 3 reservas completas.
- QR check-in validado.
- QR check-out validado.
- Evidencia documental validada.
- Marketplace validado.
- Admin approval validado.
- Soporte revisado si aplica.
- Issues criticos documentados con evidencia.
- Decision final: continuar piloto, corregir, o detener.

## Preparacion no destructiva de datos

No borrar proveedores historicos.

Para evitar interferencia en marketplace, ocultar datos fuera del piloto usando una o mas opciones:

- `provider_organizations.is_public = false`;
- `provider_public_profiles.is_public = false`;
- `provider_services.is_public = false`;
- `provider_services.is_active = false`.

El archivo `docs/delivery/PILOT_DATA_PREPARATION.sql` contiene consultas de diagnostico y updates opcionales comentados. No debe ejecutarse sin aprobacion explicita.

## Distribucion de APK

### Opcion A: APK manual por enlace privado

Pasos:

1. Generar APK instalable.
2. Renombrar archivo con version y fecha.
3. Subir a Google Drive/OneDrive privado.
4. Compartir enlace solo con usuarios piloto.
5. Enviar instrucciones para permitir instalacion desde fuente externa.

Ventajas:

- Rapida para 3 providers y 3 owners.
- No requiere configurar tienda.
- Bajo esfuerzo inicial.

Riesgos:

- Control de version manual.
- Algunos Android bloquean instalacion desde fuentes desconocidas.
- Menor trazabilidad de quien instalo.
- Los usuarios pueden confundir versiones si reciben multiples enlaces.

### Opcion B: Firebase App Distribution

Ventajas:

- Recomendado para pilotos controlados.
- Invita testers por email.
- Mejor control de versiones.
- Mejor trazabilidad de builds.
- Evita publicar en tienda.

Costos/consideraciones:

- Requiere configurar Firebase.
- Requiere registrar app Android.
- Requiere instalar/usar Firebase CLI o proceso equivalente.

### Opcion C: Google Play Internal Testing

Ventajas:

- Camino mas formal hacia Play Store.
- Mejor para etapas posteriores.
- Manejo de testers interno desde Play Console.

Costos/consideraciones:

- Requiere cuenta Google Play Developer.
- Mas configuracion.
- Menos rapido para una prueba inicial pequena.

### Recomendacion para este piloto

Para 3 proveedores y 3 owners, la alternativa mas rapida y controlada es:

1. Usar APK manual por enlace privado para la primera prueba seca.
2. Migrar a Firebase App Distribution si se repiten builds o se agregan mas testers.

### Comandos sugeridos para generar APK

Desde Windows PowerShell:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/mobile typecheck
corepack pnpm --filter @pet/mobile lint
cd apps/mobile/android
.\gradlew.bat assembleDebug
```

APK esperado:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Nombre recomendado para distribuir:

```text
pet-ecosystem-pilot-android-v0.3.0-plus-YYYYMMDD-debug.apk
```

Si se requiere build release firmado, definir primero estrategia de keystore. No compartir keystores ni credenciales por chat o documentos.

### Donde guardar el APK

- Carpeta privada: `Piloto Pet Ecosystem / Builds / Android`.
- Subcarpeta por fecha: `YYYY-MM-DD`.
- Mantener solo un enlace activo por ronda.

### Checklist de instalacion Android

1. Descargar APK desde enlace privado.
2. Abrir archivo descargado.
3. Permitir instalacion desde el navegador/Drive si Android lo solicita.
4. Instalar.
5. Abrir app.
6. Iniciar registro.
7. Reportar screenshot si Android bloquea la instalacion.

## Guia simple para propietarios

Mensaje sugerido:

```text
Hola. Gracias por participar en el piloto de Pet Ecosystem.

1. Instala la APK desde el enlace privado.
2. Abre la app y crea una cuenta como Propietario de mascota.
3. Verifica tu correo si la app lo solicita.
4. Completa tu perfil.
5. Crea tu hogar.
6. Registra una mascota.
7. Entra a Buscar y selecciona el proveedor asignado.
8. Elige servicio y horario disponible.
9. Genera la vista previa y confirma la reserva.
10. En el momento del servicio, muestra el QR de check-in al proveedor.
11. Al finalizar, muestra el QR de check-out.
12. Si algo falla, toma captura y reportalo por el canal de soporte del piloto.

No se realizara ningun cobro real durante esta prueba.
```

## Guia simple para proveedores

Mensaje sugerido:

```text
Hola. Gracias por participar como proveedor piloto de Pet Ecosystem.

1. Instala la APK desde el enlace privado.
2. Crea una cuenta como Proveedor.
3. Verifica tu correo si la app lo solicita.
4. Completa tu perfil.
5. Entra a Negocio y crea tu negocio.
6. Completa perfil publico, ubicacion, servicio, horarios/capacidad y documentos.
7. Espera aprobacion del admin.
8. Cuando recibas una reserva, apruebala si corresponde.
9. En el detalle de reserva, escanea el QR de check-in que te muestra el propietario.
10. Al finalizar, escanea el QR de check-out.
11. Carga la evidencia documental de actividad.
12. Si algo falla, toma captura y reportalo por el canal de soporte del piloto.

No se procesaran pagos reales durante esta prueba.
```

## Guia simple para admin

Mensaje sugerido:

```text
1. Entra al admin web.
2. Inicia sesion con tu usuario admin.
3. Abre Proveedores.
4. Revisa cada proveedor pendiente.
5. Valida negocio, perfil publico, servicio, ubicacion y documentos.
6. Aprueba el proveedor si esta listo para piloto.
7. Abre Soporte para revisar casos creados durante las pruebas.
8. Registra cualquier incidente con screenshot, usuario, rol y paso.
```

## Plan de contingencia

| Situacion | Accion |
| --- | --- |
| No llega correo | Revisar spam, confirmar email escrito, reintentar login/verificacion. Si persiste, registrar BLOCK y revisar Supabase Auth. |
| APK no instala | Confirmar Android, permisos de fuente externa y espacio disponible. Enviar screenshot del error. |
| Usuario no puede iniciar sesion | Confirmar email/password, verificacion y conectividad. Probar recovery solo si aplica. |
| Proveedor no aparece en marketplace | Revisar aprobacion admin, `is_public`, perfil publico, servicio activo/publico, horario/capacidad y ubicacion. |
| QR no escanea | Validar brillo de pantalla, permisos de camara, token no expirado y reserva confirmada. Reintentar generando QR nuevo. |
| Evidencia no sube | Confirmar check-in/check-out registrados, archivo valido y conectividad. Tomar captura del error. |
| Cupo agotado | Confirmar que el mensaje indique elegir otro horario. Seleccionar otro slot disponible. |
| Admin no puede aprobar | Confirmar rol admin, sesion web, proveedor pendiente y conectividad. Registrar error exacto. |
| Mapa no muestra todos los proveedores | Confirmar ubicacion publica con coordenadas validas diferentes de `0,0`. El mapa no usa GPS del owner. |

## Evidencia a capturar

- Screenshot de registro exitoso.
- Screenshot de proveedor aprobado.
- Screenshot de provider visible en marketplace.
- Screenshot/video de slot seleccionado.
- Screenshot de preview.
- Screenshot de reserva confirmada.
- Video corto de QR check-in.
- Video corto de QR check-out.
- Screenshot de evidencia documental registrada.
- Screenshot de soporte si aplica.

## Comandos de validacion tecnica antes de entregar APK

```powershell
git status --branch --short
corepack pnpm --filter @pet/types typecheck
corepack pnpm --filter @pet/api-client typecheck
corepack pnpm --filter @pet/mobile lint
corepack pnpm --filter @pet/mobile typecheck
corepack pnpm --filter @pet/admin lint
corepack pnpm --filter @pet/admin typecheck
git diff --check
```

No ejecutar migraciones ni `supabase db push` para este runbook.
