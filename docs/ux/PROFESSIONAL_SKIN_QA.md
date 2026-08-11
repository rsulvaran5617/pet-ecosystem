# Professional Website Skin QA

## Estado

Fase: `VISUAL-BRAND-2 / SKIN-7`

Fecha de cierre tecnico: `2026-08-11`

Este documento consolida el cierre de QA visual responsive del skin profesional aplicado por slices:

- `SKIN-1`: landing publica.
- `SKIN-2`: centro de ayuda publico.
- `SKIN-3`: web owner.
- `SKIN-4`: web provider.
- `SKIN-5`: web foster.
- `SKIN-6`: admin web.

## Alcance del QA

El cierre valida que las superficies web compilan y conservan la separacion por rol sin tocar backend, Supabase, migraciones, RLS, pagos, mobile ni reglas de negocio.

Superficies cubiertas:

- `petecosyst.com/`
- `petecosyst.com/ayuda`
- `petecosyst.com/account-deletion`
- `petecosyst.com/app` con rol owner.
- `petecosyst.com/app` con rol provider.
- `petecosyst.com/foster`
- `admin.petecosyst.com`

## Validacion tecnica ejecutada

Comandos ejecutados en `2026-08-11`:

```powershell
corepack pnpm --filter @pet/web lint
corepack pnpm --filter @pet/web typecheck
corepack pnpm --filter @pet/web build
corepack pnpm --filter @pet/admin lint
corepack pnpm --filter @pet/admin typecheck
corepack pnpm --filter @pet/admin build
```

Resultado:

- `@pet/web lint`: PASS.
- `@pet/web typecheck`: PASS.
- `@pet/web build`: PASS.
- `@pet/admin lint`: PASS.
- `@pet/admin typecheck`: PASS.
- `@pet/admin build`: PASS.

Rutas generadas por build web:

- `/`
- `/account-deletion`
- `/adopciones/[slug]`
- `/app`
- `/ayuda`
- `/foster`

Ruta generada por build admin:

- `/`

## Checklist QA responsive manual

Validar manualmente en navegador antes de promover visualmente el skin a piloto amplio:

- Desktop ancho: `1440px`.
- Desktop estandar: `1280px`.
- Tablet: `768px`.
- Mobile web: `390px`.
- Mobile estrecho: `360px`.

Para cada viewport confirmar:

- No hay overflow horizontal accidental.
- Sidebar no tapa contenido.
- Header no se solapa con sidebar.
- Botones conservan altura y texto legible.
- Chips caben o pasan a nueva linea.
- Cards mantienen padding.
- Formularios no se montan.
- Graficos no cortan labels.
- Tablas/listas tienen scroll controlado si aplica.
- Empty states explican siguiente accion.
- Contenido publico no muestra material admin.
- Admin no es accesible sin rol.

## Matriz por superficie

| Superficie | Estado tecnico | QA visual manual | Observaciones |
| --- | --- | --- | --- |
| Landing publica | PASS | Pendiente | Revisar hero, CTAs, bloque protectoras, footer y nav responsive. |
| Centro de ayuda | PASS | Pendiente | Confirmar que no muestra contenido admin/soporte interno. |
| Owner web | PASS | Pendiente | Revisar Panel, Hogar, Mascotas, Salud, Buscar y Reservas en desktop/tablet/mobile. |
| Provider web | PASS | Pendiente | Revisar dashboard, sidebar, topbar, reservas, agenda/capacidad y graficos. |
| Foster web | PASS | Pendiente | Revisar Panel, Perfil, Mascotas, Publicaciones, Solicitudes y Transferencias. |
| Admin web | PASS | Pendiente | Revisar Inicio, Proveedores, Familias protectoras, Soporte y Manual admin. |

## Pendientes no bloqueantes

- Capturas reales de QA por viewport para documentar antes/despues.
- Revision visual autenticada con usuarios reales o QA por rol.
- Ajuste fino posterior de colas internas admin si se observan tablas o detalles demasiado densos.
- Ajuste fino posterior de graficos provider si algun label queda cortado con datos reales extremos.
- Normalizacion futura de tokens compartidos si se decide reducir estilos inline.

## Criterio de cierre SKIN-7

SKIN-7 queda tecnicamente cerrado cuando:

- Web publica, owner, provider y foster compilan.
- Admin web compila.
- No hay errores de lint/typecheck.
- `git diff --check` no reporta errores.
- Queda documentado que la revision visual por capturas es el siguiente paso manual, no una migracion ni un cambio funcional.

## Restricciones preservadas

- No se tocaron reglas de negocio.
- No se tocaron contratos API.
- No se tocaron migraciones.
- No se toco Supabase.
- No se tocaron RLS.
- No se tocaron pagos.
- No se toco mobile.
- No se mezclo contenido admin en el centro de ayuda publico.
