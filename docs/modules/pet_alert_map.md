# PET ALERT MAP - Geolocalizacion segura y mapa publico

## Estado

`map_5_community_capture_implemented_local`

Este documento conserva el diagnostico de MAP-1 y registra la implementacion
local de MAP-2. MAP-2 prepara datos y contratos; no incluye mapa visual, captura
GPS, permisos del dispositivo, geocodificador ni dependencias cartograficas.

## MAP-2 implementado localmente

- Migracion: `20260904130000_pet_alert_map2_secure_locations.sql`.
- La coordenada confirmada permanece privada y se almacena por separado una
  coordenada publica estable generada en servidor a 250-500 metros.
- Owner Lost Pet, avistamientos ligados y reportes comunitarios registran fuente,
  precision del dispositivo, fecha de captura y visibilidad publica.
- `list_public_pet_alert_map_points` devuelve solo slugs/rutas, datos resumidos y
  coordenadas generalizadas; nunca IDs, contacto o coordenadas privadas.
- Los registros heredados usan `legacy_text` y quedan fuera del mapa hasta que
  su responsable confirme una ubicacion.
- La migracion fue aplicada al ambiente Supabase vinculado el 2026-09-04.

## MAP-3 implementado localmente

- Owner Mobile ofrece `Usar ubicacion del dispositivo` dentro del paso de zona
  del reporte de mascota extraviada.
- El permiso foreground se solicita solo despues de esa accion explicita.
- La captura es opcional: rechazo, error o indisponibilidad mantienen operativo
  el ingreso manual de ciudad, region y referencia.
- La coordenada obtenida no se guarda inmediatamente. El usuario confirma que
  corresponde al lugar del ultimo avistamiento o la descarta.
- Al guardar, el cliente envia la coordenada privada confirmada mediante
  `set_pet_alert_lost_pet_location`; Supabase genera el punto publico desplazado.
- La vista previa informa si el boletin tendra punto aproximado o solo zona textual.
- Se agrego `expo-location` y su mensaje de permiso de uso en primer plano.
- La seleccion manual sobre un mapa y la busqueda geocodificada siguen pendientes
  hasta aprobar proveedor de tiles/geocodificacion para produccion.
- MAP-3 no cambia alertas comunitarias, reporte externo, mapa web ni Admin.

## MAP-4 implementado localmente

- El reporte web de propietario externo ofrece captura opcional mediante la API
  de geolocalizacion del navegador, solo despues de una accion explicita.
- El usuario debe confirmar que se encuentra en el lugar del extravio; tambien
  puede descartar la captura o continuar solo con ciudad y referencia.
- La revision final informa si se enviara un punto aproximado o solo zona textual.
- La Edge Function valida fuente, rangos, precision y vigencia de la captura y
  nunca devuelve ni registra coordenadas en sus mensajes.
- Tras verificar OTP y crear el reporte pendiente, la funcion invoca el setter
  `service_role` de MAP-2. El servidor genera el punto publico generalizado.
- Si falla la persistencia geografica, el reporte parcial se elimina antes de
  procesar media o emitir el token privado de gestion.
- No se agregaron tablas, migraciones, dependencias web ni lectura publica nueva.
- La Edge Function modificada queda pendiente de despliegue remoto.

## MAP-5 implementado localmente

- Mobile y Web permiten adjuntar ubicacion confirmada al reporte comunitario de
  una mascota aparentemente perdida.
- El formulario Web de avistamiento ligado a una alerta tambien ofrece captura
  opcional mediante el mismo control reutilizable.
- Todos los permisos se solicitan despues de una accion explicita; negar,
  descartar o no disponer de geolocalizacion conserva el recorrido textual.
- Los reportes comunitarios usan `set_pet_alert_community_sighting_location` y
  habilitan su punto publico generalizado.
