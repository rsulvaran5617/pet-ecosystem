# MVP_SCOPE.md

## Objetivo del MVP
Construir una primera versión comercialmente útil del ecosistema pet que permita:

### Para dueños
- crear cuenta,
- crear hogar,
- registrar mascotas,
- subir documentos básicos,
- registrar vacunas, alergias y condiciones base,
- crear recordatorios,
- descubrir proveedores,
- reservar servicios,
- pagar,
- chatear,
- calificar servicios,
- abrir casos de soporte.

### Para proveedores
- crear perfil,
- configurar servicios,
- definir disponibilidad,
- recibir solicitudes,
- aceptar o rechazar reservas,
- chatear con clientes,
- consultar bookings e ingresos básicos,
- enviar documentos de aprobación.

### Para la plataforma
- aprobar o rechazar proveedores,
- monitorear actividad básica,
- gestionar soporte básico,
- registrar trazabilidad,
- operar pagos y estados de reservas.

---

## Qué sí entra en MVP

### 1. Core platform
- onboarding
- registro
- login
- verificación
- perfil de usuario
- direcciones
- métodos de pago
- preferencias
- cambio de rol básico

### 2. Hogares
- crear hogar
- invitar miembros
- aceptar invitación
- permisos básicos por miembro

### 3. Mascotas
- crear mascota
- editar mascota
- perfil resumen
- documentos básicos

### 4. Salud básica
- vacunas
- alergias
- condiciones
- dashboard de salud simple

### 5. Agenda y recordatorios
- calendario
- recordatorios manuales
- recordatorios automáticos por vacunas
- integración con bookings

### 6. Marketplace
- home marketplace
- búsqueda
- filtros básicos
- perfil público del proveedor
- selección de servicio

### 7. Booking
- preview
- checkout
- booking instantáneo
- booking con aprobación
- estados básicos
- historial de reservas
- cancelación según política base

### 8. Pagos
- métodos de pago
- pago de reservas
- manejo de pagos fallidos

### 9. Mensajería
- inbox
- chat básico vinculado a reserva

### 10. Reviews
- dejar review textual básico
- rating

### 11. Soporte
- crear caso
- adjuntar contexto
- flujo básico de seguimiento

### 12. Proveedores
- crear organización
- perfil público
- servicios
- disponibilidad
- documentos de aprobación
- dashboard básico
- aceptación/rechazo de solicitudes

### 13. Administración de plataforma
- dashboard básico
- revisión y aprobación de proveedores
- auditoría mínima
- soporte básico

---

## Qué NO entra en MVP

### Clínica digital
No entra en MVP:
- agenda clínica avanzada
- formularios preconsulta
- SOAP
- billing clínica
- recetas
- refill

### Ejecución avanzada del servicio
No entra en MVP:
- check-in/check-out geolocalizado
- GPS tracking
- report card
- evidencias avanzadas
- propinas

### Comercio
No entra en MVP:
- catálogo de tienda
- carrito
- checkout de productos
- pedidos
- tracking logístico

### Finanzas del dueño
No entra en MVP:
- dashboard de gastos
- presupuestos
- categorías avanzadas
- exportación

### Beneficios
No entra en MVP:
- rewards avanzados
- memberships
- cashback
- puntos complejos

### Telecare
No entra en MVP:
- chat/videollamada médica
- disponibilidad telecare
- resumen de teleconsulta

### Farmacia avanzada
No entra en MVP:
- checkout farmacéutico regulado
- validación avanzada de receta
- fulfillment farmacéutico

### Provider ops avanzadas
No entra en MVP:
- staff
- sucursales
- CRM interno
- reportes avanzados
- payouts avanzados

---

## Principios de alcance del MVP

### 1. Resolver bien lo esencial
El MVP debe hacer pocas cosas, pero hacerlas bien:
- alta de usuarios,
- alta de mascotas,
- descubrimiento,
- reserva,
- pago,
- comunicación,
- confianza inicial.

### 2. No mezclar verticales complejas
Clínica, telecare, farmacia y commerce se dejan para etapas posteriores.

### 3. Mantener el modelo de datos preparado para crecer
Aunque algunas tablas se implementen luego, el diseño inicial debe evitar rehacer el núcleo.

### 4. Priorización de valor
Se privilegia:
- conversión de usuario a reserva,
- onboarding de proveedores,
- pagos,
- trazabilidad,
- soporte básico.

---

## Criterios de salida del MVP

El MVP estará listo cuando se pueda demostrar este flujo extremo a extremo:

1. un usuario crea cuenta;
2. crea hogar;
3. registra una mascota;
4. carga al menos un documento o vacuna;
5. busca un proveedor;
6. selecciona un servicio;
7. reserva;
8. paga;
9. chatea con el proveedor;
10. la reserva queda completada;
11. deja una reseña;
12. puede abrir soporte si algo falla.

Y del lado proveedor:

1. crea perfil;
2. configura servicio y disponibilidad;
3. carga documentos;
4. queda aprobado por plataforma;
5. recibe solicitud;
6. la acepta;
7. se comunica con el cliente;
8. ve el booking en su dashboard.

Y del lado admin:

1. ve proveedores pendientes;
2. revisa documentos;
3. aprueba o rechaza;
4. ve bookings básicos;
5. consulta soporte básico.

---

## Dependencias mínimas del MVP

### Datos
- usuarios
- roles
- hogares
- mascotas
- documentos
- vacunas
- alergias
- condiciones
- reminders
- organizaciones proveedoras
- servicios proveedor
- disponibilidad
- bookings
- pricing
- pagos
- chats
- reviews
- soporte
- auditoría

### Infraestructura
- auth
- db
- storage
- notifications
- payment gateway

### Apps
- mobile
- admin
- provider-facing base

---

## Regla para Codex y desarrollo
Si una tarea no está claramente dentro de este archivo, debe asumirse fuera del MVP.
No debe implementarse sin actualización explícita de alcance.