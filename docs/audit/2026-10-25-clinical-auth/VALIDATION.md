# Acceso profesional desde QR - 2026-10-25

Cambio local: acciones visibles Iniciar sesion/Crear cuenta, retorno al mismo QR
desde /app tras autenticacion/verificacion, cuenta conectada y cambio de cuenta,
enlace desde archivos bloqueados al panel profesional. Se reutilizan formularios
Core y sus validaciones; no hay consulta de existencia de correo ni auth duplicada.
El retorno solo admite token hexadecimal de 64 caracteres; no URLs arbitrarias.

Validacion: build Next web PASS (incluye lint/tipos); typecheck y lint standalone
PASS. 13 casos Chrome con componentes React reales y APIs simuladas PASS:
entrada anonima, pantalla estrecha, registro/login y retorno, cuenta actual,
logout, permisos aun necesarios, rechazo de redirecciones externas y sin errores.
Regresion del visor PDF: 16 casos PASS (documentos, expiracion, revocacion/logout).
No se creo cuenta productiva ni se probo OTP real, Safari/iPhone o Android fisico.

Sin cambios de RPC/RLS/Storage/mobile. Sin commit/push ni despliegue en este ajuste.
Publicar web requiere incluir ProfessionalIdentityPanel, SharedClinicalDocuments,
CoreExperienceScreen y el nuevo hook useClinicalAuthReturn. El script anterior
fija 75f3329 y no publica este ajuste sin actualizar su fuente y lista de archivos.
