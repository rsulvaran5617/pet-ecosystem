# Profesionales admin: jerarquia visual

Cambio local del 2026-10-27. Nombre, estado, vigencia y siguiente accion visibles en el detalle. Lista compacta; auditoria cerrada inicialmente; suspension a demanda; formulario de verificacion solo para pendientes. Sin cambios de API, permisos, datos o mobile.

Validacion: typecheck y lint admin PASS; build Next.js PASS. Chrome con componente React y CSS reales, APIs simuladas: 11 comprobaciones PASS (results.json). Capturas desktop.png y narrow.png. La conversion de fecha conserva fin de dia de Panama. No se ejecutaron decisiones en produccion ni se publico esta version. La prueba comprueba jerarquia y comportamiento; no es un estudio cronometrado con usuarios ni una prueba del shell admin completo.

## Profesionales admin publicados - 2026-10-27

Fuente 61d650036ca946f4dfec31dadf3f3af96c5fbf79; admin /var/www/pet-releases/professional-presentation-admin-61d6500-1793129978, build iNYkWuk6Gx-VfbkwX2IJZ.
Estado y vigencia destacados, lista compacta, revision contextual y auditoria en acordeon.
Rollback: /var/www/pet-releases/clinical-renewal-admin-71dc8b9-1793064272. Build/candidata/HTTPS/manifest y sesion QA admin real verificados; PM2 guardado.
Sin migraciones ni cambios mobile. Evidencia: docs/audit/2026-10-27-admin-professionals/.
Script: scripts/update-professional-presentation-admin.ps1.

Verificacion publicada: navegacion de solo lectura con sesion QA real; no se enviaron decisiones.
