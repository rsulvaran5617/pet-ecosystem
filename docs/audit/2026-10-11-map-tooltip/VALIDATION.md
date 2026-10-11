# Tooltip del mapa web

Build de produccion con lint/tipos PASS. Chrome headless con datos y estilo
simulados: hover, texto seguro (nombre con HTML tratado literalmente), enlace,
Escape, toque emulado, lista accesible y cambio de filtro/grupo PASS.
Evidencia: browser-check.json. No equivale a prueba en iPhone fisico.

Despliegue autorizado: script update-nearby-map.cjs con --tooltip superpone
solo componente y CSS en copia del release activo; conserva geolocalizacion,
configuracion, admin y backend. Verificacion de fuentes previas y rollback
automatico antes de declarar activacion. Evidencia remota se agrega al cierre.
