type AdminGuide = {
  title: string;
  objective: string;
  before: string[];
  steps: string[];
  expected: string;
  risks: string[];
};

const adminGuides: AdminGuide[] = [
  {
    title: "Aprobar proveedores",
    objective: "Revisar negocios, documentos y readiness antes de habilitar marketplace.",
    before: ["Usa una cuenta con rol admin.", "Confirma que la revision corresponde al negocio correcto."],
    steps: [
      "Abre Proveedores.",
      "Revisa datos del negocio, perfil publico, servicios, agenda/cupos, ubicacion publica y documentos.",
      "Aprueba, rechaza o solicita correccion segun el checklist.",
      "Registra observaciones claras si el proveedor debe corregir informacion."
    ],
    expected: "Solo proveedores aprobados y completos quedan visibles para owners.",
    risks: ["Aprobar sin documentos suficientes.", "Confundir datos maestros con perfil publico.", "No revisar agenda o servicios activos."]
  },
  {
    title: "Moderar familias protectoras",
    objective: "Validar perfiles publicos, publicaciones de adopcion, fotos y solicitudes sensibles.",
    before: ["La adopcion no es venta.", "No se debe exponer direccion exacta ni datos privados."],
    steps: [
      "Abre Familias protectoras.",
      "Revisa solicitud de familia, perfil publico, logo, redes y bloque de apoyo si existe.",
      "Modera publicaciones y fotos cuando aparezcan en cola o por soporte.",
      "Observa solicitudes y transferencias solo cuando el caso lo justifique."
    ],
    expected: "El espacio de adopcion mantiene confianza, privacidad y trazabilidad.",
    risks: ["Aprobar texto fiscal absoluto.", "Permitir venta encubierta.", "Exponer datos privados de contacto o ubicacion."]
  },
  {
    title: "Soporte operativo",
    objective: "Resolver casos del piloto sin romper trazabilidad de reservas, chats, adopciones o cuenta.",
    before: ["Identifica rol y modulo afectado.", "No hagas cambios directos fuera de flujos o runbooks aprobados."],
    steps: [
      "Abre Soporte.",
      "Revisa caso, creador, proveedor, servicio y estado.",
      "Actualiza estado y notas administrativas con lenguaje claro.",
      "Escala si el caso toca documentos sensibles, adopcion, baja de cuenta o datos de salud."
    ],
    expected: "El caso queda gestionado con historial claro y sin exponer datos sensibles.",
    risks: ["Prometer eliminacion total inmediata.", "Cambiar datos fuera de UI sin auditoria.", "Confundir solicitud de adopcion con transferencia."]
  },
  {
    title: "Baja de cuenta y privacidad",
    objective: "Orientar solicitudes de eliminacion sin borrar historial transaccional protegido.",
    before: ["Verifica el correo de la cuenta.", "Confirma si hay reservas, soporte o adopciones en curso."],
    steps: [
      "Indica al usuario que puede solicitar baja desde mobile en Cuenta > Eliminar cuenta.",
      "Como alternativa, remite a la pagina publica /account-deletion.",
      "Explica que datos personales se anonimizan y que registros operativos pueden conservarse.",
      "No prometas borrado fisico de reservas, chats, soporte, evidencias o auditoria."
    ],
    expected: "El usuario entiende el alcance de baja y soporte conserva trazabilidad requerida.",
    risks: ["Eliminar evidencia operativa necesaria.", "Dar una promesa legal absoluta.", "No validar identidad del solicitante."]
  }
];

export function AdminHelpWorkspace() {
  return (
    <section style={{ display: "grid", gap: "18px" }}>
      <header style={heroStyle}>
        <span style={eyebrowStyle}>Manual interno</span>
        <h2 style={{ margin: 0, fontSize: "30px", lineHeight: 1.12 }}>Admin y soporte</h2>
        <p style={{ ...paragraphStyle, color: "rgba(248,250,252,0.78)" }}>
          Guia operativa para usuarios admin de Pet Ecosystem. Este contenido se mantiene dentro del backoffice y no se
          muestra en el centro de ayuda publico de la landing.
        </p>
      </header>

      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {adminGuides.map((guide) => (
          <article key={guide.title} style={cardStyle}>
            <span style={chipStyle}>Admin</span>
            <h3 style={{ margin: 0, fontSize: "20px", lineHeight: 1.2 }}>{guide.title}</h3>
            <p style={paragraphStyle}>{guide.objective}</p>
            <GuideBlock items={guide.before} title="Antes de empezar" />
            <GuideBlock items={guide.steps} ordered title="Pasos" />
            <div>
              <h4 style={blockTitleStyle}>Resultado esperado</h4>
              <p style={paragraphStyle}>{guide.expected}</p>
            </div>
            <GuideBlock items={guide.risks} title="Riesgos a evitar" />
          </article>
        ))}
      </div>

      <article style={{ ...cardStyle, background: "#fff8e8", borderColor: "rgba(217,119,6,0.26)" }}>
        <h3 style={{ margin: 0, fontSize: "20px" }}>Regla de separacion</h3>
        <p style={paragraphStyle}>
          El manual publico en petecosyst.com/ayuda queda reservado para usuarios de la app publica: propietarios,
          proveedores, familias protectoras y adoptantes. El material de admin/soporte permanece en admin.petecosyst.com
          porque contiene criterios internos de moderacion, privacidad y soporte operativo.
        </p>
      </article>
    </section>
  );
}

function GuideBlock({ items, ordered = false, title }: { items: string[]; ordered?: boolean; title: string }) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <div>
      <h4 style={blockTitleStyle}>{title}</h4>
      <ListTag style={{ color: "#52525b", display: "grid", fontSize: "13px", gap: "6px", lineHeight: 1.55, margin: 0, paddingLeft: "18px" }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

const heroStyle = {
  background: "#111827",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: "18px",
  boxShadow: "0 18px 42px rgba(15,23,42,0.12)",
  color: "#f8fafc",
  display: "grid",
  gap: "10px",
  padding: "24px"
} as const;

const cardStyle = {
  background: "#ffffff",
  border: "1px solid rgba(24,24,27,0.12)",
  borderRadius: "16px",
  boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
  display: "grid",
  gap: "12px",
  padding: "18px"
} as const;

const eyebrowStyle = {
  color: "#5eead4",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
} as const;

const paragraphStyle = {
  color: "#52525b",
  fontSize: "14px",
  lineHeight: 1.65,
  margin: 0
} as const;

const chipStyle = {
  alignSelf: "start",
  background: "#e7f7f5",
  border: "1px solid rgba(0,143,137,0.28)",
  borderRadius: "999px",
  color: "#007a6b",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  padding: "7px 10px",
  textTransform: "uppercase"
} as const;

const blockTitleStyle = {
  color: "#111827",
  fontSize: "11px",
  letterSpacing: "0.08em",
  margin: "0 0 6px",
  textTransform: "uppercase"
} as const;
