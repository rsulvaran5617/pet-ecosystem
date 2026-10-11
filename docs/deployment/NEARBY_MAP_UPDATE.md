# Actualizacion web del mapa cercano

Script: `scripts/update-nearby-map.cjs`. Ejecutar como root en la gota existente,
con Node 22, PNPM/Corepack, Git y PM2 ya instalados. No usar el bootstrap
`deploy-droplet.ps1` para esta actualizacion.

El script recibe el SHA completo del commit del mapa y `--activate`. Detecta el
cwd web activo y copia sus fuentes/configuracion a una ruta nueva; sustituye
unicamente los tres archivos del mapa. Conserva las correcciones del formulario,
enlaces beta y variables del release activo. Compara los componentes actuales
con el padre del commit y se detiene si hay cambios incompatibles.

Instala dependencias y compila antes de reemplazar el proceso web. Verifica la
candidata en 127.0.0.1:3076, rutas, configuracion compilada y HTML publico HTTPS.
Conserva el release anterior y restaura su proceso si falla la activacion.
Requiere puerto 3076 libre. Deja `nearby-map-release.json` con SHA de los archivos
superpuestos, build y ruta anterior; no es un despliegue completo de ese commit.

Desde SSH/Web Console, reemplazar SHA_COMPLETO por el commit entregado:

```bash
set -e
cd /var/www/pet-ecosystem
git fetch origin master
COMMIT=SHA_COMPLETO
git show "$COMMIT:scripts/update-nearby-map.cjs" > /tmp/pet-update-nearby-map.cjs
node /tmp/pet-update-nearby-map.cjs "$COMMIT" --activate
```

No modifica Nginx, certificados, admin, Supabase ni mobile. Sin `--activate`
prepara/verifica una candidata y la apaga; si ya existe la carpeta de candidata,
se detiene para permitir inspeccion antes de repetir. No borra releases previos.
La comprobacion web puede implicar un breve reinicio mientras cambia PM2.

Rollback manual: consultar `previous` en el JSON de la nueva version y recrear
solo `pet-ecosystem-web` con ese cwd y el comando de inicio registrado en el
script; comprobar HTTPS y ejecutar `pm2 save`. Nunca restaurar todo el dump PM2.

Validacion del script: sintaxis Node comprobada localmente; lectura remota
confirma cwd, proceso y recursos. No ejecutado ni desplegado en esta entrega.
Tras ejecutarlo, probar Mapa/Usar mi ubicacion en el telefono; el chequeo HTTP
del script no sustituye permisos reales Safari/WhatsApp.
