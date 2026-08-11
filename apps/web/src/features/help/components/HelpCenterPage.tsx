import type { CSSProperties, ReactNode } from "react";

const brandLogoPath = "/brand/pet-ecosystem-logo-mark.png";

type StatusTone = "available" | "pilot" | "soon";

type Guide = {
  title: string;
  platform: string;
  status: StatusTone;
  objective: string;
  before: string[];
  steps: string[];
  expected: string;
  commonErrors: string[];
  privacy: string;
};

type GuideGroup = {
  id: string;
  role: string;
  description: string;
  icon: string;
  status: StatusTone;
  guides: Guide[];
};

const statusLabels: Record<StatusTone, string> = {
  available: "Disponible",
  pilot: "Piloto",
  soon: "Proximamente"
};

const guideGroups: GuideGroup[] = [
  {
    id: "owner",
    role: "Propietarios de mascotas",
    description: "Gestiona hogar, mascotas, salud, recordatorios, busqueda de servicios, reservas y cuenta.",
    icon: "PM",
    status: "pilot",
    guides: [
      {
        title: "Crear cuenta e iniciar sesion",
        platform: "Mobile y web",
        status: "available",
        objective: "Entrar al ecosistema con un perfil de propietario y mantener acceso seguro.",
        before: ["Ten un correo activo.", "Define una contrasena que recuerdes.", "Confirma tu correo si la app solicita OTP."],
        steps: [
          "Abre Pet Ecosystem y selecciona Crear cuenta.",
          "Completa correo, contrasena, nombre y rol Propietario de mascota.",
          "Si ya tienes cuenta, cambia a Iniciar sesion.",
          "Si olvidaste la contrasena, usa No recuerdas contrasena para solicitar recuperacion."
        ],
        expected: "La app muestra tu vista de propietario y las secciones de hogar, mascotas, buscar, reservas y cuenta.",
        commonErrors: ["Correo ya registrado.", "Codigo OTP vencido.", "Contrasena incorrecta o cuenta no verificada."],
        privacy: "El correo identifica tu cuenta. No compartas codigos OTP ni enlaces de recuperacion."
      },
      {
        title: "Crear hogar y registrar mascotas",
        platform: "Mobile y web owner",
        status: "available",
        objective: "Organizar las mascotas dentro de un hogar para poder usar salud, documentos, recordatorios y reservas.",
        before: ["Debes tener sesion iniciada.", "El hogar debe representar tu entorno familiar o de cuidado."],
        steps: [
          "Entra en Hogar y usa Crear nuevo hogar si aun no existe uno.",
          "Ve a Mascotas y presiona Agregar mascota.",
          "Completa nombre, especie, raza si aplica, sexo, fecha aproximada y notas.",
          "Agrega foto desde galeria o camara en mobile cuando quieras identificarla mejor."
        ],
        expected: "La mascota queda visible en tu carrusel o lista y puede seleccionarse como mascota activa.",
        commonErrors: ["Nombre vacio.", "No seleccionar hogar activo.", "Intentar reservar con una mascota en memoria."],
        privacy: "Las mascotas privadas no aparecen publicamente ni en adopciones."
      },
      {
        title: "Documentos, salud y recordatorios",
        platform: "Mobile y web owner",
        status: "available",
        objective: "Mantener una ficha basica de cuidado con vacunas, alergias, condiciones, documentos y alertas.",
        before: ["Selecciona la mascota correcta.", "Ten a mano certificados, carnet o fotos si vas a cargar documentos."],
        steps: [
          "Abre Mascotas o Salud y selecciona la mascota.",
          "Registra vacunas, alergias o condiciones desde el boton de agregar de cada ficha.",
          "Carga documentos relevantes desde Docs o la ficha de mascota.",
          "Crea recordatorios con fecha y hora opcional para controles o vencimientos."
        ],
        expected: "La ficha resume estado de vacunas, alergias, condiciones, documentos y proximos recordatorios.",
        commonErrors: ["Fechas incompletas.", "Documento sin titulo.", "Permiso de notificaciones no concedido para alertas locales."],
        privacy: "La informacion de salud es de cuidado y organizacion; no sustituye diagnostico veterinario."
      },
      {
        title: "Buscar servicios y crear reserva",
        platform: "Mobile y web owner",
        status: "pilot",
        objective: "Encontrar proveedores aprobados y preparar una reserva sin perder el contexto de hogar y mascota.",
        before: ["Debes tener al menos una mascota.", "Selecciona la mascota activa antes de reservar."],
        steps: [
          "Entra en Buscar.",
          "Filtra por servicio, ciudad, especie o chips rapidos.",
          "Abre Ver proveedor y selecciona un servicio disponible.",
          "Revisa horarios/cupos publicados y genera la vista previa.",
          "Confirma la reserva cuando la informacion sea correcta."
        ],
        expected: "La reserva queda pendiente de aprobacion o confirmada segun el servicio y puede verse en Reservas.",
        commonErrors: ["No hay cupos para la fecha.", "Servicio requiere aprobacion del proveedor.", "Mascota u hogar no seleccionados."],
        privacy: "El proveedor ve solo la informacion necesaria para atender la reserva."
      },
      {
        title: "Mensajes, reservas y eliminacion de cuenta",
        platform: "Mobile owner",
        status: "pilot",
        objective: "Dar seguimiento a reservas, conversar con proveedores y ejercer control sobre la cuenta.",
        before: ["La mensajeria se vincula a reservas.", "La eliminacion de cuenta es irreversible para el acceso."],
        steps: [
          "Abre Reservas para ver activas, historial y detalle.",
          "Usa Mensajes cuando exista una conversacion vinculada a una reserva.",
          "Consulta cambios de estado; la app actualiza reservas y mensajes con Realtime cuando esta disponible.",
          "En Cuenta, usa Eliminar cuenta si deseas solicitar baja y anonimizar datos personales."
        ],
        expected: "Puedes ver estados recientes, responder conversaciones activas y solicitar baja desde Cuenta.",
        commonErrors: ["Conversacion no creada aun.", "Conexion intermitente.", "Intentar eliminar cuenta sin confirmar la palabra requerida."],
        privacy: "La baja anonimiza datos personales y conserva historial transaccional necesario para operacion, soporte y auditoria."
      }
    ]
  },
  {
    id: "provider",
    role: "Proveedores de servicios",
    description: "Opera negocios, servicios, agenda, cupos, reservas, conversaciones, publicacion y documentos.",
    icon: "PV",
    status: "pilot",
    guides: [
      {
        title: "Entrar a la consola proveedor",
        platform: "Web provider",
        status: "available",
        objective: "Ver una consola multinegocio con resumen, indicadores y navegacion operativa.",
        before: ["Tu usuario debe tener rol provider.", "Al menos un negocio debe existir o debes crearlo."],
        steps: [
          "Inicia sesion en la web.",
          "Selecciona el negocio activo en la cabecera.",
          "Usa el menu lateral para entrar solo a Panel, Negocios, Servicios, Reservas, Agenda, Publicacion o Documentos.",
          "Presiona Actualizar si necesitas recargar datos del piloto."
        ],
        expected: "Cada seleccion del menu muestra solo el slice correspondiente para reducir ruido visual.",
        commonErrors: ["Rol activo incorrecto.", "Negocio pendiente de aprobacion.", "Datos vacios si el negocio aun no tiene servicios o reservas."],
        privacy: "La consola no debe mostrar UUIDs, campos tecnicos ni informacion privada fuera del negocio."
      },
      {
        title: "Configurar negocio y perfil publico",
        platform: "Web provider",
        status: "available",
        objective: "Completar datos maestros, ubicacion publica, documentos de aprobacion y presentacion visible.",
        before: ["Ten nombre, ciudad, pais y documentos requeridos.", "Define si permitiras publicacion al aprobarse."],
        steps: [
          "Entra en Negocios y presiona el lapiz o Editar.",
          "Actualiza datos maestros, identificador publico, ciudad y pais.",
          "Carga documentos desde la misma ficha del negocio.",
          "En Publicacion, revisa el checklist de visibilidad, busqueda, perfil, servicios, agenda y documentos."
        ],
        expected: "El negocio queda listo para revision o visible cuando cumple condiciones y aprobacion.",
        commonErrors: ["Documento faltante.", "Perfil publico incompleto.", "Ubicacion publica no configurada."],
        privacy: "Solo la ubicacion publica declarada se usa para marketplace; no se pide GPS del navegador."
      },
      {
        title: "Crear y mantener servicios",
        platform: "Web provider",
        status: "available",
        objective: "Definir oferta, precio, duracion y modo de reserva de cada servicio.",
        before: ["Selecciona el negocio correcto.", "Ten claro precio, duracion y si requiere aprobacion."],
        steps: [
          "Abre Servicios.",
          "Usa Nuevo servicio para crear una oferta.",
          "Edita nombre, categoria, duracion, precio y visibilidad.",
          "Elimina un servicio solo cuando no tenga reservas ni historia asociada."
        ],
        expected: "Los servicios activos alimentan marketplace, agenda y reservas.",
        commonErrors: ["Intentar borrar un servicio con historia.", "Precio o duracion incompletos.", "Servicio oculto no aparece en marketplace."],
        privacy: "La eliminacion esta limitada para proteger trazabilidad historica."
      },
      {
        title: "Agenda, horarios y cupos",
        platform: "Web provider",
        status: "available",
        objective: "Publicar franjas de atencion con cupos validos por servicio.",
        before: ["Debe existir al menos un servicio.", "Los cupos no pueden ser negativos."],
        steps: [
          "Entra en Agenda.",
          "Selecciona el servicio.",
          "Crea franjas con dia, inicio, fin y cupos disponibles.",
          "Revisa el calendario compacto y las reglas publicadas.",
          "Edita o pausa franjas cuando cambie tu operacion."
        ],
        expected: "Los owners ven cupos y horarios disponibles al preparar reservas.",
        commonErrors: ["Hora final anterior a la inicial.", "Cupos en cero.", "Servicio equivocado seleccionado."],
        privacy: "La disponibilidad publicada es operativa; no expone agendas privadas no configuradas."
      },
      {
        title: "Reservas entrantes y conversaciones",
        platform: "Web provider",
        status: "pilot",
        objective: "Atender solicitudes, filtrar estados y conversar con el owner cuando una reserva lo requiere.",
        before: ["Debe haber reservas para el negocio activo.", "La conversacion se vincula a la reserva."],
        steps: [
          "Abre Reservas.",
          "El filtro inicia en Citas pendientes por aprobar.",
          "Cambia entre Confirmadas, Completadas o Canceladas si necesitas revisar otro estado.",
          "Usa Ver detalle para revisar contexto y acciones.",
          "Usa Chatear o la seccion Conversaciones activas para solicitar informacion o explicar una decision."
        ],
        expected: "El proveedor puede responder solicitudes y mantener trazabilidad de la comunicacion.",
        commonErrors: ["Reserva no pertenece al negocio activo.", "No hay conversacion creada aun.", "Conexion Realtime intermitente."],
        privacy: "El chat queda asociado a una reserva y no debe usarse para exponer datos sensibles fuera de la plataforma."
      }
    ]
  },
  {
    id: "foster",
    role: "Familias protectoras",
    description: "Gestiona hogares protectores, mascotas bajo acogida, publicaciones, solicitudes, donaciones informativas y transferencias.",
    icon: "FP",
    status: "pilot",
    guides: [
      {
        title: "Solicitar familia protectora",
        platform: "Mobile y web foster",
        status: "available",
        objective: "Crear una identidad protectora separada del hogar familiar para operar adopciones responsables.",
        before: ["Tu cuenta debe tener rol de familia protectora.", "La organizacion debe ser aprobada antes de publicar."],
        steps: [
          "Entra en la consola Foster o en el rol Familia protectora.",
          "Crea o selecciona una familia protectora.",
          "Completa nombre, ciudad, enfoque y datos de revision.",
          "Espera la revision admin para habilitar operacion completa."
        ],
        expected: "La familia queda en borrador, revision, aprobada o rechazada segun el flujo admin.",
        commonErrors: ["Usar un hogar familiar en vez de protector.", "Perfil incompleto.", "Intentar publicar sin aprobacion."],
        privacy: "La direccion exacta y documentos privados no se publican."
      },
      {
        title: "Perfil publico y apoyo opcional",
        platform: "Mobile y web foster",
        status: "available",
        objective: "Presentar la identidad publica de la familia y declarar informacion opcional de apoyo.",
        before: ["Ten logo, mision, historia y contacto publico permitido.", "La donacion no debe ser condicion para adoptar."],
        steps: [
          "Abre Perfil publico.",
          "Completa nombre publico, mision, ciudad, historia y logo.",
          "Agrega redes o bloque Apoya a esta Familia Protectora si aplica.",
          "Guarda cambios; si el perfil estaba aprobado vuelve a borrador y requiere nueva revision."
        ],
        expected: "La informacion se muestra solo cuando el perfil este aprobado y publico.",
        commonErrors: ["URL externa sin https.", "Texto fiscal no validado.", "Editar perfil aprobado y esperar que siga publico automaticamente."],
        privacy: "Pet Ecosystem no procesa ni valida donaciones; la informacion es declarada por la familia."
      },
      {
        title: "Registrar mascota en acogida",
        platform: "Mobile y web foster",
        status: "available",
        objective: "Crear una ficha ordenada para mascotas bajo custodia temporal.",
        before: ["Selecciona familia protectora aprobada.", "Ten foto, datos basicos y notas de rescate si existen."],
        steps: [
          "Abre Acogida o Mascotas.",
          "Presiona Agregar mascota.",
          "Completa nombre, especie, edad aproximada, sexo, estado y notas.",
          "Carga documentos, salud, vacunas y recordatorios desde la ficha."
        ],
        expected: "La mascota queda asociada a la familia protectora y puede prepararse para adopcion.",
        commonErrors: ["Confundir mascota propia con mascota en acogida.", "Falta de foto o historia publica.", "Datos sensibles en notas publicas."],
        privacy: "El expediente privado no se publica completo; solo se muestra informacion apta para adopcion."
      },
      {
        title: "Publicar adopcion responsable",
        platform: "Mobile y web foster",
        status: "pilot",
        objective: "Crear una ficha publica para una mascota que busca hogar sin convertir adopcion en venta.",
        before: ["La familia debe estar aprobada.", "La mascota debe tener contenido publico responsable."],
        steps: [
          "Abre Publicaciones o la ficha de la mascota.",
          "Completa historia, personalidad, salud publica, compatibilidad y requisitos.",
          "Agrega fotos aprobables y confirma responsabilidad de publicacion.",
          "Publica cuando la informacion sea adecuada y revisa solicitudes entrantes."
        ],
        expected: "La mascota aparece en el discovery de adopciones si la publicacion queda visible.",
        commonErrors: ["Fotos pendientes de moderacion.", "Publicacion pausada.", "No aceptar el criterio de responsabilidad."],
        privacy: "No compartas direcciones exactas, telefonos privados ni datos medicos sensibles."
      },
      {
        title: "Solicitudes y transferencia",
        platform: "Mobile y web foster",
        status: "pilot",
        objective: "Revisar solicitudes, cerrar decisiones y transferir custodia solo con consentimiento.",
        before: ["Debe existir una solicitud de adopcion.", "La aprobacion no mueve la mascota automaticamente."],
        steps: [
          "Abre Solicitudes.",
          "Revisa datos del interesado y mensajes.",
          "Aprueba, rechaza o deja en seguimiento con nota humana.",
          "Cuando corresponda, inicia transferencia privada.",
          "La mascota pasa al nuevo hogar solo cuando el adoptante acepta la transferencia."
        ],
        expected: "La adopcion queda trazada y la publicacion se cierra como adoptada cuando la transferencia termina.",
        commonErrors: ["Confundir aprobacion con transferencia.", "Falta documento de compromiso si fue requerido.", "Solicitud sin consentimiento final."],
        privacy: "Solo se transfiere el expediente permitido; informacion privada no autorizada queda protegida."
      }
    ]
  },
  {
    id: "adopter",
    role: "Adoptantes interesados",
    description: "Explora mascotas que buscan hogar, revisa perfiles publicos, solicita adopcion y sigue el estado.",
    icon: "AD",
    status: "pilot",
    guides: [
      {
        title: "Ver mascotas que buscan hogar",
        platform: "Mobile owner y web publica",
        status: "pilot",
        objective: "Conocer mascotas publicadas por familias protectoras aprobadas.",
        before: ["La adopcion esta separada del marketplace comercial de servicios.", "La informacion visible es publica y moderada."],
        steps: [
          "En mobile, abre Inicio y entra en Mascotas que buscan hogar.",
          "En web, abre una ficha publica de adopcion compartida.",
          "Revisa fotos, historia, personalidad, salud publica, compatibilidad y requisitos.",
          "Abre Ver perfil para conocer la familia protectora."
        ],
        expected: "Puedes evaluar si la mascota podria encajar con tu hogar antes de solicitar adopcion.",
        commonErrors: ["Publicacion retirada.", "Mascota ya adoptada.", "Fotos aun pendientes de moderacion."],
        privacy: "No se muestra direccion exacta de la familia protectora."
      },
      {
        title: "Solicitar adopcion",
        platform: "Mobile owner",
        status: "pilot",
        objective: "Enviar una solicitud estructurada a la familia protectora.",
        before: ["Debes tener cuenta y hogar.", "Lee requisitos y aviso de adopcion responsable."],
        steps: [
          "Abre la ficha de la mascota.",
          "Presiona Solicitar adopcion.",
          "Completa experiencia, vivienda, otras mascotas, ninos, motivo y disponibilidad.",
          "Acepta los terminos del proceso responsable y envia."
        ],
        expected: "La solicitud queda visible para ti y para la familia protectora.",
        commonErrors: ["Campos obligatorios vacios.", "Ya existe una solicitud activa.", "Mascota no disponible."],
        privacy: "Tus respuestas solo deben ser visibles para la familia protectora correspondiente y admin cuando aplique."
      },
      {
        title: "Donaciones informativas",
        platform: "Mobile owner y web publica",
        status: "pilot",
        objective: "Entender el bloque opcional de apoyo a una familia protectora.",
        before: ["Donar es opcional.", "Donar no garantiza aprobacion de adopcion."],
        steps: [
          "Abre Ver perfil de la familia protectora.",
          "Lee Apoya a esta Familia Protectora si esta disponible.",
          "Revisa metodos declarados por la organizacion.",
          "Valida por tu cuenta cualquier dato fiscal o externo antes de donar."
        ],
        expected: "El usuario entiende que Pet Ecosystem no procesa ni valida pagos o donaciones.",
        commonErrors: ["Interpretar donacion como requisito.", "Asumir validez fiscal sin confirmacion oficial.", "Usar canales fuera de plataforma sin validar."],
        privacy: "La informacion de apoyo es declarada por la familia; no compartas datos financieros dentro del chat."
      },
      {
        title: "Seguimiento y transferencia",
        platform: "Mobile owner",
        status: "pilot",
        objective: "Revisar el estado de solicitud y aceptar una transferencia privada cuando aplique.",
        before: ["La familia protectora debe aprobar y luego iniciar transferencia.", "Aceptar transferencia mueve la mascota a tu hogar."],
        steps: [
          "Abre Solicitudes para revisar estado.",
          "Lee notas de la familia protectora.",
          "Si recibes invitacion de transferencia, entra en Cuenta o Invitaciones de mascota.",
          "Acepta solo si entiendes que la mascota pasara a tu hogar."
        ],
        expected: "La mascota adoptada queda asociada a tu hogar con expediente permitido.",
        commonErrors: ["No revisar condiciones antes de aceptar.", "Solicitud rechazada o caducada.", "Transferencia cancelada por la familia."],
        privacy: "La transferencia debe conservar trazabilidad y consentimiento explicito."
      }
    ]
  }
];

