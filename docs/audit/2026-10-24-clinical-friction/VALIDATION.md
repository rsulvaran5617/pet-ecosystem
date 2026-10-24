# Clinical Access: solicitud y aprobacion — 2026-10-24

Base: `bc7eb81a946fc4ce0f55a741dfee17018cf8805d`; cambios locales sin publicar.
Superficies: profesional Web y Owner Mobile. Sin SQL, migraciones ni mutaciones
de produccion durante esta validacion.

## Resultado funcional automatizado

`node docs/audit/2026-10-24-clinical-friction/browser-check.mjs`: 15/15 PASS.
Usa Chrome headless y componentes React reales con APIs simuladas; los componentes
React Native se adaptan al DOM. Evidencia: `browser-result.json`.

- Seis permisos iniciales; desmarcar diagnostico lo excluye del envio.
- Desmarcar todos impide enviar.
- Identidad se guarda y envia a revision con una accion.
- Aprobacion habilita formulario sin recarga y refrescar conserva el borrador.
- Aviso global incluye profesional y mascota; CTA abre la revision explicita.
- Descartar no repite el aviso y conserva entrada a pendientes.
- Aprobar transmite los permisos solicitados; Rechazar tambien funciona.
- Solicitud aprobada sale de pendientes; primer plano descubre solicitudes nuevas.
- Sin excepciones no capturadas.

`corepack pnpm --filter @pet/mobile test`: 4/4 PASS. Cubre multiples hogares,
exclusion de view/protective, vencimiento, fecha invalida, errores de consulta,
cola vacia y timestamp opcional.

## Validacion tecnica

- Lint Web y Mobile: PASS.
- Typecheck Web y Mobile: PASS tras corregir timestamp opcional. La primera
  ejecucion web coincidio con regeneracion de `.next/types` durante el build;
  se repitio despues de terminar la compilacion.
- Build Next Web: PASS.
- Export Expo Android/iOS: PASS (bundles generados; no son binarios instalados).

## Limites y prueba manual pendiente

No acredita RLS con actores reales, funcionamiento nativo del Modal, instalacion
de binarios ni notificaciones push. Avisos solo dentro de app activa/al volver.
No se implementa aprobacion Owner Web ni lectura de archivos por QR.

Antes del release, probar con cuentas distintas en telefono real:
1. Owner en Inicio, doctor envia solicitud; llega aviso en hasta un ciclo de 15 s
   mas la latencia de red.
2. Revisar y aprobar; doctor ve formulario en hasta 8 s mas latencia.
3. Repetir con rechazo, app en segundo plano/retorno, otra mascota/hogar y cambio
   de cuenta. No debe filtrarse informacion de la sesion anterior.
4. Probar desconexion y `Actualizar solicitudes`, sin perder QR ni borrador.
5. Verificar que permiso revocado/vencido sigue rechazando nuevas escrituras.

Para publicar se requiere desplegar Web y distribuir una nueva version Mobile.
Actualizar solo la gota no instala el aviso en las apps existentes.
