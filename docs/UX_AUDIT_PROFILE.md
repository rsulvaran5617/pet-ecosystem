# UX_AUDIT_PROFILE.md

## Alcance revisado

- Mobile cuenta/perfil: `apps/mobile/src/features/core/screens/CoreHomeScreen.tsx`.
- Web cuenta/perfil: `apps/web/src/features/core/screens/CoreExperienceScreen.tsx`.
- Contrato: `GET/PATCH /me`, roles, direcciones y payment methods.

## Hallazgos

ID: PROF-001
Modulo: Perfil
Flujo: Roles posteriores al registro
Pantalla/Componente: Cuenta / cambio de rol
Severidad: Alto
Tipo: Procedimental
Problema detectado: El usuario puede cambiar solo entre roles que ya posee. No se observa un flujo claro para solicitar o agregar un rol nuevo despues del registro.
Impacto en el usuario: Un owner que quiere convertirse en provider, o un provider que tambien necesita operar como owner, requiere intervencion fuera del producto.
Recomendacion: Documentar politica de piloto y, si se habilita, crear un slice pequeno "Solicitar rol proveedor" con estado pendiente y aprobacion.
Criterio de aceptacion: Desde Cuenta, el usuario ve claramente que roles tiene, cual esta activo y que debe hacer si necesita agregar otro rol. Si el slice no se implementa, el runbook debe indicar provisioning manual.
Complejidad estimada: Media
Riesgo tecnico: Medio
Prioridad sugerida: P0

ID: PROF-002
Modulo: Perfil
Flujo: Cuenta mobile
Pantalla/Componente: Datos personales, preferencias, direcciones, metodos guardados
Severidad: Medio
Tipo: Procedimental
Problema detectado: Cuenta agrupa varias responsabilidades. Aunque hay secciones plegables, el usuario puede no distinguir entre informacion personal, preferencias, direcciones y datos payment-ready.
Impacto en el usuario: Aumenta el tiempo para encontrar una accion concreta y puede generar errores de edicion.
Recomendacion: Mantener modo lectura por defecto y abrir formularios con CTA de editar por seccion. Mostrar estado breve: completo, pendiente o actualizado.
Criterio de aceptacion: En una pantalla pequena, el usuario puede identificar en menos de 5 segundos como editar datos personales, direccion y preferencias sin ver todos los formularios abiertos.
Complejidad estimada: Media
Riesgo tecnico: Bajo
Prioridad sugerida: P1

ID: PROF-003
Modulo: Perfil
Flujo: Metodos guardados
Pantalla/Componente: Cuenta owner / Home owner / booking preview
Severidad: Medio
Tipo: Texto/UX Writing
Problema detectado: El sistema esta en modo `payment-ready`, pero los metodos guardados pueden interpretarse como tarjetas con cobro real si el copy se reduce demasiado.
Impacto en el usuario: Expectativas incorrectas sobre pagos, reclamos durante piloto o temor a cargos.
Recomendacion: Mantener microcopy estable: "Referencia para futuras reservas. No hay cobro real en este piloto." Evitar terminos como checkout/cobro en pantallas de usuario final.
Criterio de aceptacion: Toda pantalla que muestre metodos guardados aclara de forma breve que no procesa pagos reales. La aclaratoria no ocupa el foco principal.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P1

ID: PROFILE-004
Modulo: Perfil
Flujo: Formularios cuenta
Pantalla/Componente: Campos de perfil, direcciones, preferencias
Severidad: Bajo
Tipo: Accesibilidad
Problema detectado: Las validaciones y cambios exitosos dependen de avisos visuales; no siempre hay semantica accesible equivalente.
Impacto en el usuario: Usuarios con asistencia pueden no recibir confirmacion de guardado o detalle de error.
Recomendacion: Usar regiones `status`/`alert` equivalentes en web y propiedades de accesibilidad en mobile para errores y confirmaciones.
Criterio de aceptacion: Un lector de pantalla anuncia error de campo, guardado exitoso y estado de switches sin requerir inspeccion visual.
Complejidad estimada: Baja
Riesgo tecnico: Bajo
Prioridad sugerida: P3
