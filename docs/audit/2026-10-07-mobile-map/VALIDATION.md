# Acceso Owner al mapa y boletines

Implementación local: entrada visible en Inicio; directorio público con categorías,
Lista paginada, Mapa nativo, selección y apertura HTTPS del boletín en navegador.
Formulario comunitario conservado. Reutiliza MapLibre 10.4.2 ya instalado y APIs
compartidas. No se solicitaron permisos GPS ni se modificaron datos.

Verificación:
- TypeScript y lint mobile PASS.
- Expo export Android/iOS PASS (paquetes JavaScript, no binarios distribuidos).
- Consulta anónima real de mapa: lost HTTP200/1 punto válido; seen y found HTTP200/0.
- Filtros/área invalidan respuestas tardías; links limitados a las dos rutas públicas.
- No hay pruebas unitarias configuradas en mobile; no se contabiliza el script vacío.

QA nativa pendiente: render y atribución, zoom/scroll dentro del contenedor Owner,
selección de punto y alternativa textual, cambio de categoría, modo offline/reintento,
paginación con suficientes datos y retorno desde navegador. No afirmar PASS funcional
por export. No se generaron APK/IPA ni se subieron betas en esta entrega.

Límites: no clustering, no búsqueda geocodificada, detalle público abierto en navegador;
mapa limita a 500 puntos por área y alternativa textual a primeros 20 (Lista pagina).
La beta publicada iOS 0.3.1 (50) todavía no contiene este cambio.