- Los avistamientos ligados usan `set_pet_alert_lost_pet_sighting_location` con
  `publicLocationVisible: false`: la ubicacion queda privada para el seguimiento
  de la familia y no crea un marcador publico individual.
- Si el evento principal se crea y luego falla el setter opcional, la interfaz
  no invita a reenviar ni duplicar el reporte; informa que se guardo sin mapa.
- No se agregaron migraciones ni dependencias nuevas. MAP-5 reutiliza
  `expo-location` de MAP-3 y la API del navegador.

## 1. Resumen ejecutivo

PET ALERT puede incorporar un mapa publico sin reemplazar el directorio actual y
sin publicar ubicaciones exactas. La plataforma ya tiene parte de la base
necesaria:

- PostGIS esta habilitado por el frente Geo-0 de marketplace.
- Owner Lost Pet ya acepta coordenadas opcionales en base de datos y API.
- Los avistamientos ligados a una alerta Owner tambien aceptan coordenadas.
- Mobile ya integra MapLibre React Native para marketplace.
- El directorio publico usa RPC sanitizadas y no lee tablas directamente.

La capacidad no esta lista para exponerse en un mapa porque:

- ningun formulario PET ALERT captura o confirma coordenadas actualmente;
- `pet_alert_community_sightings` no almacena coordenadas;
- el reporte de propietario externo no envia coordenadas;
- no existe una coordenada publica generalizada separada de la privada;
- las RPC publicas no proyectan coordenadas, correctamente;
- Web no tiene MapLibre GL JS ni un proveedor cartografico de produccion;
- Admin no tiene permisos ni herramientas geograficas diferenciadas.

La decision recomendada es tratar la coordenada capturada como dato sensible,
generar en servidor una coordenada publica estable y aproximada, y exponer solo
esta ultima mediante RPC especificas. Los reportes heredados sin coordenadas
deben seguir apareciendo en la lista y quedar fuera del mapa hasta que su autor
confirme una zona.

## 2. Alcance y limites

### Incluido en el frente

- lugar del ultimo avistamiento de una mascota extraviada;
- lugar de un reporte comunitario;
- lugar de un avistamiento aportado a una alerta;
- captura por dispositivo, seleccion manual o busqueda de zona;
- mapa publico con ubicacion aproximada;
- moderacion y auditoria geografica;
- compatibilidad con alertas Owner y de propietario externo.

### Excluido

- tracking continuo o ubicacion en tiempo real;
- domicilio del Owner o del reportante;
- rutas recorridas por una persona o mascota;
- alertas push por proximidad;
- matching automatico;
- mapas de calor;
- geocodificacion silenciosa de registros heredados;
- cambios de ownership, custodia, Foster o adopcion.

## 3. Diagnostico actual

### 3.1 Entidades involucradas

| Entidad | Uso actual | Datos geograficos actuales | Brecha |
| --- | --- | --- | --- |
| `pet_alert_lost_pets` | Boletin canonico de mascota extraviada Owner o externa | Ciudad, region, pais, referencia, `last_seen_lat`, `last_seen_lng`, `location_precision` | No separa coordenada privada de publica ni registra fuente, precision del dispositivo o fecha de captura |
| `pet_alert_lost_pet_sightings` | Informacion aportada sobre una alerta existente | Ciudad, region, pais, referencia, `latitude`, `longitude`, `location_precision` | Coordenadas opcionales sin proyeccion publica separada; UI no las captura |
| `pet_alert_community_sightings` | Mascota aparentemente perdida vista por la comunidad | Ciudad, region, pais, referencia y precision textual | No tiene latitud ni longitud |
| `pet_alert_external_reporters` | Identidad/contacto privado del propietario externo | Ninguno | No debe recibir coordenadas; la ubicacion pertenece al evento, no a la persona |
| `pet_alert_media` y media comunitaria | Fotografias privadas con proyeccion controlada | Ninguno | Sin cambio requerido para MAP-2 |
| `pet_alert_moderation_cases` e historial | Moderacion y auditoria | Ninguno | Falta accion especifica para retirar o corregir visibilidad geografica |

