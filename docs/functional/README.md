# Canvas funcional de Pet Ecosystem

Corte del catálogo: 16/09/2026, código local `1352e4c`.

- `PET_ECOSYSTEM_CANVAS_FUNCIONAL.pdf`: documento para lectura, descarga e impresión, con índice enlazado y marcadores.
- `PET_ECOSYSTEM_CANVAS_FUNCIONAL.html`: canvas navegable, con índice y búsqueda de funciones. Funciona sin conexión y sin servicios externos.
- `PET_ECOSYSTEM_CANVAS_FUNCIONAL.md`: contenido editable y fuente única de los formatos anteriores.

Para usar el botón **Descargar PDF** del HTML, conservar PDF y HTML en la misma carpeta. La descarga de Markdown está embebida y no necesita otro archivo. **Imprimir / PDF** abre la impresión del navegador.

El catálogo describe implementación local, condiciones de disponibilidad y alcance futuro. No certifica despliegues productivos ni ejecuta operaciones sobre la aplicación.

## Regeneración

Desde la raíz del repositorio:

```powershell
node docs/functional/build-canvas.mjs
node docs/functional/render-canvas.mjs
```

El primer comando genera HTML y verifica estructura/identificadores. El segundo usa Chrome o Edge local en modo headless, con perfil temporal separado, para validar navegación/búsqueda/responsive, exportar PDF y generar capturas. Se puede indicar otro ejecutable compatible mediante `CANVAS_CHROMIUM_PATH`.

`canvas-validation.json` conserva el resultado de validación del artefacto. Las capturas `canvas-*-preview.png` son evidencia del documento, no capturas de las pantallas de producto.

Después de modificar el contenido, repetir la exportación y revisar PDF, tablas y número de páginas antes de distribuir.
