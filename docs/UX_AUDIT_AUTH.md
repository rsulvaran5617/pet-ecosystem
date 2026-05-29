# UX_AUDIT_AUTH.md

## Alcance revisado

- Mobile: `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`, `apps/mobile/src/features/core/hooks/useCoreWorkspace.ts`.
- Web: `apps/web/src/features/core/screens/CoreExperienceScreen.tsx`, `apps/web/src/features/core/hooks/useCoreWorkspace.ts`.
- Contrato: Auth y Me en `docs/api/API_CONTRACT.md`.

## Hallazgos

ID: AUTH-001
Modulo: Auth
Flujo: Recuperacion de acceso / OTP
Pantalla/Componente: `useCoreWorkspace`, paneles `recover`, `verify`, `isRecoverySession`
Severidad: Alto
Tipo: Funcional
Problema detectado: El flujo de recovery y deep link depende de que el enlace vuelva al contenedor correcto. En mobile existe manejo por `Linking`, pero si el enlace se abre en navegador o no consume correctamente la sesion, el usuario puede quedar en una pantalla sin accion util.
Impacto en el usuario: El usuario puede quedar bloqueado fuera de la cuenta, repetir solicitudes, activar rate limit y perder confianza en el piloto.
Recomendacion: Definir y probar una ruta unica de recuperacion para APK instalada y web. Agregar fallback visible: "Abre este enlace desde el mismo telefono donde tienes la app" o "Ingresa el codigo recibido".
Criterio de aceptacion: En Android APK, un usuario puede solicitar recovery, abrir el enlace, definir nueva contrasena e iniciar sesion sin pantalla en blanco. En web, el enlace lleva a una pantalla con estado claro. Los errores de enlace expirado o ya usado se muestran en espanol.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P0

ID: AUTH-002
Modulo: Auth
Flujo: Login / registro / recuperacion
Pantalla/Componente: `Notice`, `runAction`, `errorMessage`, `configError`
Severidad: Alto
Tipo: Texto/UX Writing
Problema detectado: Mobile muestra mensajes provenientes de errores internos sin una capa completa de traduccion. Web ya oculta un caso puntual de lock de Supabase, pero no hay catalogo general de errores amigables.
Impacto en el usuario: Mensajes como rate limit, auth token o authenticated user required confunden y no indican una accion clara.
Recomendacion: Crear un mapper de errores de autenticacion para mobile/web con mensajes accionables: credenciales incorrectas, correo no verificado, demasiados intentos, enlace expirado, configuracion faltante.
Criterio de aceptacion: Ningun error comun de Supabase se muestra crudo al usuario final. Cada error incluye una accion sugerida y mantiene tono humano.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P0

ID: AUTH-003
Modulo: Auth
Flujo: Acceso inicial mobile/web
Pantalla/Componente: `CoreHomeScreen`, `CoreExperienceScreen`
Severidad: Medio
Tipo: Procedimental
Problema detectado: Mobile tiene login por defecto y paneles ocultos, mientras web conserva una experiencia historicamente mas densa y orientada a registro/diagnostico.
Impacto en el usuario: Usuarios piloto que alternan web/mobile pueden no reconocer el mismo circuito de acceso.
Recomendacion: Unificar la arquitectura de acceso: login como modo principal, registro/OTP/recovery como acciones secundarias, sin contenido operativo hasta autenticar.
Criterio de aceptacion: Mobile y web muestran la misma jerarquia: iniciar sesion, crear cuenta, verificar codigo y recuperar acceso. La pantalla sin sesion no mezcla marketplace, datos de rol ni modulos internos.
Complejidad estimada: Media
Riesgo tecnico: Bajo
Prioridad sugerida: P1

ID: AUTH-004
Modulo: Auth
Flujo: Formularios de acceso
Pantalla/Componente: `Field`, `Button`, `SegmentedControl`, `Pressable`
Severidad: Medio
Tipo: Accesibilidad
Problema detectado: Muchos controles custom no declaran explicitamente `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` o estado activo.
Impacto en el usuario: Usuarios con lector de pantalla o navegacion asistida pueden no entender si estan en login, registro, OTP o recovery.
Recomendacion: Agregar etiquetas accesibles a tabs, botones de envio, campos de email/password/token y mensajes de error.
Criterio de aceptacion: TalkBack lee el nombre del panel activo, cada campo tiene etiqueta, y cada boton indica accion y estado deshabilitado si aplica.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P1