const quickTopics = [
  { href: "#owner", label: "Duenos" },
  { href: "#provider", label: "Proveedores" },
  { href: "#foster", label: "Familias protectoras" },
  { href: "#adopter", label: "Adoptantes" },
  { href: "#privacidad", label: "Privacidad" }
];

const totalGuides = guideGroups.reduce((total, group) => total + group.guides.length, 0);
const totalPilotGuides = guideGroups.reduce(
  (total, group) => total + group.guides.filter((guide) => guide.status === "pilot").length,
  0
);

const helpStats = [
  { label: "Roles publicos", value: guideGroups.length.toString() },
  { label: "Guias disponibles", value: totalGuides.toString() },
  { label: "Flujos piloto", value: totalPilotGuides.toString() }
];

export function HelpCenterPage() {
  return (
    <main style={surfaceStyle}>
      <style>{`
        .help-shell {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
          padding: 28px 0 58px;
        }

        .help-nav {
          align-items: center;
          display: flex;
          gap: 16px;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .help-brand {
          align-items: center;
          color: #12313a;
          display: inline-flex;
          gap: 10px;
          text-decoration: none;
        }

        .help-brand img {
          background: #ffffff;
          border: 1px solid rgba(0,143,137,0.18);
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(15,23,42,0.08);
          height: 38px;
          object-fit: contain;
          padding: 5px;
          width: 38px;
        }

        .help-hero {
          background: #111827;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          box-shadow: 0 24px 70px rgba(15,23,42,0.16);
          color: #ffffff;
          display: grid;
          gap: 22px;
          overflow: hidden;
          padding: 34px;
          position: relative;
        }

        .help-hero::after {
          background: rgba(0, 143, 137, 0.2);
          border-radius: 999px;
          content: "";
          height: 260px;
          position: absolute;
          right: -80px;
          top: -90px;
          width: 260px;
        }

        .help-hero > * {
          position: relative;
          z-index: 1;
        }

        .help-hero h1 {
          font-size: 44px;
          line-height: 1.05;
          margin: 0;
          max-width: 820px;
        }

        .help-hero p {
          color: #e5ecea;
          font-size: 15px;
          line-height: 1.65;
          margin: 0;
          max-width: 760px;
        }

        .hero-content {
          display: grid;
          gap: 14px;
          max-width: 820px;
        }

        .hero-row {
          align-items: end;
          display: flex;
          gap: 20px;
          justify-content: space-between;
        }

        .help-stats {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          min-width: min(100%, 420px);
        }

        .help-stat {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px;
          display: grid;
          gap: 4px;
          padding: 13px;
        }

        .help-stat strong {
          color: #5eead4;
          font-size: 24px;
          line-height: 1;
        }

        .help-stat span {
          color: rgba(255,255,255,0.76);
          font-size: 11px;
          font-weight: 800;
        }

        .topic-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 18px 0 0;
        }

        .topic-grid a {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 850;
          padding: 9px 12px;
          text-decoration: none;
        }

        .topic-grid a:hover {
          background: rgba(255,255,255,0.18);
        }

        .role-overview {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          margin: 18px 0;
        }

        .guide-layout {
          display: grid;
          gap: 20px;
          grid-template-columns: 230px minmax(0, 1fr);
          margin-top: 22px;
        }

        .guide-sidebar {
          align-self: start;
          background: #111827;
          border-radius: 20px;
          display: grid;
          gap: 10px;
          padding: 16px;
          position: sticky;
          top: 18px;
        }

        .guide-sidebar strong {
          color: #ffffff;
          font-size: 13px;
          line-height: 1.25;
          margin-bottom: 2px;
        }

        .guide-sidebar a {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: #d7e2e1;
          font-size: 12px;
          font-weight: 850;
          padding: 10px 11px;
          text-decoration: none;
        }

        .guide-sidebar a:hover {
          background: #11494e;
          color: #ffffff;
        }

        .guide-stack {
          display: grid;
          gap: 20px;
        }

        .role-section {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(18,49,58,0.12);
          border-radius: 20px;
          box-shadow: 0 14px 40px rgba(15,23,42,0.07);
          display: grid;
          gap: 18px;
          padding: 22px;
        }

        .role-heading {
          align-items: start;
          display: flex;
          gap: 14px;
          justify-content: space-between;
        }

        .role-heading h2,
        .guide-card h3 {
          color: #0f2530;
          margin: 0;
        }

        .role-title {
          align-items: center;
          display: flex;
          gap: 12px;
        }

        .role-heading h2 {
          font-size: 24px;
          line-height: 1.15;
        }

        .role-heading p,
        .guide-card p,
        .guide-card li,
        .manual-note p {
          color: #52666d;
          font-size: 13px;
          line-height: 1.55;
        }

        .guide-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }

        .guide-card {
          background: #ffffff;
          border: 1px solid rgba(18,49,58,0.1);
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.04);
          display: grid;
          gap: 12px;
          padding: 16px;
        }

        .guide-card h3 {
          font-size: 17px;
          line-height: 1.18;
        }

        .guide-meta {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .guide-card h4 {
          color: #0f2530;
          font-size: 11px;
          letter-spacing: 0.08em;
          margin: 0 0 6px;
          text-transform: uppercase;
        }

        .guide-card ol,
        .guide-card ul {
          display: grid;
          gap: 6px;
          margin: 0;
          padding-left: 18px;
        }

        .manual-note {
          background: #fff8e8;
          border: 1px solid rgba(217,119,6,0.24);
          border-radius: 16px;
          padding: 18px;
        }

        .role-card {
          background: #ffffff;
          border: 1px solid rgba(18,49,58,0.12);
          border-radius: 18px;
          box-shadow: 0 10px 28px rgba(15,23,42,0.05);
          color: #12313a;
          display: grid;
          gap: 10px;
          padding: 16px;
          text-decoration: none;
        }

        .role-card:hover {
          border-color: rgba(0,143,137,0.32);
          box-shadow: 0 14px 34px rgba(15,23,42,0.08);
        }

        .role-card-header {
          align-items: center;
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }

        .role-icon {
          align-items: center;
          background: #e6f7f5;
          border-radius: 13px;
          color: #00847d;
          display: inline-flex;
          font-size: 12px;
          font-weight: 900;
          height: 40px;
          justify-content: center;
          width: 40px;
        }

        .role-card strong {
          color: #102f3a;
          font-size: 15px;
          line-height: 1.2;
        }

        .role-card span:not(.role-icon) {
          color: #52666d;
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 860px) {
          .help-nav,
          .role-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .help-hero {
            padding: 26px 20px;
          }

          .help-hero h1 {
            font-size: 32px;
          }

          .guide-layout {
            grid-template-columns: 1fr;
          }

          .guide-sidebar {
            position: static;
          }

          .hero-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .help-stats {
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .help-shell {
            width: min(100% - 24px, 1180px);
          }

          .help-hero h1 {
            font-size: 32px;
          }

          .help-stats,
          .guide-grid {
            grid-template-columns: 1fr;
          }

          .role-section {
            padding: 18px;
          }
        }
      `}</style>

      <div className="help-shell">
        <nav aria-label="Navegacion del centro de ayuda" className="help-nav">
          <a className="help-brand" href="/">
            <img alt="" src={brandLogoPath} />
            <strong>Pet Ecosystem</strong>
          </a>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a href="/" style={secondaryLinkStyle}>
              Inicio
            </a>
            <a href="/app" style={primaryLinkStyle}>
              Abrir app
            </a>
          </div>
        </nav>

        <header className="help-hero">
          <div className="hero-row">
            <div className="hero-content">
              <StatusChip status="pilot" />
              <h1>Centro de ayuda y manual de usuario</h1>
              <p>
                Guias publicas para usar Pet Ecosystem durante el piloto: propietarios, proveedores, familias
                protectoras y adoptantes. El contenido interno de admin y soporte queda separado en el backoffice.
              </p>
            </div>
            <div className="help-stats" aria-label="Resumen del manual">
              {helpStats.map((stat) => (
                <div className="help-stat" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="topic-grid" aria-label="Indice rapido">
            {quickTopics.map((topic) => (
              <a href={topic.href} key={topic.href}>
                {topic.label}
              </a>
            ))}
          </div>
        </header>

        <section className="role-overview" aria-label="Guias por rol">
          {guideGroups.map((group) => (
            <RoleCard group={group} key={group.id} />
          ))}
        </section>

        <section className="guide-layout">
          <aside className="guide-sidebar" aria-label="Roles del manual">
            <strong>Explorar manual</strong>
            {guideGroups.map((group) => (
              <a href={`#${group.id}`} key={group.id}>
                {group.role}
              </a>
            ))}
            <a href="#privacidad">Privacidad y limites</a>
          </aside>

          <div className="guide-stack">
            {guideGroups.map((group) => (
              <GuideGroupSection group={group} key={group.id} />
            ))}

            <section className="role-section" id="privacidad">
              <div className="role-heading">
                <div>
                  <h2>Privacidad, seguridad y alcance del piloto</h2>
                  <p>
                    Pet Ecosystem organiza datos de cuentas, hogares, mascotas, reservas, mensajes, documentos y adopciones.
                    El uso debe respetar privacidad, consentimiento y trazabilidad.
                  </p>
                </div>
                <StatusChip status="available" />
              </div>
              <div className="guide-grid">
                <article className="manual-note">
                  <h3 style={smallTitleStyle}>Datos publicos y privados</h3>
                  <p>
                    Perfiles de proveedor, perfiles de familias protectoras y publicaciones de adopcion solo muestran datos
                    declarados como publicos. Documentos, direcciones exactas, informacion sensible de salud y datos de viaje
                    no deben exponerse en marketplace ni en cards publicas.
                  </p>
                </article>
                <article className="manual-note">
                  <h3 style={smallTitleStyle}>Lo que la app no promete</h3>
                  <p>
                    La plataforma no emite certificados oficiales, no sustituye servicios veterinarios, no procesa donaciones
                    ni garantiza aprobaciones de adopcion o reservas. El piloto mantiene pagos reales fuera de la app.
                  </p>
                </article>
                <article className="manual-note">
                  <h3 style={smallTitleStyle}>Baja de cuenta</h3>
                  <p>
                    La eliminacion de cuenta se solicita desde mobile en Cuenta o desde la pagina publica de eliminacion. Los
                    datos personales se anonimizan y los registros transaccionales pueden conservarse para operacion, soporte
                    y auditoria.
                  </p>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function RoleCard({ group }: { group: GuideGroup }) {
  return (
    <a className="role-card" href={`#${group.id}`}>
      <span className="role-card-header">
        <span className="role-icon">{group.icon}</span>
        <StatusChip status={group.status} />
      </span>
      <strong>{group.role}</strong>
      <span>{group.description}</span>
    </a>
  );
}

function GuideGroupSection({ group }: { group: GuideGroup }) {
  return (
    <section className="role-section" id={group.id}>
      <div className="role-heading">
        <div>
          <div className="role-title">
            <span className="role-icon">{group.icon}</span>
            <h2>{group.role}</h2>
          </div>
          <p>{group.description}</p>
        </div>
        <StatusChip status={group.status} />
      </div>
      <div className="guide-grid">
        {group.guides.map((guide) => (
          <GuideCard guide={guide} key={guide.title} />
        ))}
      </div>
    </section>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <article className="guide-card">
      <div>
        <div className="guide-meta">
          <StatusChip status={guide.status} />
          <span style={platformChipStyle}>{guide.platform}</span>
        </div>
        <h3 style={{ marginTop: 10 }}>{guide.title}</h3>
        <p>{guide.objective}</p>
      </div>

      <GuideBlock title="Antes de empezar">
        <ul>
          {guide.before.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </GuideBlock>

      <GuideBlock title="Pasos">
        <ol>
          {guide.steps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </GuideBlock>

      <GuideBlock title="Resultado esperado">
        <p>{guide.expected}</p>
      </GuideBlock>

      <GuideBlock title="Errores comunes">
        <ul>
          {guide.commonErrors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </GuideBlock>

      <GuideBlock title="Privacidad y seguridad">
        <p>{guide.privacy}</p>
      </GuideBlock>
    </article>
  );
}

function GuideBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: StatusTone }) {
  const styleByStatus: Record<StatusTone, CSSProperties> = {
    available: { background: "#e7f7f5", borderColor: "rgba(0,143,137,0.32)", color: "#007a6b" },
    pilot: { background: "#fff8e8", borderColor: "rgba(217,119,6,0.3)", color: "#b45309" },
    soon: { background: "#f4f4f5", borderColor: "rgba(82,82,91,0.22)", color: "#52525b" }
  };

  return <span style={{ ...chipStyle, ...styleByStatus[status] }}>{statusLabels[status]}</span>;
}

const surfaceStyle: CSSProperties = {
  background: "linear-gradient(180deg, #f8fbf8 0%, #f3eee2 100%)",
  color: "#12313a",
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  minHeight: "100vh"
};

const primaryLinkStyle: CSSProperties = {
  alignItems: "center",
  background: "#008f89",
  border: "1px solid #008f89",
  borderRadius: 8,
  color: "#ffffff",
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 850,
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  textDecoration: "none"
};

const secondaryLinkStyle: CSSProperties = {
  ...primaryLinkStyle,
  background: "#ffffff",
  border: "1px solid rgba(0,143,137,0.32)",
  color: "#006f6a"
};

const chipStyle: CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.05em",
  padding: "7px 10px",
  textTransform: "uppercase"
};

const platformChipStyle: CSSProperties = {
  ...chipStyle,
  background: "#ffffff",
  borderColor: "rgba(18,49,58,0.12)",
  color: "#344b55"
};

const smallTitleStyle: CSSProperties = {
  color: "#0f2530",
  fontSize: 16,
  lineHeight: 1.2,
  margin: "0 0 8px"
};
