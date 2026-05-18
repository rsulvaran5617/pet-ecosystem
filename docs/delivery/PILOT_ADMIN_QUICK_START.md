# PILOT_ADMIN_QUICK_START.md

## Guia rapida para admin

Esta guia resume las acciones del operador interno durante el piloto controlado.

## 1. Acceder al admin web

1. Abrir el enlace interno del admin web.
2. Iniciar sesion con usuario admin.
3. Confirmar que se ve el panel admin.

Para levantar localmente:

```powershell
cd "c:\Users\Ramon Sulvaran\pet-ecosystem"
corepack pnpm --filter @pet/admin dev
```

Puerto esperado:

```text
http://localhost:3001
```

## 2. Revisar proveedores pendientes

1. Entrar a `Proveedores`.
2. Revisar la lista de pendientes.
3. Abrir cada proveedor piloto.
4. Confirmar:
   - nombre del negocio;
   - perfil publico;
   - servicios activos/publicos;
   - disponibilidad/horarios;
   - documentos;
   - ubicacion publica.

## 3. Aprobar proveedor

1. Si el proveedor esta listo, tocar `Aprobar proveedor`.
2. Confirmar que desaparece de la cola pendiente.
3. Pedir al owner asignado que lo busque en marketplace.
4. Registrar resultado en la matriz del piloto.

## 4. Revisar soporte

1. Entrar a `Soporte`.
2. Revisar casos abiertos.
3. Abrir detalle del caso.
4. Cambiar estado si aplica.
5. Agregar nota operativa si corresponde.

## 5. Validar marketplace

Despues de aprobar cada proveedor:

1. Entrar a la app mobile como owner.
2. Abrir `Buscar`.
3. Buscar proveedor aprobado.
4. Confirmar que aparece con servicio activo.
5. Confirmar que el provider puede recibir reserva.

## 6. Checklist de seguimiento

| Item | Estado | Observaciones |
| --- | --- | --- |
| PROV-01 registrado | TBD |  |
| PROV-01 aprobado | TBD |  |
| PROV-01 visible en marketplace | TBD |  |
| OWN-01 registrado | TBD |  |
| Reserva PROV-01/OWN-01 completada | TBD |  |
| PROV-02 registrado | TBD |  |
| PROV-02 aprobado | TBD |  |
| PROV-02 visible en marketplace | TBD |  |
| OWN-02 registrado | TBD |  |
| Reserva PROV-02/OWN-02 completada | TBD |  |
| PROV-03 registrado | TBD |  |
| PROV-03 aprobado | TBD |  |
| PROV-03 visible en marketplace | TBD |  |
| OWN-03 registrado | TBD |  |
| Reserva PROV-03/OWN-03 completada | TBD |  |
| Casos de soporte revisados | TBD |  |

## 7. Reporte de incidencias

Formato recomendado:

```text
Codigo: [PROV-01 / OWN-01 / ADM-01]
Rol:
Paso:
Resultado esperado:
Resultado real:
PASS/FAIL/BLOCK:
Evidencia:
Observaciones:
```
