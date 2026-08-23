# PET ALERT

## Resumen ejecutivo

PET ALERT es el frente comunitario de Pet Ecosystem para ayudar a reunir mascotas con sus familias. Reune dos flujos distintos bajo una misma entrada publica, sin mezclar sus reglas:

- **Mi mascota se perdio:** una persona autorizada activa una alerta desde una mascota ya registrada.
- **Vi una mascota aparentemente perdida:** una persona reporta un avistamiento sin asumir propiedad, abandono ni ausencia de familia.

El primer release debe priorizar seguridad, privacidad, trazabilidad y facilidad de compartir. No incluye notificaciones masivas, mapa en tiempo real, matching automatico, recompensas procesadas por la plataforma ni transferencia de custodia.

## Limites del dominio

PET ALERT se integra con `pets`, `households`, autenticacion, media y admin, pero mantiene sus propias entidades y estados. No modifica `pets.status`: una mascota con alerta activa se identifica mediante la alerta vigente. Esto evita interferir con booking, salud, documentos, adopcion o `in_memory`.

No pertenece a Foster/adopcion. Un reporte comunitario tampoco crea una mascota, un household ni una transferencia.

## Diferencia entre flujos

| Aspecto | Mi mascota se perdio | Vi una mascota perdida |
| --- | --- | --- |
| Origen | Mascota registrada | Observacion comunitaria |
| Iniciador | Miembro autorizado del hogar | Usuario o visitante |
| Propiedad conocida | Si | No |
| Vinculo con `pets.id` | Obligatorio | No existe inicialmente |
| Accion comunitaria | Reportar avistamiento | Aportar informacion o reclamar |
| Cierre | Owner autorizado | Reportante autenticado/token o admin |
| Resultado | Encontrada/cerrada | Reunida/cerrada |

## Reglas de negocio

### Flujo A

- Solo miembros con permiso de escritura/administracion sobre el hogar pueden publicar.
- La mascota debe pertenecer al hogar, estar activa y no estar `in_memory`.
- Solo puede existir una alerta activa por mascota.
- La alerta usa una proyeccion publica; nunca expone el expediente completo.
- El owner puede editar, marcar encontrada o cerrar conservando historial.
- Los avistamientos no cambian automaticamente el estado principal.

### Flujo B

- Puede iniciarlo una persona autenticada o anonima mediante una operacion controlada.
- El lenguaje siempre indica una mascota "aparentemente perdida" o "vista sola".
- El reporte no presume abandono ni concede custodia.
- Un reclamo requiere autenticacion y evidencia privada.
- Ningun reclamo revela automaticamente datos de contacto ni cambia ownership.
- Admin interviene ante conflicto, fraude, abuso o contenido sensible.

### Decisiones iniciales

- Contacto interno/controlado por defecto.
- Ubicacion publica aproximada; coordenadas exactas quedan privadas.
- Media en bucket privado con URLs firmadas o proyecciones controladas.
- Expiracion configurable, propuesta inicial de 30 dias.
- Recompensa diferida: introduce fraude, seguridad y expectativas de pago.
- Sin push por cercania en MVP; se documenta como futuro.

## Estados

### Alerta de mascota registrada

`draft -> active -> sighting_received/possible_match -> found -> closed`

Estados laterales: `expired`, `flagged`. `flagged` suspende visibilidad hasta moderacion.

### Reporte comunitario

`sighting_open -> possible_owner_claim -> owner_verified -> reunited -> closed`

Estado alterno: `sheltered_by_reporter`. Estados laterales: `expired`, `flagged`.

### Reclamo

`submitted -> under_review -> accepted|rejected`

Estados laterales: `cancelled`, `disputed`.

## Metricas sin PII

- alertas y reportes creados, activos, compartidos y cerrados;
- avistamientos recibidos;
- reclamos iniciados/verificados;
- reunificaciones declaradas;
- reportes de abuso;
- tiempo mediano hasta cierre;
- conversion de visitante a usuario para reclamar.

## Plan por slices

1. **Slice 0:** diseño funcional, UX, datos, privacidad y riesgos.
2. **Slice 1A:** modelo, RLS y API del flujo owner, sin UI.
3. **Slice 1B:** modelo, RLS y API comunitarios/claims, sin UI.
4. **Slice 2:** mobile owner para crear, compartir y cerrar alerta.
5. **Slice 3:** ficha publica de alerta y avistamientos.
6. **Slice 4:** reporte comunitario web/mobile.
7. **Slice 5:** reclamo y contacto controlado.
8. **Slice 6:** admin y moderacion.
9. **Slice 7:** historial en expediente e integracion QR no destructiva.
10. **Slice 8:** metricas y mejoras operativas.
11. **Futuro:** push por zona, mapa, matching y colaboradores cercanos.

## Recomendacion inmediata

Implementar primero **Slice 1A**. Es el camino con ownership conocido y menor superficie de fraude. Slice 1B debe comenzar solo despues de validar RLS, proyeccion publica, auditoria y expiracion con el flujo owner.

## Criterios de aceptacion del diseño

- Los dos flujos son distinguibles desde la primera pantalla.
- Ninguna pagina publica expone direccion, contacto o expediente privado.
- El estado perdido no altera globalmente `pets.status`.
- Toda mutacion sensible tiene actor, razon e historial.
- Un reclamo nunca transfiere ownership automaticamente.
- La implementacion puede dividirse sin dependencias circulares entre slices.
