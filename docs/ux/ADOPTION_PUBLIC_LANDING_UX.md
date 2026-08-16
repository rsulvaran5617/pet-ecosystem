# ADOPTION-PUBLIC-FUNNEL Slice 2 UX

Landing publica MVP de fundacion o Familia Protectora.

## Ruta creada

```text
/protectoras/[slug]
```

Ejemplo:

```text
/protectoras/patitas-cuidadoras
```

## Objetivo

Dar a cada Familia Protectora aprobada una vitrina publica compartible que muestre identidad, mision, mascotas publicadas y llamados a accion basicos, sin iniciar todavia solicitudes publicas ni deep links.

## Estructura de pantalla

### Hero

Muestra:

- logo o iniciales;
- nombre publico;
- mision;
- ciudad, region y pais;
- CTA `Ver mascotas en adopcion`;
- CTA `Compartir`;
- CTA `Contactar` solo si existe contacto publico.

### Panel de impacto

Muestra solo datos confiables:

- mascotas publicadas;
- estado de necesidades actuales si existe `needsSummary`;
- recordatorio de que expedientes/documentos son privados.

No muestra adopciones cerradas ni solicitudes recibidas en este slice porque no hay una metrica publica agregada y confiable en el contrato actual.

### Mascotas en adopcion

Muestra solo publicaciones:

- `status = published`;
- `shareStatus = enabled`;
- con `publicSlug`;
- pertenecientes al `householdId` del perfil publico.

Cada card incluye:

- foto principal o inicial;
- nombre;
- especie/raza;
- edad aproximada;
- sexo;
- ubicacion general;
- boton `Ver historia` hacia `/adopciones/[petSlug]`.

### Necesidades actuales

Se muestra solo si existe `needsSummary` en el perfil publico. No inventa necesidades ni campanas.

### Sobre la organizacion

Usa `publicStory` o `mission`. Si falta, muestra un empty state sobrio.

### Contacto y redes

Muestra solo datos publicos declarados:

- contacto publico segun `contactPolicy`;
- website;
- Instagram;
- Facebook;
- TikTok;
- WhatsApp.

Si no hay datos publicos, indica que la coordinacion se mantiene por plataforma.

### Apoyo declarado

Si `donationsEnabled = true` y existe contenido declarado, muestra informacion de apoyo como contenido informativo. No procesa pagos, no valida donaciones y aclara que donar no garantiza aprobacion de adopcion.

### Footer de confianza

Texto:

```text
Perfil publicado en Pet Ecosystem. La informacion es responsabilidad de la organizacion protectora.
```

## Estados manejados

- Cargando perfil.
- Familia Protectora no encontrada.
- Landing no aprobada/no publicada.
- Sin mascotas publicadas.
- Sin logo.
- Sin datos de contacto publico.
- Sin necesidades actuales.
- Error de carga.
- Mobile y desktop.

## Responsive

- Desktop: hero en dos columnas y contenido con columna lateral.
- Tablet: columnas se apilan.
- Mobile: CTAs full-width y cards compactas.

## Privacidad

La landing no muestra:

- documentos privados;
- gastos de acogida;
- comprobantes;
- notas internas;
- solicitudes de adopcion;
- datos personales de solicitantes;
- direccion exacta;
- mascotas privadas de owners;
- mascotas sin publicacion activa.

## Pendientes para Slice 3

- SEO dinamico por perfil real.
- Mejor preview social con imagen institucional.
- Ficha publica de mascota reforzada como siguiente paso del embudo.
- CTA `Quiero adoptar` aun sin formulario publico.
