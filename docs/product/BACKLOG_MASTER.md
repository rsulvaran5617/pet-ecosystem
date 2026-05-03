# BACKLOG_MASTER.md

## Estructura del backlog
El backlog se organiza por épicas:

- EP-01 Identidad, acceso y seguridad
- EP-02 Hogar, roles y permisos
- EP-03 Mascotas, documentos y expediente base
- EP-04 Salud, agenda y recordatorios
- EP-05 Discovery y marketplace
- EP-06 Booking, checkout, pagos y estados transaccionales
- EP-07 Mensajería, reviews, trust & support
- EP-08 Onboarding y operación base de proveedores
- EP-09 Ejecución de servicios y provider ops de cuidadores
- EP-10 Clínica digital
- EP-11 Comercio, tienda, farmacia y suscripciones
- EP-12 Finanzas del dueño, beneficios, memberships y telecare

## Regla de priorización
Si hay conflicto entre backlog y alcance del release:
manda el archivo de release (`docs/delivery/MVP_SCOPE.md`, `docs/delivery/V2_SCOPE.md`, `docs/delivery/V3_SCOPE.md`).

## Formato esperado de historias
- ID
- épica
- actor
- descripción
- criterios de aceptación
- dependencias
- release

## Orden oficial
1. EP-01
2. EP-02
3. EP-03
4. EP-04
5. EP-05
6. EP-06
7. EP-07
8. EP-08
9. EP-09
10. EP-10
11. EP-11
12. EP-12

## Historias candidatas V2

### EP-05-MKT-V2-01 - Discovery por cercania y mapa

- ID: EP-05-MKT-V2-01
- epica: EP-05 Discovery y marketplace
- actor: duenio de mascota
- descripcion: como duenio de mascota quiero ver proveedores aprobados en un mapa y ordenarlos por cercania a mi hogar o ubicacion seleccionada, para elegir servicios accesibles geograficamente.
- criterios de aceptacion:
  - los negocios proveedores pueden tener una ubicacion geografica validada
  - el marketplace permite buscar proveedores por cercania
  - el duenio puede elegir hogar, direccion o ubicacion actual como punto de referencia
  - los resultados muestran distancia aproximada
  - el mapa solo muestra proveedores aprobados, publicos y con servicios activos
  - la ubicacion no expone datos privados fuera del perfil publico acordado
- dependencias:
  - provider organizations con ubicacion geografica
  - direcciones de hogares o ubicacion seleccionada del owner
  - permisos de ubicacion mobile si se usa ubicacion actual
  - indices geoespaciales en Supabase/Postgres
  - UX de mapa y fallback de lista
- release: V2