### 3.2 Coordenadas ya disponibles

`pet_alert_lost_pets` incluye:

- `last_seen_lat double precision` con rango `-90..90`;
- `last_seen_lng double precision` con rango `-180..180`;
- paridad obligatoria: ambas coordenadas son nulas o ambas tienen valor;
- `location_precision` con `exact`, `approximate` o `city`.

`pet_alert_lost_pet_sightings` incluye el mismo patron mediante `latitude` y
`longitude`. Las RPC de creacion y actualizacion ya aceptan esos valores.

Estos campos no aparecen en los DTO de lectura publica. Tampoco aparecen en los
modelos de lectura Owner, por lo que hoy funcionan como capacidad de escritura
latente y no como experiencia completa.

`pet_alert_community_sightings` no contiene coordenadas. Solo admite
`location_precision` con `approximate` o `city`.

### 3.3 Flujos de captura actuales

| Recorrido | Captura actual | Coordenadas enviadas |
| --- | --- | --- |
| Owner Mobile, mascota extraviada | Fecha, ciudad, region, pais y referencia manual | Siempre nulas |
| Web publica, propietario externo | Fecha, ciudad, region, pais y referencia manual | No forman parte del contrato Edge Function |
| Mobile, reporte comunitario | Ciudad, referencia y descripcion manual | La entidad no las soporta |
| Web, reporte comunitario | Ciudad, referencia y descripcion manual | La entidad no las soporta |
| Web, avistamiento sobre alerta | Zona y observacion manual | La API soporta coordenadas, pero la pantalla no las obtiene |

Ninguna pantalla solicita permisos GPS actualmente. Esto coincide con la
documentacion vigente, que declara explicitamente `sin GPS` y `sin mapa`.

### 3.4 Proyeccion publica

Las superficies publicas consumen:

- `list_public_pet_alert_directory` para `/pet-alert`;
- `get_public_pet_alert_lost_pet_by_slug` para una mascota extraviada;
- `get_public_pet_alert_community_sighting_by_slug` para una mascota vista;
- RPC de media publica para resolver fotografias firmadas.

Estas RPC exponen ciudad, region, pais y referencia, pero no coordenadas ni IDs
internos. La politica actual es correcta y debe conservarse. MAP-2 no debe agregar
coordenadas privadas a ninguna firma existente.

### 3.5 RLS y seguridad actuales

- Las tablas PET ALERT tienen RLS activa.
- Las lecturas publicas se realizan mediante funciones `security definer`
  sanitizadas.
- El reporte externo entra por una Edge Function con service role, OTP,
  Turnstile y limites de frecuencia.
- Admin accede a colas controladas mediante RPC.
- Storage permanece privado y se abre mediante helpers y URLs firmadas.

La futura ubicacion exacta debe heredar este patron: ninguna lectura directa
anonima y ninguna coordenada privada en DTO publicos, logs o analitica.

## 4. Tecnologia cartografica

### Disponible

- PostGIS esta habilitado en el esquema `extensions`.
- `provider_public_locations` demuestra el patron
  `geography(Point, 4326)`, columna generada e indice GiST.
- Mobile tiene `@maplibre/maplibre-react-native` y carga diferida del modulo.
- Marketplace Mobile ya implementa mapa, camara y anotaciones.

### No disponible todavia

- `apps/web` no declara MapLibre GL JS ni otra libreria cartografica.
- No existe componente de mapa compartido entre Web y Mobile.
- El estilo Mobile actual usa `https://demotiles.maplibre.org/style.json` y su
  propio copy indica que es solo para demo.
- No hay proveedor de tiles, geocodificacion ni limites de cuota documentados
  para produccion.
- No existen variables de ambiente para estilo, tiles o geocodificador.

### Decision recomendada

