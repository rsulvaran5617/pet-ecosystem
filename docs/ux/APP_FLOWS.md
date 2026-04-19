# APP_FLOWS.md

## Flujos criticos MVP

### Flujo 1: alta de usuario y mascota
1. onboarding
2. registro
3. verificacion
4. crear hogar
5. crear mascota
6. completar perfil base o salud inicial

### Flujo 2: salud y reminders
1. abrir mascota
2. registrar vacuna, alergia o condicion
3. generar o visualizar reminder
4. completar o posponer reminder

### Flujo 3: discovery y booking owner-side
1. abrir marketplace
2. buscar proveedor
3. aplicar filtros
4. abrir perfil publico
5. seleccionar servicio
6. abrir booking preview
7. crear booking
8. si el servicio es `instant`, nace `confirmed`
9. si el servicio es `approval_required`, nace `pending_approval`

### Flujo 4: operacion provider-side
1. registrarse como provider
2. crear organizacion
3. configurar perfil, servicios y disponibilidad
4. subir documentos
5. esperar aprobacion admin
6. recibir booking en la cola de la organizacion
7. aprobar o rechazar si el booking esta en `pending_approval`
8. completar el booking cuando ya este `confirmed`

### Flujo 5: cierre del servicio
1. booking en `completed`
2. review del cliente
3. soporte si aplica

### Flujo 6: operacion admin
1. abrir proveedores pendientes
2. revisar detalle y documentos
3. aprobar o rechazar
4. abrir soporte
5. actualizar estado o resolucion
6. dejar trazabilidad minima en `audit_logs`

## Nota de UX web publica
El discovery web puede operar sin autenticacion.
La creacion del booking sigue requiriendo sesion valida.
