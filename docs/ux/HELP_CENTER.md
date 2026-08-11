# HELP_CENTER.md

## Objetivo

El Centro de ayuda publico de Pet Ecosystem centraliza manuales de uso para los grupos principales del piloto:

- propietarios de mascotas;
- proveedores de servicios;
- familias protectoras;
- adoptantes interesados.

La primera version queda publicada como contenido estatico en `/ayuda`. No introduce backend nuevo, no crea migraciones, no toca Supabase, no cambia reglas de reservas, adopcion, pagos, QR, evidencia ni marketplace.

## Ruta publica

- Web publica: `/ayuda`
- Enlaces desde landing:
  - navegacion principal: `Ayuda`
  - footer Producto: `Centro de ayuda`
  - footer Contacto: `Manual de usuario`

## Arquitectura de contenido

La pagina usa una estructura por rol:

1. Hero publico con descripcion del manual y estado de piloto.
2. Metricas compactas de roles, guias y flujos piloto.
3. Indice rapido por rol y privacidad.
4. Cards resumen por grupo de usuario.
5. Navegacion lateral con anclas.
6. Guias detalladas por flujo.
7. Bloque final de privacidad, limites y alcance.

Cada guia contiene:

- titulo;
- plataforma;
- estado;
- objetivo;
- antes de empezar;
- pasos;
- resultado esperado;
- errores comunes;
- privacidad y seguridad.

## Cobertura inicial

### Propietarios

- crear cuenta e iniciar sesion;
- crear hogar y registrar mascotas;
- documentos, salud y recordatorios;
- buscar servicios y crear reserva;
- mensajes, reservas y eliminacion de cuenta.

### Proveedores

- entrar a la consola proveedor;
- configurar negocio y perfil publico;
- crear y mantener servicios;
- agenda, horarios y cupos;
- reservas entrantes y conversaciones.

### Familias protectoras

- solicitar familia protectora;
- perfil publico y apoyo opcional;
- registrar mascota en acogida;
- publicar adopcion responsable;
- solicitudes y transferencia.

### Adoptantes

- ver mascotas que buscan hogar;
- solicitar adopcion;
- donaciones informativas;
- seguimiento y transferencia.

## Criterios de contenido

- No mostrar UUIDs, nombres de tablas ni detalles tecnicos al usuario final.
- No publicar criterios internos de admin/soporte dentro del manual publico; ese contenido vive en `admin.petecosyst.com`.
- Separar claramente adopcion responsable de servicios comerciales.
- Aclarar que pagos reales siguen fuera de la app durante piloto.
- Aclarar que Pet Ecosystem no procesa ni valida donaciones.
- Aclarar que salud/vacunas son informacion de cuidado y no sustituyen diagnostico veterinario.
- Aclarar que la eliminacion de cuenta anonimiza datos personales y conserva historial transaccional necesario para operacion, soporte y auditoria.

## Pendientes recomendados

- Incorporar capturas reales validadas por QA por cada plataforma.
- Agregar una busqueda textual client-side si el volumen de guias crece.
- Crear version descargable PDF cuando el manual se estabilice.
- Agregar fecha de ultima actualizacion visible.
- Preparar variante legalmente revisada antes de produccion publica masiva.

## Manual interno admin

El contenido operativo de admin y soporte no se muestra en `/ayuda`. Queda disponible dentro del backoffice `admin.petecosyst.com`, bajo la seccion `Manual admin`, despues de la autenticacion y validacion del rol `admin`.

## SKIN-2

`SKIN-2` aplica el skin profesional al centro de ayuda publico:

- hero mas ejecutivo;
- resumen numerico del manual;
- cards por rol con icono textual consistente;
- sidebar de exploracion mas claro;
- guias mas compactas y escaneables;
- responsive mobile con grid de una columna;
- separacion explicita de contenido publico vs admin.
