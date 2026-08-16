# ADOPTION-PUBLIC-FUNNEL UX

Especificacion UX para landing publica de Familias Protectoras, ficha publica de mascota, solicitud inicial y conversion hacia app owner.

## Principios UX

- La visibilidad publica debe ser inmediata.
- El proceso formal debe sentirse responsable, no burocratico.
- La app owner se introduce cuando ya existe interes real.
- La Familia Protectora debe ganar confianza, control y trazabilidad.
- El visitante nunca debe ver datos privados por accidente.
- El copy debe ser calido, claro y sin promesas legales.

## Mapa de paginas publicas

### `/protectoras/[slug]`

Objetivo: presentar la fundacion o Familia Protectora como una pagina publica profesional y compartible.

Usuarios:

- Visitante anonimo.
- Adoptante interesado.
- Donante o voluntario potencial.
- Familia Protectora revisando su presencia publica.

Contenido:

- Logo.
- Nombre publico.
- Mision.
- Historia breve.
- Ciudad o zona aproximada.
- Redes/enlaces aprobados.
- Formas de apoyo declaradas, si existen.
- Mascotas disponibles.
- Necesidades actuales, si existen.
- Indicadores de impacto publicables.

CTAs:

- `Ver mascotas en adopcion`.
- `Compartir`.
- `Quiero adoptar`.
- `Apoyar a esta familia`, solo si hay informacion declarada y moderada.

Reglas de visibilidad:

- Solo visible si el perfil publico esta aprobado y publicado.
- No mostrar direccion exacta.
- No mostrar documentos privados.
- No mostrar datos internos de revision.

Estados:

- Publicada.
- No encontrada.
- Suspendida.
- Sin mascotas disponibles.
- Perfil en mantenimiento.

Mobile web:

- Hero compacto.
- Cards de mascotas en una columna.
- CTA persistente para compartir o ver mascotas.

Si app instalada:

- Links de mascota pueden intentar abrir app solo para continuar adopcion, no para lectura publica.

Si app no instalada:

- Mantener lectura completa en web.

### `/adopciones/[petSlug]`

Objetivo: mostrar una mascota especifica de forma emocional, clara y segura.

Contenido:

- Fotos publicas.
- Nombre.
- Especie, sexo, edad aproximada.
- Ciudad/zona.
- Historia.
- Personalidad.
- Salud publica resumida.
- Requisitos de adopcion.
- Compatibilidad declarada con ninos, perros o gatos.
- Familia Protectora responsable.

CTAs:

- `Quiero adoptar`.
- `Compartir`.
- `Ver perfil de la familia`.

Reglas:

- Solo mostrar listings publicados.
- No mostrar documentos, microchip, direccion exacta ni notas privadas.
- No afirmar que la adopcion esta garantizada.

Errores:

- Mascota no disponible.
- Publicacion pausada o cerrada.
- Link vencido o invalido.

Estado Slice 3:

- La ficha publica se presenta como landing individual de mascota.
- El hero incluye foto principal, estado, ubicacion general, titulo y chips de datos basicos.
- La galeria muestra solo media publica firmada.
- El CTA `Quiero adoptar` explica el proceso responsable pero no crea solicitud publica todavia.
- `Compartir` usa Web Share API o copia el enlace.
- `Ver protectora` conecta con `/protectoras/[slug]`.
- El bloque de privacidad deja claro que documentos, gastos, notas internas y direccion exacta no se publican.

### `/adopciones/[petSlug]/solicitar`

Objetivo: capturar interes inicial antes de exigir app owner.

Campos sugeridos:

- Nombre.
- Email.
- Telefono opcional.
- Ciudad.
- Motivacion breve.
- Experiencia con mascotas.
- Tipo de vivienda.
- Tiene otras mascotas.
- Tiene ninos.
- Aceptacion de aviso de privacidad y proceso responsable.

Copy:

> Tu solicitud sera revisada por la fundacion. Si avanza, continuaras el proceso desde la app Pet Ecosystem.

Botones:

- `Enviar solicitud`.
- `Volver a la ficha`.

Estados:

- Enviada.
- Duplicada.
- No disponible.
- Error de validacion.
- Bloqueada por abuso/spam.

### `/adoption-invite/[token]`

Objetivo: conectar una preseleccion de la protectora con la app owner.

Contenido:

- Resumen de la mascota.
- Nombre de la Familia Protectora.
- Estado de invitacion.
- Explicacion de por que se requiere app owner.
- Botones App Store y Google Play.
- Boton `Abrir app` si el dispositivo soporta deep link.

Copy:

> La fundacion quiere avanzar con tu solicitud. Descarga Pet Ecosystem para crear tu hogar, dar seguimiento y completar la adopcion responsable.

Estados:

- Token valido.
- Token vencido.
- Token usado.
- Solicitud cancelada.
- Mascota ya no disponible.

### `/adoption-request/[token]`

Objetivo: mostrar estado o continuacion segura cuando el usuario vuelve desde email/web.

