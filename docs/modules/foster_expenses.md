# Foster Expenses / Gastos de acogida

## Resumen

`FOSTER-EXPENSES-1` agrega un registro privado de gastos asociados a mascotas bajo cuidado de una Familia Protectora. El objetivo es documentar el esfuerzo operativo de acogida: alimento, veterinaria, medicamentos, vacunacion, transporte, higiene, documentacion, emergencias y otros gastos.

Este modulo no procesa pagos, no calcula impuestos, no reemplaza contabilidad formal y no hace obligatorias donaciones para adoptar. Su valor es documental: ordena evidencia para seguimiento interno, transparencia y futuras solicitudes de apoyo.

## Alcance

- Registrar gastos por mascota bajo acogida.
- Consultar total acumulado, total del mes y cantidad de registros.
- Clasificar por categoria.
- Editar o eliminar registros cargados por error.
- Vincular opcionalmente un comprobante ya cargado en `pet_documents`.
- Mantener toda la informacion como privada del hogar protector.

## Modelo funcional

La entidad propuesta es `foster_pet_expenses`.

Campos principales:

- `pet_id`: mascota bajo acogida.
- `protective_household_id`: hogar protector responsable.
- `expense_date`: fecha real del gasto.
- `category`: categoria operativa.
- `title`: titulo legible.
- `description`: detalle opcional.
- `amount` y `currency`: monto documentado.
- `vendor_name`: proveedor/comercio opcional.
- `payment_method`: metodo declarado opcional.
- `receipt_document_id`: comprobante privado opcional en `pet_documents`.
- `is_reimbursed` y `reimbursement_note`: control interno de apoyo recibido.

Categorias iniciales:

- alimento
- veterinaria
- medicamentos
- vacunacion
- desparasitacion
- esterilizacion
- transporte
- higiene
- accesorios
- documentacion
- emergencia
- otro

## Seguridad y privacidad

- Los gastos no se muestran en `/adopciones/[slug]`.
- Los gastos no se muestran en cards publicas de adopcion.
- Los comprobantes siguen en bucket privado mediante `pet_documents`.
- Solo miembros autorizados del hogar protector pueden verlos.
- Solo miembros con permisos de edicion/admin pueden crearlos, editarlos o eliminarlos.
- Admin puede consultarlos solo bajo soporte/auditoria futura.

## UX Web Foster

En `Mascotas bajo acogida`, dentro del acordeon de cada mascota, se agrega `Gastos de acogida`:

- total documentado;
- total del mes actual;
- cantidad de registros;
- desglose compacto por categoria;
- lista de gastos;
- formulario `+ Gasto`;
- selector de comprobante privado existente.

## UX Mobile Foster

En la ficha de mascota bajo acogida se agrega la pestana `Gastos`, visible solo para hogares protectores:

- resumen total / mes actual;
- formulario compacto;
- lista de gastos;
- acciones editar y eliminar.

## Fuera de alcance

- Procesamiento de pagos.
- Reembolsos automaticos.
- Integraciones bancarias, Yappy, PayPal, Stripe o wallets.
- Publicacion de gastos detallados al adoptante.
- Reportes fiscales o promesas de deducibilidad.

## Criterios de aceptacion

- Una Familia Protectora aprobada puede registrar gastos para una mascota bajo acogida.
- Puede editar o eliminar un gasto cargado por error.
- Puede vincular un comprobante privado existente.
- Los gastos no aparecen en el perfil publico de adopcion.
- Owner/provider no ven estos gastos por defecto.
- Mobile y web muestran empty state cuando no hay gastos.
