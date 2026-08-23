# PET ALERT UX

## Principios

- Una decision principal por pantalla.
- Lenguaje prudente, simple y no acusatorio.
- Botones grandes, regreso visible y progreso persistente.
- Guardado como borrador cuando el usuario abandona un wizard autenticado.
- La ubicacion se explica como aproximada antes de publicar.
- Las acciones urgentes muestran recomendaciones de seguridad, no instrucciones de captura.

## Entrada PET ALERT

Copy: "Activa una alerta o reporta una mascota vista para ayudar a reunirla con su familia."

Dos acciones visualmente separadas:

1. **Mi mascota se perdio** - "Crea una alerta desde una mascota de tu hogar."
2. **Vi una mascota perdida** - "Reporta una mascota aparentemente perdida."

Nunca se reutiliza un mismo formulario para ambos recorridos.

## Flujo A: Mi mascota se perdio

### Paso 1. Mascota

- Si entra desde el expediente, queda preseleccionada.
- Si entra desde PET ALERT, muestra solo mascotas elegibles.
- Explica por que una mascota no puede seleccionarse.

### Paso 2. Ultimo avistamiento

- Fecha y hora aproximada.
- Ciudad/zona y referencia.
- Sin permiso GPS obligatorio y sin direccion residencial.
- Mapa se difiere; entrada manual funciona en el primer release.

### Paso 3. Como reconocerla

- Foto principal, color, tamano, collar, senas y comportamiento.
- Nota medica publica solo con confirmacion explicita.
- Contacto interno seleccionado por defecto.

### Paso 4. Vista previa

- Replica la ficha publica.
- Destaca zona aproximada y datos que seran visibles.
- Acciones: `Editar` y `Publicar PET ALERT`.

### Paso 5. Alerta activa

- Estado, enlace, compartir, copiar enlace y reportes recibidos.
- CTA principal cambia segun contexto: `Revisar avistamientos` o `Marcar como encontrada`.
- Cerrar sin encontrar exige confirmacion y motivo.

### Avistamientos

Lista en acordeon, uno abierto a la vez. Cabecera: fecha, zona y estado. Detalle: comentario, foto y contacto solo cuando existe consentimiento.

## Flujo B: Vi una mascota perdida

### Paso 1. Seguridad

Mensaje: "No te pongas en riesgo ni intentes acercarte si no es seguro."

### Paso 2. Foto

Tomar, seleccionar o continuar sin foto. No bloquea el reporte.

### Paso 3. Lugar y momento

Zona aproximada, referencia, ciudad/pais y fecha/hora. No solicita direccion exacta.

### Paso 4. Descripcion

Especie, tamano, color, raza aparente, collar, senas y comportamiento. Cada valor admite `No se`.

### Paso 5. Situacion y contacto

Situacion observada y opciones de contacto: controlado, privado o anonimo. Si existe riesgo/herida, muestra orientacion local sin prometer respuesta de emergencia.

### Paso 6. Vista previa y publicacion

Explica que el reporte no determina abandono ni propiedad. Al publicar entrega enlace compartible y, si es anonimo, un mecanismo seguro de gestion.

## Reclamo

`Esta mascota es mia` exige login. Wizard:

1. Identificar una mascota registrada o describirla.
2. Aportar senas privadas y fecha/zona de perdida.
3. Adjuntar evidencia privada opcional.
4. Confirmar consentimiento de contacto controlado.
5. Ver estado del reclamo.

No muestra datos del reportante antes de una decision autorizada.

Slice 5 implementa la primera version sin adjuntos: la ficha comunitaria ofrece `¿Crees que es tu mascota?`, exige login, sena privada y consentimiento. El autor revisa solicitudes dentro de `Tus reportes` mobile y autoriza o rechaza el contacto. Una solicitud no acredita propiedad ni entrega custodia.

## Slice 6 admin y moderacion

Admin incorpora una seccion PET ALERT con filtros, lista compacta, detalle del contenido reportado y decisiones contextualizadas. Toda accion exige justificacion. Pausar retira contenido sensible sin borrarlo; restaurar, cerrar, rechazar solicitud y descartar se muestran solo cuando aplican.

## Paginas publicas

- `/pet-alert`: entrada y explicacion de ambos recorridos.
- `/pet-alert/mascota-perdida/[alertSlug]`: alerta owner y CTA de avistamiento.
- `/pet-alert/mascota-perdida/[alertSlug]/avistamiento`: formulario publico.
- `/pet-alert/reportar-mascota-vista`: reporte comunitario.
- `/pet-alert/mascota-vista/[reportSlug]`: ficha comunitaria.
- `/pet-alert/mascota-vista/[reportSlug]/reclamar`: login y reclamo.

Todas incluyen compartir, reportar abuso, estado visible y aviso de seguridad. Una ficha cerrada permanece consultable con datos reducidos y sin CTA operativo.

## Mobile propuesto

- Home PET ALERT.
- Selector de mascota.
- Wizard owner.
- Alerta activa y avistamientos.
- Wizard comunitario.
- Reporte publicado.
- Reclamo y seguimiento.
- Historial PET ALERT dentro del expediente.

## Estados de interfaz

- Carga con skeleton estable.
- Error en lenguaje accionable y `Reintentar`.
- Vacio con siguiente accion concreta.
- Offline conserva borrador local, pero no confirma publicacion.
- Publicando bloquea doble envio.
- Exito muestra enlace y siguiente paso.
- `flagged` explica que la publicacion esta temporalmente oculta.

## Accesibilidad

- Objetivos tactiles de al menos 44 px.
- No depender solo del color para estados.
- Labels accesibles en compartir, cerrar, foto y ubicacion.
- Texto redimensionable y campos con ayudas breves.
- Confirmacion explicita para publicar contacto o condicion medica.

## Criterios de aceptacion

- Una persona puede identificar el flujo correcto sin leer documentacion.
- Siempre existe una accion para volver sin perder el borrador.
- La vista previa coincide con los datos publicos.
- Contacto y coordenadas exactas nunca aparecen por defecto.
- Las fichas funcionan en pantallas pequenas y web responsive.
## Slice 7A fotos comunitarias

El formulario `Vi una mascota perdida` permite agregar hasta tres fotos opcionales desde camara o galeria, previsualizarlas y quitarlas antes de publicar. La portada aparece en listados mobile/web y la ficha publica presenta la galeria.
# Slice 7B - Centro comunitario

La ficha comunitaria `/pet-alert/mascota-vista/[slug]` usa una composicion de boletin: fotografia principal sin recorte, miniaturas cuando existen varias imagenes, estado y zona general, datos para reconocerla, recomendaciones de seguridad y contacto controlado separado del contenido publico.

`/pet-alert` funciona como centro de consulta, no como feed social. Prioriza busqueda y escaneo:

- pestanas `Extraviadas`, `Mascotas vistas` y `Encontradas`;
- buscador por datos publicos y filtros plegables de ciudad/especie;
- cards responsivas con estado, zona, fecha de actualizacion y CTA `Ver boletin`;
- estados de carga, error y vacio con recuperacion clara;
- acciones separadas para reportar una mascota propia o una mascota vista.