Usar MapLibre en Web para coherencia conceptual, pero seleccionar antes de
MAP-6 un proveedor de estilo/tiles apto para produccion. El mapa no debe depender
del endpoint demo. La busqueda por texto requiere un geocodificador separado y
debe quedar desacoplada del renderizador del mapa.

MAP-2 no necesita instalar una libreria de mapas. Solo prepara datos, funciones
y contratos.

## 5. Modelo de privacidad

### Clasificacion

| Dato | Clasificacion | Visibilidad |
| --- | --- | --- |
| Coordenada capturada | Sensible | Autor autorizado y Admin geografico |
| Precision del dispositivo | Sensible | Backend y Admin geografico |
| Fuente de captura | Operativa | Autor autorizado y Admin geografico |
| Coordenada publica aproximada | Publica controlada | Directorio y ficha publica |
| Ciudad, region, pais | Publica controlada | Directorio y ficha publica |
| Referencia textual | Publica moderada | Directorio y ficha publica |

### Reglas obligatorias

1. Solicitar permiso solo despues de una accion explicita.
2. La ubicacion del dispositivo es una propuesta; el usuario debe confirmarla.
3. No asumir que la ubicacion actual es el lugar del evento.
4. Permitir continuar sin permiso mediante mapa manual o texto.
5. Generar la coordenada publica en servidor.
6. Mantener estable la coordenada publica mientras no cambie el lugar privado.
7. No recalcularla en cada consulta, porque produciria marcadores que se mueven.
8. No incluir coordenadas privadas en respuestas publicas, errores o logs.
9. La referencia no debe aceptar domicilios completos; requiere validacion y
   moderacion de texto.
10. Retirar un punto del mapa no debe borrar el boletin ni su historial.

### Generalizacion recomendada

Al confirmar una coordenada privada, una funcion `security definer` debe crear
una coordenada publica desplazada en una direccion aleatoria y dentro de un
radio configurado. Para el piloto se recomienda:

- area urbana: desplazamiento entre 250 y 500 metros;
- zona rural o sensible: entre 500 y 1,000 metros;
- precision `city`: no crear punto sin confirmacion manual; mostrar solo lista.

El punto publico se guarda, no se deriva en cada lectura. No debe usarse un
desplazamiento determinista basado en IDs publicos. Una correccion privada debe
generar un nuevo punto publico y dejar auditoria.

## 6. Modelo de datos propuesto para MAP-2

### 6.1 Estrategia compatible

No renombrar ni eliminar columnas existentes.

Para `pet_alert_lost_pets`:

- tratar `last_seen_lat` y `last_seen_lng` como coordenada privada heredada;
- agregar `public_latitude` y `public_longitude`;
- agregar `location_accuracy_meters`;
- agregar `location_source`;
- agregar `location_captured_at`;
- agregar `public_location_visible boolean not null default false`;
- agregar puntos PostGIS generados privado y publico;
- agregar indice GiST solo sobre el punto publico visible.

Para `pet_alert_lost_pet_sightings`:

- tratar `latitude` y `longitude` como coordenada privada heredada;
- agregar la misma metadata y proyeccion publica;
- no hacer publicos los avistamientos individuales en MAP-2.

Para `pet_alert_community_sightings`:

- agregar `private_latitude`, `private_longitude`;
- agregar `public_latitude`, `public_longitude`;
- agregar precision, fuente, fecha y flag de visibilidad;
- agregar puntos PostGIS generados e indice GiST publico.

### 6.2 Valores de fuente

- `device`: coordenada propuesta por el dispositivo y confirmada;
- `map`: marcador colocado o movido manualmente;
- `search`: resultado geocodificado confirmado en mapa;
- `legacy_text`: registro anterior sin coordenada confirmada.

`legacy_text` debe conservar coordenadas nulas y no aparecer en el mapa.

### 6.3 Constraints

