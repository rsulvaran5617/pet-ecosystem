# PROFESSIONAL_WEBSITE_SKIN.md

## Estado

Fase: `VISUAL-BRAND-2`

Slice actual: `SKIN-0`

Objetivo: definir la base visual profesional para evolucionar las superficies web de Pet Ecosystem sin tocar backend, Supabase, migraciones, RLS, contratos API, mobile ni reglas de negocio.

Este documento es una guia de direccion visual. No implementa cambios funcionales.

## Principios visuales

1. Confianza antes que decoracion.
   La interfaz debe sentirse estable, segura y facil de entender. Los elementos visuales deben ayudar a decidir, no competir por atencion.

2. Producto real, no demo tecnica.
   Evitar apariencia de prototipo: textos tecnicos, IDs internos, labels improvisados, botones desalineados, cards sin jerarquia o bloques con demasiado scroll.

3. Una marca, distintos tonos por rol.
   Owner, provider, foster y admin deben compartir identidad Pet Ecosystem, pero con densidad y tono visual adecuados para cada audiencia.

4. Claridad operacional.
   Dashboards y consolas deben priorizar lectura rapida: titulos compactos, metricas claras, filtros visibles, estados entendibles y acciones primarias obvias.

5. Sensibilidad para adopciones.
   Foster/adopcion debe sentirse humano, responsable y protegido. No debe parecer comercio de mascotas ni marketplace de venta.

6. Privacidad visible.
   Los bloques relacionados con documentos, salud, adopcion, soporte y cuenta deben reforzar limites de acceso y no exponer informacion sensible.

7. Responsive desde el diseno.
   Desktop, tablet y mobile web deben evitar solapamientos, overflow accidental, botones montados y textos que rompan contenedores.

## Paleta recomendada

La paleta mantiene el ADN actual y lo ordena para uso profesional.

### Base

- `canvas`: `#fbfaf7` - fondo calido principal.
- `canvasWarm`: `#f7f2e7` - fondo alterno para bandas suaves.
- `surface`: `#ffffff` - cards y formularios.
- `surfaceSoft`: `#fffdf8` - paneles de baja prioridad.
- `ink`: `#101828` - texto principal.
- `muted`: `#5f6675` - texto secundario.
- `mutedStrong`: `#374151` - labels y metadata relevante.
- `line`: `rgba(16,24,40,0.1)` - bordes suaves.

### Marca y acciones

- `accent`: `#00978f` - CTA principal owner/provider/foster.
- `accentDark`: `#00847d` - hover/pressed.
- `accentSoft`: `#e6f7f5` - chips, activos y fondos informativos.
- `admin`: `#06264b` - sidebar/backoffice.
- `adminSurface`: `#071f3d` - superficies admin oscuras.
- `adminAccent`: `#008a97` - accion admin.

### Estados

- `success`: `#16a36a`
- `successSoft`: `#dcfce7`
- `warning`: `#f97316`
- `warningSoft`: `#ffedd5`
- `danger`: `#ef4444`
- `dangerSoft`: `#fee2e2`
- `info`: `#2563eb`
- `infoSoft`: `#dbeafe`
- `supportPurple`: `#7c3aed`
- `supportPurpleSoft`: `#ede9fe`

## Tipografia

Usar una jerarquia compacta y profesional. No escalar fuentes con viewport width dentro de dashboards.

### Landing publica

- Hero H1: 48-64 px desktop, 34-42 px mobile.
- Section H2: 28-36 px.
- Card title: 18-22 px.
- Body: 15-17 px, line-height 1.55-1.7.
- CTA: 13-15 px, peso 800.

### Owner web

- Page H1: 26-32 px.
- Section H2: 20-24 px.
- Card title: 15-18 px.
- Body: 13-15 px.
- Metadata: 10-12 px.

### Provider web