Contenido:

- Estado resumido.
- Proximo paso.
- CTA a app owner.

Estados:

- Pendiente de app.
- Owner registrado.
- Hogar creado.
- Solicitud formal incompleta.
- En revision.
- Aprobada.
- Rechazada.
- Cerrada.

## Mapa de pantallas mobile owner

### Invitacion contextual

Titulo: `Continua tu solicitud de adopcion`

Copy:

> Estas a un paso de continuar la adopcion de {petName}.

Campos:

- No requiere datos si el token es valido.

Botones:

- `Continuar`.
- `Ver mascota`.

Validaciones:

- Token valido.
- Publicacion disponible.
- Solicitud no cancelada.

### Onboarding owner con contexto de adopcion

Titulo: `Crea tu cuenta para continuar`

Copy:

> Para una adopcion responsable necesitamos identificar tu hogar y dar seguimiento al proceso.

Botones:

- `Crear cuenta`.
- `Iniciar sesion`.

### Crear o seleccionar hogar

Titulo: `Tu hogar para la adopcion`

Campos:

- Nombre de hogar.
- Ciudad.
- Integrantes opcional segun flujo existente.

Regla:

- No se puede aceptar transferencia sin hogar owner.

### Perfil de adoptante

Titulo: `Cuéntale a la fundacion sobre tu hogar`

Campos:

- Experiencia.
- Vivienda.
- Otras mascotas.
- Ninos.
- Disponibilidad.
- Motivacion.
- Aceptacion responsable.

### Detalle de solicitud

Titulo: `Solicitud de adopcion`

Contenido:

- Mascota.
- Familia Protectora.
- Estado.
- Timeline.
- Requisitos pendientes.

### Aceptacion de condiciones

Titulo: `Condiciones de adopcion responsable`

Acciones:

- Revisar compromiso.
- Aceptar.
- Descargar o ver documento informativo si existe.

### Aceptacion de transferencia

Titulo: `Recibir a {petName} en tu hogar`

Copy:

> Al aceptar, {petName} pasara a formar parte de tu hogar digital y recibiras su expediente disponible.

### Mascota recibida

Titulo: `{petName} ahora esta en tu hogar`

CTAs:

- `Ver expediente`.
- `Crear recordatorio`.
- `Ver documentos`.

## Mapa de pantallas para Familia Protectora

### Editor de landing publica

- Editar mision, historia, zona, redes, apoyo declarado y necesidades.
- Vista previa.
- Enviar a revision si cambia informacion sensible.

### Vista previa de landing

- Ver como publico.
- Copiar enlace.
- Compartir.

### Gestion de solicitudes publicas

- Lista de solicitudes iniciales.
- Filtros por mascota, estado, fecha.
- Acciones: descartar, revisar, preseleccionar.

### Invitacion a app owner

- Boton `Invitar a continuar en app owner`.
- Captura o confirma email.
- Muestra token/link.
- Estado de invitacion.

### Seguimiento de conversion

Estados visibles:

- Interes recibido.
- En revision.
- Preseleccionado.
- Invitado a app.
- Owner registrado.
- Hogar creado.
- En evaluacion.
- Aprobado.
- Transferencia pendiente.
- Adoptado.
- Seguimiento post-adopcion.
- Rechazado.
- Cancelado.

## Mapa de pantallas admin

### Revision de landing

- Perfil publico.
- Cambios sensibles.
- Links externos.
- Datos de apoyo declarados.
- Acciones: aprobar, rechazar, suspender.

### Moderacion de publicaciones

- Mascotas reportadas.
- Fotos sensibles.
- Texto inapropiado.
- Acciones de pausa o bloqueo.

### Revision de solicitudes reportadas

- Solicitudes marcadas como spam o fraude.
- Bloqueo de solicitantes abusivos.

### Metricas de embudo

- Landings activas.
- Solicitudes iniciales.
- Invitaciones.
- Conversion a app.
- Adopciones cerradas.

## Copy estrategico

Landing:

> Conoce nuestra fundacion, nuestras mascotas disponibles y como puedes ayudarnos.

Ficha mascota:

> {petName} busca un hogar responsable.

Solicitud inicial:

> Tu solicitud sera revisada por la fundacion. Si avanza, continuaras el proceso desde la app Pet Ecosystem.

Invitacion:

> La fundacion quiere avanzar con tu solicitud. Descarga Pet Ecosystem para crear tu hogar, dar seguimiento y completar la adopcion responsable.

App owner:

> Estas a un paso de continuar la adopcion de {petName}.

Transferencia:

> Al aceptar, {petName} pasara a formar parte de tu hogar digital y recibiras su expediente disponible.

## Criterios visuales

- Estilo consistente con skin profesional actual.
- Fondo claro calido.
- Cards blancas con bordes suaves.
- Acentos teal.
- Fotos grandes y seguras.
- CTA principal visible.
- No saturar la landing con formularios largos.
- Mobile-first para visitantes publicos.