- latitud privada entre `-90` y `90`;
- longitud privada entre `-180` y `180`;
- latitud publica entre `-90` y `90`;
- longitud publica entre `-180` y `180`;
- cada par debe ser ambos nulos o ambos no nulos;
- precision no negativa y con maximo operativo razonable;
- `public_location_visible = true` exige punto publico completo;
- una fuente distinta de `legacy_text` exige punto privado completo;
- `location_captured_at` no puede estar irrazonablemente en el futuro;
- valores no finitos deben rechazarse antes del cast o en RPC.

### 6.4 Migracion de registros existentes

- No geocodificar ciudad o referencia automaticamente.
- Marcar registros existentes como `location_source = 'legacy_text'`.
- Mantener sus coordenadas actuales, si existen, como privadas.
- No generar punto publico para coordenadas heredadas sin nueva confirmacion.
- Mantenerlos visibles en lista y ficha como hoy.
- Permitir al autor confirmar la zona en slices posteriores y entonces generar
  la proyeccion publica.

## 7. Contratos propuestos

### Escritura Owner y avistamiento autenticado

Extender de forma compatible los DTO de escritura con un objeto opcional:

```ts
interface PetAlertLocationInput {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  source: "device" | "map" | "search";
  capturedAt: string;
}
```

Las RPC deben ignorar cualquier coordenada publica enviada por clientes. El
servidor genera y conserva esa proyeccion.

### Reporte externo

La Edge Function puede aceptar el mismo objeto opcional dentro del payload
verificado. Debe validar forma, rango, tamano y consistencia antes de llamar una
RPC service-role. Nunca debe registrar el objeto completo en logs.

### Lectura publica

No modificar silenciosamente las RPC existentes. Agregar una proyeccion
especifica para mapa, por ejemplo:

```ts
interface PublicPetAlertMapPoint {
  eventType: "lost_pet" | "community_sighting";
  publicSlug: string;
  publicPath: string;
  statusGroup: "active" | "found";
  title: string;
  species: string;
  city: string;
  occurredAt: string;
  photoUrl: string | null;
  publicLatitude: number;
  publicLongitude: number;
}
```

La RPC `list_public_pet_alert_map_points` debe:

- aceptar filtros compatibles con el directorio;
- devolver solo eventos publicables y no vencidos;
- exigir `public_location_visible` y punto publico completo;
- aplicar limite y bounding box;
- no devolver referencia detallada, coordenada privada, precision, usuario,
  household, contacto ni ID interno.

### Lectura privada y Admin

Crear RPC separadas para:

- que el autor recupere su ubicacion confirmada al editar;
- que un Admin con permiso explicito compare punto privado y publico;
- retirar, corregir o regenerar la proyeccion publica con motivo obligatorio.

No ampliar la RPC general de moderacion con coordenadas privadas.

## 8. Reglas RLS y permisos

- Las tablas conservan RLS activa.
- `anon` nunca obtiene `select` directo sobre coordenadas.
- La RPC publica solo devuelve el punto generalizado.
- Owner accede al punto privado solo si mantiene permisos sobre la mascota y
  household.
- El autor de un reporte comunitario accede solo a su propio punto privado.
- El propietario externo gestiona ubicacion mediante su token privado y Edge
  Function, no mediante acceso anonimo a tablas.
- `is_platform_admin` por si solo no debe implicar que toda pantalla recibe la
  coordenada exacta; la proyeccion debe ser deliberada y auditable.
- Cada correccion, regeneracion o retiro geografico se registra en historial y
  `audit_logs` sin copiar coordenadas a texto libre.

## 9. Navegacion y experiencia futura

### Captura

1. Preguntar `Donde se perdio o fue vista la mascota?`.
2. Ofrecer `Usar mi ubicacion`, `Elegir en el mapa` y `Buscar una zona`.
3. Mostrar un marcador editable.
4. Solicitar ciudad y referencia comprensible.
5. Exigir `Usar esta zona` antes de avanzar.
6. Mostrar `Publicaremos una ubicacion aproximada para proteger tu privacidad`.
7. Si falla o se rechaza el permiso, mantener mapa manual y texto.