- Page H1: 22-28 px.
- Section H2: 18-22 px.
- Dashboard card title: 13-16 px.
- KPI value: 24-32 px.
- Table/list body: 12-14 px.
- Chips: 10-11 px.

### Foster web

- Page H1: 24-32 px.
- Section H2: 19-24 px.
- Body: 13-15 px.
- Sensitive callouts: 12-14 px.

### Admin web

- Page H1: 26-32 px.
- Section H2: 20-24 px.
- Tables/list rows: 12-14 px.
- Dense metadata: 10-12 px.

## Spacing

Usar una escala consistente:

- `xs`: 4 px
- `sm`: 8 px
- `md`: 16 px
- `lg`: 24 px
- `xl`: 32 px
- `xxl`: 48 px

Reglas:

- Cards operativas: padding 14-18 px.
- Cards editoriales/landing: padding 22-32 px.
- Gaps internos: 8-14 px.
- Gaps entre secciones: 20-32 px.
- Dashboards densos: reducir altura antes de reducir legibilidad.

## Radios

Evitar cards excesivamente redondeadas en consolas. Mantener calidez sin aspecto infantil.

- Inputs: 10-12 px.
- Cards compactas: 12-16 px.
- Cards principales: 16-20 px.
- Hero/containers landing: 20-24 px.
- Botones/chips: pill `999px`.

## Sombras

Sombras suaves, no pesadas.

- Card normal: `0 8px 24px rgba(15,23,42,0.06)`.
- Card elevada: `0 14px 40px rgba(15,23,42,0.08)`.
- Modal/popover: `0 20px 60px rgba(15,23,42,0.14)`.
- Sidebar oscuro: `0 24px 60px rgba(2,6,23,0.22)`.

Evitar sombras negras duras y glow decorativo.

## Iconografia

- Usar iconos simples, lineales y consistentes.
- Preferir `lucide-react` si ya esta disponible en la superficie, o mantener iconografia existente si el slice no permite dependencia nueva.
- Los iconos deben aclarar actividad: agenda, reservas, mascotas, salud, documentos, mensajes, soporte, publicacion.
- No usar iniciales en circulos cuando un icono comunica mejor.
- Iconos dentro de botones compactos deben tener tooltip o label accesible cuando la accion no sea obvia.

## Botones

### Primario

- Fondo `accent`.
- Texto blanco.
- Radio pill.
- Peso 800.
- Altura web compacta: 34-40 px.
- Altura landing: 42-46 px.

### Secundario

- Fondo blanco o transparente.
- Borde `rgba(0,143,137,0.32)`.
- Texto `accentDark`.

### Peligro

- Fondo blanco o `dangerSoft`.
- Borde suave rojo.
- Texto `danger`.
- Usar solo para acciones destructivas reales.

### Reglas

- Un bloque debe tener una accion primaria clara.
- Evitar filas con demasiados botones grandes.
- En dashboards, botones pequeños y consistentes.

## Cards

### Card informativa

- Fondo blanco.
- Borde suave.
- Titulo compacto.
- Copy corto.
- Icon tile opcional.

### Card operativa

- Priorizar datos y CTA.
- Titulo 13-16 px.
- Body 12-14 px.
- Accion primaria abajo o arriba derecha.

### KPI card

- Icono.
- Label claro.
- Numero dominante pero no gigante.
- Subtexto corto y entendible.

### Empty state

- Debe explicar que no hay datos y que accion puede tomar el usuario.
- No usar mensajes tecnicos ni placeholders crudos.

## Formularios

- Labels pequenos, claros y consistentes.
- Inputs maximo 40-44 px de alto en consolas.
- Textareas compactas salvo contenido narrativo.
- Agrupar campos por intencion.
- Esconder formularios de creacion por defecto cuando la pantalla sea de gestion.
- Usar boton o icono `+` para agregar nuevos items cuando el flujo lo permita.
- Validaciones visibles cerca del campo.

## Navegacion

### Landing

