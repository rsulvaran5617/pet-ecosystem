# ADOPTION-PUBLIC-FUNNEL Risks

Riesgos, mitigaciones y criterios de salida para publicar el embudo publico de adopcion.

## Riesgos principales

### Friccion por instalacion de app

Riesgo:

El usuario puede abandonar si se le exige instalar la app demasiado temprano.

Mitigacion:

- Permitir ver landing y ficha sin app.
- Permitir solicitud inicial ligera desde web.
- Exigir app solo tras preseleccion.
- Copy claro: la app protege el cierre responsable.

### Baja percepcion de valor para protectoras

Riesgo:

La protectora puede sentir que la plataforma solo agrega trabajo administrativo.

Mitigacion:

- Priorizar landing compartible y presencia publica.
- Mostrar mascotas y perfiles profesionales.
- Agregar enlaces, impacto y necesidades.
- Dar metricas de vistas, solicitudes y conversion.

### Datos personales en solicitud publica

Riesgo:

La solicitud inicial captura datos de contacto sin cuenta autenticada.

Mitigacion:

- Capturar solo datos minimos.
- Mostrar aviso de privacidad.
- Limitar acceso a protectora autorizada y admin.
- Aplicar rate limiting y retencion definida.

### Exposicion accidental de datos privados

Riesgo:

Documentos, notas internas, direccion exacta o gastos podrian filtrarse en paginas publicas.

Mitigacion:

- DTO publico separado.
- Reglas RLS especificas.
- Auditoria de campos publicos.
- QA de fixtures con datos sensibles.

### Falsa expectativa sobre donaciones

Riesgo:

Visitantes pueden interpretar que Pet Ecosystem procesa, valida o garantiza donaciones.

Mitigacion:

- Copy obligatorio: informacion declarada por la organizacion.
- No checkout.
- No boton de pago nativo.
- Moderacion admin de textos y enlaces.

### Spam y solicitudes falsas

Riesgo:

Formularios publicos pueden recibir spam.

Mitigacion:

- Rate limiting.
- Validacion de email.
- Captcha si el volumen lo requiere.
- Estado `rejected`/`cancelled`.
- Bloqueo admin de patrones abusivos.

### Duplicidad de solicitudes

Riesgo:

Un visitante puede enviar multiples solicitudes para la misma mascota.

Mitigacion:

- Dedupe por listing + email + ventana de tiempo.
- Mensaje profesional de solicitud ya recibida.
- Permitir consolidar en bandeja de protectora.

### Tokens vencidos o usados

Riesgo:

Invitaciones rotas pueden bloquear conversion.

Mitigacion:

- Estado claro en pagina puente.
- Reenviar invitacion desde consola Foster.
- Token con vencimiento visible.
- No guardar token en claro.

### Universal links/App links

Riesgo:

Los links pueden no abrir la app correctamente en iOS o Android.

Mitigacion:

- Fallback web.
- Botones directos a tiendas.
- Manual de QA por plataforma.
- Recuperacion por email si deferred deep link falla.

### Moderacion insuficiente

Riesgo:

Landings o fichas pueden publicar contenido no adecuado.

Mitigacion:

- Admin puede suspender landing.
- Admin puede pausar publicaciones.
- Cambios sensibles vuelven a revision si aplica.
- Reportes publicos futuros.

### Compliance Store/privacidad

Riesgo:

App Store o Google Play pueden cuestionar datos personales, adopcion o enlaces externos.

Mitigacion:

- Politica de privacidad actualizada.
- Data Safety alineado.
- Explicar que la app no procesa donaciones.
- Explicar retencion de solicitudes y transferencias.

## Metricas de embudo

Metricas de visibilidad:

- Visitas a landing de fundacion.
- Vistas de fichas de mascota.
- Clicks en compartir.
- Clicks en redes/enlaces publicos.

Metricas de captacion:

- Solicitudes iniciales.
- Solicitudes duplicadas.
- Solicitudes descartadas.
- Solicitudes preseleccionadas.

Metricas de conversion app:

- Invitaciones enviadas.
- Invitaciones abiertas.
- Clicks App Store.
- Clicks Google Play.
- Invitaciones reclamadas.
- Owners registrados desde adopcion.
- Hogares creados desde adopcion.

Metricas de cierre:

- Solicitudes formales completadas.
- Solicitudes aprobadas.
- Transferencias iniciadas.
- Transferencias aceptadas.
- Adopciones cerradas.
- Seguimientos post-adopcion.

Ratios:

- Landing -> ficha.
- Ficha -> solicitud inicial.
- Solicitud inicial -> preseleccion.
- Preseleccion -> invitacion abierta.
- Invitacion -> registro owner.
- Registro owner -> hogar creado.
- Hogar creado -> solicitud formal.
- Solicitud formal -> adopcion cerrada.

## Gates antes de implementar

- Definir si `/protectoras/[slug]` es ruta nueva o se extiende una existente.
- Confirmar si solicitud inicial publica requiere email obligatorio.
- Confirmar politica de retencion de leads no convertidos.
- Confirmar app store/play store URLs definitivas.
- Confirmar estrategia de universal links/app links.
- Confirmar copy legal de donaciones/apoyo.
- Confirmar si las metricas requieren consentimiento de analytics.

## QA responsive

- Desktop: landing con hero, perfil, mascotas y CTAs sin solapamiento.
- Tablet: cards en dos columnas cuando aplique.
- Mobile web: flujo de solicitud en una columna.
- Links compartidos: preview social correcto.
- Ficha no muestra datos privados.
- App instalada: deep link abre contexto correcto.
- App no instalada: pagina puente muestra tiendas.
- Token vencido: mensaje claro y CTA para solicitar nueva invitacion.

## Riesgo residual aceptable para MVP

Es aceptable lanzar una primera version sin deferred deep linking completo si:

- El link de invitacion sigue funcionando despues de instalar.
- El usuario puede volver desde email/WhatsApp.
- La app puede recuperar el contexto con token o email verificado.

No es aceptable lanzar si:

- Se exponen documentos privados.
- Se puede transferir una mascota desde web publica.
- Una Familia Protectora no aprobada puede publicar landing.
- La solicitud inicial se confunde con adopcion garantizada.

## Slice 2 riesgos residuales

- La landing filtra publicaciones publicas en cliente usando `listPublishedPetAdoptionListings()`. Es aceptable para piloto, pero debe moverse a RPC dedicada cuando suba el volumen.
- La metadata SEO es generica en esta primera version porque la pagina resuelve datos en cliente. Para SEO real por fundacion se recomienda una implementacion server-side o RPC segura accesible desde server.
- No hay portada institucional dedicada. El hero usa composicion visual y logo/iniciales.
- Las necesidades actuales dependen de `needsSummary`; no existe todavia una entidad estructurada de necesidades.
- No hay formulario publico ni captura de leads hasta Slice 4.

## Slice 3 riesgos residuales

- El CTA `Quiero adoptar` no crea solicitud publica todavia; solo orienta el proceso responsable. Esto evita prometer funcionalidad de Slice 4 antes de tiempo.
- La ficha usa metadata generica de Next porque los datos se resuelven en cliente. SEO dinamico por mascota queda pendiente.
- La disponibilidad publica depende del RPC `get_public_pet_adoption_listing_by_slug`; si el listing cambia de estado, la ficha debe responder como no disponible.
- Las fotos usan URLs firmadas temporales, por lo que previews sociales con imagen real requieren una estrategia server-side futura.
