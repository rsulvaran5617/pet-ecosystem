# Pet Ecosystem

## Descripción general
Pet Ecosystem es una plataforma integral para el negocio de mascotas, diseñada como un ecosistema compuesto por:

1. una super app para dueños de mascotas,
2. una suite SaaS para proveedores por rol,
3. una capa marketplace/orquestadora que conecta usuarios, servicios, pagos, historial y operación.

El objetivo es unificar en una sola plataforma:
- cuidado de mascotas,
- expediente y salud,
- agenda y recordatorios,
- clínicas veterinarias,
- paseadores y cuidadores,
- grooming, daycare y boarding,
- tiendas y farmacia,
- seguimiento de gastos,
- beneficios y memberships,
- telecare,
- administración de proveedores y soporte.

---

## Objetivos del producto

### Para el dueño de mascota
Permitir:
- registrar mascotas,
- administrar expediente,
- llevar vacunas y recordatorios,
- reservar servicios,
- comprar productos,
- pedir farmacia,
- controlar gastos,
- acceder a telecare,
- centralizar toda la información relevante de su mascota.

### Para los proveedores
Permitir:
- operar su negocio,
- publicar servicios,
- recibir reservas,
- gestionar clientes y mascotas,
- cobrar digitalmente,
- generar recurrencia,
- administrar sucursales y staff,
- usar la plataforma como canal de venta y operación.

### Para la plataforma
Permitir:
- onboarding y aprobación de proveedores,
- orquestación de transacciones,
- pagos y comisiones,
- reputación y soporte,
- reglas de visibilidad y seguridad,
- crecimiento por etapas MVP, V2 y V3.

---

## Estructura del repositorio

```text
apps/
  mobile/   -> app del dueño y proveedores en experiencia móvil
  web/      -> web pública y/o experiencia complementaria
  admin/    -> panel administrativo de plataforma y backoffice

packages/
  types/    -> tipos compartidos del dominio
  ui/       -> componentes UI reutilizables
  api-client/ -> clientes tipados para consumo de API/Supabase
  config/   -> configuración compartida

supabase/
  migrations/ -> migraciones SQL
  seed/       -> datos semilla
  functions/  -> edge functions si se necesitan

docs/
  vision/       -> visión, blueprint y alcance global
  architecture/ -> arquitectura y dominios
  product/      -> backlog, épicas y releases
  data/         -> modelo de datos y reglas RLS
  api/          -> contrato API
  ux/           -> flujos y pantallas
  modules/      -> especificación por módulo
  delivery/     -> alcance por release