### Directorio publico

- Control segmentado `Lista | Mapa`.
- Lista como vista canonica y fallback accesible.
- Mismos filtros para ambas vistas.
- Marcadores agrupados a escalas amplias.
- Estado distinguido por icono, etiqueta y color.
- Ficha compacta con foto, titulo, estado, zona, fecha y `Ver boletin`.
- No mostrar un marcador inventado para registros sin coordenadas.

## 10. Slices definitivos

| Slice | Resultado | Dependencias | Migracion |
| --- | --- | --- | --- |
| MAP-1 | Diagnostico y diseno tecnico | Ninguna | No |
| MAP-2 | Modelo privado/publico, generalizacion, RLS, RPC y tipos | Aprobacion de este documento | Si, local primero |
| MAP-3 | Captura y confirmacion en Owner Mobile | MAP-2, politica de tiles/geocodificacion | No prevista |
| MAP-4 | Captura en reporte externo Web/Edge Function | MAP-2, MAP-3 como patron UX | Posible ajuste RPC, no tabla nueva |
| MAP-5 | Captura de reporte y avistamiento comunitario | MAP-2 | No prevista |
| MAP-6 | Mapa publico Web con Lista/Mapa, clustering y filtros | MAP-2 y proveedor cartografico aprobado | No |
| MAP-7 | Moderacion geografica Admin y auditoria | MAP-2 | Posible ajuste de permisos/RPC |
| MAP-8 | QA, privacidad, rendimiento y endurecimiento | MAP-3 a MAP-7 | Solo correcciones justificadas |

## 11. Riesgos y mitigaciones

| Riesgo | Severidad | Mitigacion |
| --- | --- | --- |
| Revelar domicilio o rutina del Owner | Critica | Coordenada privada separada, desplazamiento server-side, referencia moderada |
| Exponer coordenadas por una RPC existente | Critica | Nueva RPC publica minima y pruebas de contrato negativas |
| Scraping masivo del mapa | Alta | Limite, bounding box, rate limit, cache control y sin IDs internos |
| Usuario reporta su ubicacion actual en vez del evento | Alta | Confirmacion visual y copy explicito |
| Punto publico cae en sitio imposible o sensible | Media | Radio acotado, revision Admin y opcion de retirar mapa |
| Geocodificador registra consultas sensibles | Alta | Proveedor revisado, proxy si aplica y politica de retencion |
| Costos o caida de tiles | Media | Proveedor productivo, limites, observabilidad y fallback a lista |
| Registros heredados parecen incompletos | Baja | Permanecen en lista con ubicacion textual; no inventar punto |
| Clustering oculta urgencia o estado | Media | Conteo accesible, leyenda y expansion clara |
| Coordenadas exactas aparecen en logs | Critica | Redaccion estructurada y pruebas de logging |

## 12. Criterios de aceptacion globales

### Datos y seguridad

- Ninguna respuesta publica contiene coordenadas privadas.
- El cliente nunca puede elegir la coordenada publica.
- Todos los pares de coordenadas y rangos se validan en servidor.
- Los reportes heredados siguen funcionando sin mapa.
- Una ubicacion puede retirarse del mapa sin borrar el boletin.
- Toda accion Admin geografica queda auditada.

### UX

- Negar GPS no bloquea ningun reporte.
- El permiso se solicita solo tras pulsar `Usar mi ubicacion`.
- El usuario confirma el punto antes de guardarlo.
- Lista y mapa comparten filtros y estados.
- La lista sigue siendo completamente operativa sin JavaScript cartografico.
- Marcadores tienen nombre accesible y no dependen solo del color.

### Operacion

