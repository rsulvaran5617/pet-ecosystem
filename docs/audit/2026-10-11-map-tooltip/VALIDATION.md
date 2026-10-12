# Tooltip del mapa web

Build de produccion con lint/tipos PASS. Chrome headless con datos y estilo
simulados: hover, texto seguro (nombre con HTML tratado literalmente), enlace,
Escape, toque emulado, lista accesible y cambio de filtro/grupo PASS.
Evidencia: browser-check.json. No equivale a prueba en iPhone fisico.

Despliegue autorizado: script update-nearby-map.cjs con --tooltip superpone
solo componente y CSS en copia del release activo; conserva geolocalizacion,
configuracion, admin y backend. Verificacion de fuentes previas y rollback
automatico antes de declarar activacion. Evidencia remota se agrega al cierre.

Publicado commit funcional b5a37677dcc8f9f8e84758ce149831f25ab59506.
Build CoxNoye67nt7I4OODYf3c, cwd /var/www/pet-releases/map-tooltip-b5a37677dcc8.
Rollback /var/www/pet-releases/nearby-map-ce33fddc0b26. Script termino exit 0,
activated=true: rutas candidatas, configuracion compilada, HTML HTTPS y cwd
correctos; admin conserva PID. PM2 guardado, candidato retirado.

Navegador publico sin mocks: tooltip de Genaro visible con resumen publico y
enlace correcto; apertura del boletin PASS, sin excepciones runtime.
`public-check.json` usa UTC; la operacion corresponde al 11/10 en Panama.
