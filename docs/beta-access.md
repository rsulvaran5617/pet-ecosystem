# Acceso beta publico

## Objetivo

`/beta` es el punto unico de entrada para participantes invitados a la beta controlada de Pet Ecosystem. La pagina permite elegir Android, iPhone o Web desde un enlace o codigo QR, sin crear cuentas ni almacenar datos adicionales.

## Variables de ambiente

Configurar en el entorno de `apps/web`:

```env
NEXT_PUBLIC_ANDROID_BETA_URL=https://...
NEXT_PUBLIC_IOS_TESTFLIGHT_URL=https://testflight.apple.com/join/...
NEXT_PUBLIC_WEB_APP_URL=https://petecosyst.com/app
NEXT_PUBLIC_BETA_SUPPORT_EMAIL=soporte@ejemplo.com
```

Para la Gota, mantener estos valores publicos en `apps/web/.env.production.local`. El script `scripts/deploy-droplet.ps1` los combina con las credenciales Supabase locales y escribe el `.env.production` remoto sin imprimir valores.

- Los destinos deben usar `https://` o `http://`. Cualquier otro protocolo se considera no configurado.
- Si falta un destino, su opcion aparece como `Proximamente` y la ruta directa regresa a `/beta` con un aviso.
- El correo de soporte es opcional.
- No incluir tokens, contrasenas ni secretos en variables `NEXT_PUBLIC_*`.

## Rutas

- `/beta`: selector mobile-first de plataforma.
- `/beta/android`: redireccion al acceso configurado de Firebase App Distribution.
- `/beta/ios`: redireccion al enlace configurado de TestFlight.
- `/beta/web`: redireccion a la aplicacion web.

Ejemplo para un QR de evento:

```text
https://petecosyst.com/beta?source=evento_mascotas_2026
```

Las rutas conservan `source` y los parametros UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`). Si el destino ya contiene parametros, se agregan sin romper su URL.

## Publicacion

1. Configurar las variables en el ambiente de despliegue.
2. Reconstruir y desplegar `apps/web`.
3. Probar `/beta` desde un telefono fuera de la red de desarrollo.
4. Probar cada destino y confirmar acceso autorizado para los testers.
5. Generar el QR hacia `/beta` con el `source` de la campana correspondiente.

La pagina es acceso beta, no registro publico ni canal de produccion comercial.

## Estado de petecosyst.com

- URL canonica de entrada: `https://petecosyst.com/beta`.
- Web: `https://petecosyst.com/app`.
- Android: release privado de Firebase App Distribution; cada tester debe estar autorizado en Firebase.
- iPhone: permanece como `Proximamente` hasta configurar un enlace publico o de grupo con formato `https://testflight.apple.com/join/...`.