- El mapa no usa tiles demo en produccion.
- Existen limites de consulta por bounding box y cantidad.
- Carga, vacio, error y proveedor caido tienen fallback probado.
- Mobile, Web y Admin no registran coordenadas privadas en telemetria.

## 13. Decisiones requeridas antes de MAP-2

1. Aprobar radios de generalizacion para area urbana y rural.
2. Aprobar que registros heredados no aparezcan en mapa hasta confirmacion.
3. Definir si avistamientos individuales apareceran en un slice posterior o
   solo actualizaran la historia de una alerta.
4. Definir el permiso Admin que habilita coordenada exacta.
5. Antes de MAP-3/MAP-6, seleccionar proveedor productivo de tiles y
   geocodificacion, sus cuotas y politica de privacidad.

## 14. Prompt exacto para PET ALERT MAP-2

```text
Quiero implementar PET ALERT MAP-2: modelo de datos seguro para geolocalizacion
privada y mapa publico aproximado.

Fuente de verdad:
- docs/modules/pet_alert_map.md
- docs/modules/pet_alert.md
- docs/data/PET_ALERT_DATA_MODEL.md
- docs/data/SUPABASE_SCHEMA.md
- docs/data/RLS_RULES.md
- docs/api/PET_ALERT_API_CONTRACT.md
- docs/HANDOFF.md

Objetivo:
Crear una migracion versionada y compatible que separe coordenadas privadas de
coordenadas publicas generalizadas para `pet_alert_lost_pets`,
`pet_alert_lost_pet_sightings` y `pet_alert_community_sightings`.

Reglas obligatorias:
- Conservar `last_seen_lat/last_seen_lng` y `latitude/longitude` existentes como
  datos privados heredados; no renombrarlos ni eliminarlos.
- Agregar coordenadas publicas, precision, fuente, fecha de captura y flag de
  visibilidad geografica segun el diseno MAP-1.
- Agregar constraints de rango, paridad y consistencia.
- Reutilizar PostGIS del esquema `extensions` con puntos geography generados e
  indice GiST para la proyeccion publica.
- Crear una funcion server-side para generar y persistir un punto publico
  desplazado. El cliente nunca envia coordenadas publicas.
- Marcar registros heredados como `legacy_text`; no geocodificarlos ni generar
  puntos publicos automaticamente.
- Crear `list_public_pet_alert_map_points` con filtros, bounding box y limite.
- La RPC publica no puede devolver coordenadas privadas, precision, fuente,
  usuario, household, contacto, direccion ni IDs internos.
- Crear lecturas privadas separadas para autor/Admin solo si son necesarias para
  cerrar el contrato de MAP-2.
- Mantener RLS y revocar acceso publico directo.
- Auditar mutaciones administrativas sin escribir coordenadas en texto libre.
- Actualizar `packages/types`, `packages/api-client` y tipos de base de datos.
- No implementar mapas ni pedir permisos GPS en este slice.
- No instalar dependencias.
- No tocar Foster, Provider, booking, pagos o Clinical Access.
- No aplicar la migracion remotamente y no ejecutar `supabase db push`.
- No hacer commit ni push.

Antes de editar:
1. Confirmar el estado remoto mediante dry-run no destructivo si el entorno ya
   esta configurado.
2. Revisar las firmas actuales de RPC para preservar compatibilidad.
3. Presentar el listado exacto de archivos a modificar.

Validaciones:
- ejecutar validacion local de migraciones disponible en el repositorio;
- lint y typecheck de `@pet/types` y `@pet/api-client`;
- pruebas negativas de la proyeccion publica;
- `git diff --check`.

Entrega:
1. Diagnostico confirmado.
2. Migracion creada, no aplicada remoto.
3. Contratos y tipos modificados.
4. Prueba de que la RPC publica no expone datos privados.
5. Compatibilidad con registros heredados.
6. Validaciones ejecutadas.
7. Riesgos residuales.
8. Guia de revision y comando de dry-run, sin ejecutar db push.
```