- Nav superior limpio.
- No saturar con demasiados enlaces.
- CTA principal visible.
- Footer con rutas de soporte, ayuda y cuenta.

### Owner web

- Sidebar izquierda compacta.
- Item activo real.
- Mostrar solo el slice seleccionado para evitar desorientacion.

### Provider web

- Sidebar azul noche compacta.
- Item activo real.
- Header con negocio activo, estado y acciones.
- Dashboard orientado a decisiones.

### Foster web

- Sidebar sensible y clara.
- Separar Panel, Perfil, Mascotas, Publicaciones, Solicitudes y Transferencias.
- No mezclar adopcion con marketplace comercial.

### Admin web

- Sidebar azul noche.
- Densidad superior.
- Foco en colas, revision y soporte.
- Manual admin protegido dentro del backoffice.

## Estilo por rol

### Landing publica

Direccion: producto confiable, humano y listo para piloto.

Debe mejorar:

- hero mas editorial y menos cargado;
- CTA por audiencia bien jerarquizados;
- marca visible sin depender solo del nav;
- bloque para familias protectoras claro;
- centro de ayuda visible pero secundario.

### Owner web

Direccion: control del hogar y cuidado.

Debe mejorar:

- fichas de mascota mas limpias;
- edicion bajo acciones discretas;
- formularios ocultos hasta CTA;
- salud/documentos como ficha informativa;
- reservas como flujo guiado, no historial infinito.

### Provider web

Direccion: consola SaaS profesional.

Debe mejorar:

- cards compactas;
- KPIs entendibles;
- graficos con menos ruido;
- agenda/cupos con relacion capacidad/ocupacion;
- reservas con filtros claros;
- conversaciones activas visibles donde aporten valor.

### Foster web

Direccion: gestion responsable de acogida.

Debe mejorar:

- perfil publico sensible;
- bloque de apoyo/donaciones como informacion, no checkout;
- mascotas en acogida por flujo;
- solicitudes y transferencia separadas;
- historia de adopciones cerradas clara.

### Admin web

Direccion: backoffice sobrio y auditable.

Debe mejorar:

- colas densas y escaneables;
- detalle lateral consistente;
- estados/chips claros;
- manual interno visible solo para admin;
- soporte sin ruido visual.

### Help center

Direccion: manual consultable.

Debe mejorar:

- indice por rol;
- busqueda visual o textual si crece;
- cards de guia mas faciles de escanear;
- capturas reales QA cuando esten disponibles;
- separacion estricta de contenido publico vs admin.

## Antes / despues esperado

### Landing

- Antes: landing funcional con identidad y secciones utiles.
- Despues: pagina publica premium, clara, confiable y preparada para piloto/tiendas.

### Centro de ayuda

- Antes: manual estatico correcto.
- Despues: portal de consulta con mejor jerarquia, estados, indexacion y futura base para capturas/PDF.

### Owner web

- Antes: slices funcionales con varias fichas densas.
- Despues: panel por seccion, responsive, con formularios bajo demanda y fichas informativas limpias.

### Provider web

- Antes: consola potente pero con areas densas y graficos ajustados manualmente.
- Despues: consola ejecutiva, compacta, iconografica, con acciones y datos globales claros.

### Foster web

- Antes: flujo funcional de acogida/adopcion con varias superficies.
- Despues: experiencia sensible y ordenada por etapas, sin mezclar informacion sensible o comercial.

### Admin web

- Antes: backoffice funcional.
- Despues: herramienta de operacion mas densa, uniforme y auditable.

## Tokens propuestos

Los tokens actuales en `packages/ui/src/index.ts` son una buena base. Para `SKIN-1+` se recomienda ampliarlos documentalmente antes de tocar codigo:

```ts
export const brandSkinTokens = {
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui",
    letterSpacing: "0"
  },
  webLayout: {
    maxPageWidth: 1180,
    shellPaddingDesktop: 32,
    shellPaddingMobile: 16,
    sidebarCompact: 220,
    sidebarWide: 260
  },
  radii: {
    input: 12,
    card: 16,
    panel: 20,
    hero: 24,
    pill: 999
  },
  shadows: {
    card: "0 8px 24px rgba(15,23,42,0.06)",
    elevated: "0 14px 40px rgba(15,23,42,0.08)",
    overlay: "0 20px 60px rgba(15,23,42,0.14)"
  }
} as const;
```

No aplicar estos tokens directamente en `SKIN-0`; deben introducirse en slices de codigo con validacion visual.

## Riesgos

- Redisenar muchas superficies a la vez puede romper flujos ya validados.
- Migrar estilos inline sin estrategia puede crear regresiones grandes.
- Provider web es la superficie de mayor riesgo por tamano y densidad.
- Cambiar textos legales o de privacidad sin revision puede crear riesgo de compliance.
- Iconografia inconsistente puede empeorar legibilidad.
- Cards mas bonitas pero menos densas pueden reducir eficiencia operativa.
- Responsive incompleto puede reintroducir solapamientos ya corregidos.

## Criterios de aceptacion

- La landing se ve como producto profesional, no como demo tecnica.
- El centro de ayuda es limpio y consultable.
- Owner web se siente calido y ordenado.
- Provider web se siente como consola SaaS profesional.
- Foster web se siente humana, seria y responsable.
- Admin web se siente sobria y operativa.
- Los componentes mantienen consistencia visual.
- No se rompe mobile.
- No se cambia backend ni reglas de negocio.
- No se muestran datos tecnicos al usuario.
- La UI es responsive en desktop, tablet y mobile.
- Textos no se solapan.
- Botones no se montan entre si.
- Cards no se desbordan.
- Estados vacios se ven profesionales.

## Checklist QA responsive

Validar cada slice en:

- desktop ancho: 1440 px;
- desktop estandar: 1280 px;
- tablet: 768 px;
- mobile web: 390 px;
- mobile estrecho: 360 px.

Checklist:

- No hay overflow horizontal accidental.
- Sidebar no tapa contenido.
- Header no se solapa con sidebar.
- Botones conservan altura y texto legible.
- Chips caben o pasan a nueva linea.
- Cards mantienen padding.
- Formularios no se montan.
- Graficos no cortan labels.
- Tablas/listas tienen scroll controlado si aplica.
- Empty states explican siguiente accion.
- Contenido publico no muestra material admin.
- Admin no es accesible sin rol.

## Plan de implementacion

### SKIN-1: landing publica

- Ajustar hero, CTA por audiencia, nav y footer.
- Reforzar identidad pet con assets reales existentes.
- Mantener `/app`, `/foster`, `/ayuda` y `/account-deletion`.

### SKIN-2: centro de ayuda publico

- Refinar cards, indice, estados y layout responsive.
- Mantener separado el manual admin.
- Preparar estructura futura para capturas.

### SKIN-3: web owner

- Normalizar shell, sidebar, cards y formularios.
- Mantener seleccion por slice.
- Priorizar Mascotas, Salud, Buscar y Reservas.

### SKIN-4: web provider

- Consolidar sidebar, topbar, KPIs, graficos y reservas.
- Revisar agenda/capacidad con layout compacto.
- Evitar cambios funcionales.

### SKIN-5: web foster

- Pulir perfil publico, mascotas, publicaciones, solicitudes y transferencias.
- Mantener tono humano y limites de privacidad.
- No mezclar con marketplace comercial.

### SKIN-6: admin web

- Unificar backoffice, manual admin, colas y detalles.
- Mejorar densidad y lectura sin agregar funciones.

### SKIN-7: QA visual responsive

- Ejecutar validaciones tecnicas.
- Revisar capturas manuales.
- Documentar checklist final y pendientes no bloqueantes.

Documento de cierre: `docs/ux/PROFESSIONAL_SKIN_QA.md`.
