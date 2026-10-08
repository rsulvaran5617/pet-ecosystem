# Corrección de enlace Android — 2026-10-07 Panamá

Usuario autorizó resolver el pendiente 1: actualizar el destino Android de la web.
Consulta autenticada de Firebase confirmó última release `4vkg63dqtpkc8`, del
21/09, frente al enlace servido `1c16tgdrdjmb0`, del 19/09. Ambas muestran la
numeración heredada 0.0.0 (1); se identificaron por release y fecha.

Se copió la web activa a un release aislado y se cambió exclusivamente
NEXT_PUBLIC_ANDROID_BETA_URL. Se preservaron los demás valores, incluida Site Key,
y el código de PET ALERT. Configuración local .env.production.local sincronizada;
ese archivo privado no se incorpora a Git.

- Build, lint y tipos PASS; siete rutas candidatas HTTP 200.
- Redirección Android 307 exacta verificada antes y después de activar.
- HTML local/HTTPS coincide con candidata; clave pública CAPTCHA presente.
- Web: `/var/www/pet-releases/android-link-20261007`.
- Build: `fhFOiz_mPqCerxnC3otiM`.
- Activación: 2026-10-08T00:24:56.330Z (07/10 en Panamá).
- Rollback: `/var/www/pet-releases/external-submit-20261007`.
- Admin intacto, PM2 guardado, candidata temporal retirada.
- Sin APK nuevo, distribución a testers, cambios iOS, SQL, Edge o flags SOS.

Evidencia: firebase-check.json, activation.json y public-check.json.
No se verificó instalación en un teléfono. Firebase sigue requiriendo acceso
del tester. Bloqueo Apple por acuerdos pendientes es un asunto separado.
