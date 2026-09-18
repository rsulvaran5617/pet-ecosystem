import "./ProductLandingScreen.css";

const brandLogoPath = "/brand/pet-ecosystem-logo-mark.png";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "#para-duenos", label: "Duenos" },
  { href: "#para-proveedores", label: "Proveedores" },
  { href: "#para-protectores", label: "Protectores" },
  { href: "/ayuda", label: "Ayuda" },
  { href: "#piloto", label: "Piloto" },
  { href: "#contacto", label: "Contacto" }
];

const audienceCards = [
  {
    id: "para-duenos",
    eyebrow: "Propietarios",
    title: "Cuida, organiza y reserva desde un solo lugar",
    copy: "Registra tus mascotas, conserva documentos importantes, recibe recordatorios y encuentra proveedores aprobados para reservar servicios.",
    cta: "Entrar como dueno",
    href: "/app",
    points: ["Hogar y mascotas", "Salud y documentos", "Reservas y mensajes"]
  },
  {
    id: "para-proveedores",
    eyebrow: "Proveedores",
    title: "Opera tu negocio pet con una consola clara",
    copy: "Publica servicios, configura agenda y cupos, atiende solicitudes, conversa con clientes y controla la salud operativa de tus negocios.",
    cta: "Entrar como proveedor",
    href: "/app",
    points: ["Servicios y precios", "Agenda y capacidad", "Reservas entrantes"]
  },
  {
    id: "para-protectores",
    eyebrow: "Familias protectoras",
    title: "Gestiona acogida y adopciones responsables",
    copy: "Organiza mascotas bajo cuidado temporal, publica fichas responsables, revisa solicitudes y acompana transferencias con trazabilidad.",
    cta: "Abrir consola protectora",
    href: "/foster",
    points: ["Mascotas en acogida", "Publicaciones", "Solicitudes y transferencias"]
  }
];

const trustCards = [
  {
    label: "Seguridad",
    title: "Datos organizados y acceso controlado",
    copy: "Hogares, mascotas, documentos, reservas y conversaciones se separan por rol y contexto."
  },
  {
    label: "Operacion",
    title: "Piloto con flujos reales",
    copy: "Reservas, cupos, mensajeria, perfiles publicos y adopciones se validan con datos del piloto."
  },
  {
    label: "Soporte",
    title: "Manual publico y backoffice separado",
    copy: "Los usuarios consultan /ayuda y el contenido interno queda protegido en admin.petecosyst.com."
  }
];

const stats = [
  { value: "3", label: "Roles principales" },
  { value: "QR", label: "Operacion trazable" },
  { value: "24/7", label: "Consulta del manual" },
  { value: "MVP", label: "Piloto controlado" }
];

const pilotItems = [
  "Sin cobro real dentro de la app durante el piloto.",
  "Proveedores y familias protectoras pasan por revision.",
  "Reservas, mensajes y adopciones mantienen trazabilidad.",
  "La documentacion publica se consulta desde el Centro de ayuda."
];

const linkButtonBase = {
  alignItems: "center",
  borderRadius: "999px",
  display: "inline-flex",
  fontSize: "14px",
  fontWeight: 850,
  justifyContent: "center",
  minHeight: "44px",
  padding: "0 18px",
  textDecoration: "none"
} as const;

const compactLinkButtonBase = {
  ...linkButtonBase,
  fontSize: "12px",
  minHeight: "36px",
  padding: "0 14px"
} as const;

const primaryLinkStyle = {
  ...linkButtonBase,
  background: "#008f89",
  border: "1px solid #008f89",
  color: "#ffffff"
} as const;

const secondaryLinkStyle = {
  ...linkButtonBase,
  background: "#ffffff",
  border: "1px solid rgba(0,143,137,0.28)",
  color: "#007a6b"
} as const;

const compactPrimaryLinkStyle = {
  ...compactLinkButtonBase,
  background: "#008f89",
  border: "1px solid #008f89",
  color: "#ffffff"
} as const;

const compactSecondaryLinkStyle = {
  ...compactLinkButtonBase,
  background: "#ffffff",
  border: "1px solid rgba(0,143,137,0.28)",
  color: "#007a6b"
} as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand-mark brand-mark-compact" : "brand-mark"}>
      <img alt="" src={brandLogoPath} />
    </span>
  );
}

function PhonePreview() {
  return (
    <div className="phone-frame" aria-label="Vista previa de la experiencia mobile">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="phone-header">
          <span>Hola, Valeria</span>
          <strong>Que necesita hoy?</strong>
        </div>
        <div className="phone-search">Buscar veterinaria, grooming o paseos</div>
        <div className="phone-grid">
          <span>VC<small>Veterinaria</small></span>
          <span>PS<small>Paseos</small></span>
          <span>GR<small>Grooming</small></span>
          <span>GD<small>Guarderia</small></span>
        </div>
        <div className="phone-card">
          <span>Ultima reserva</span>
          <strong>Grooming - Jueves 4:30 pm</strong>
          <small>Confirmada por el proveedor</small>
        </div>
        <div className="phone-card phone-card-soft">
          <span>Mis mascotas</span>
          <strong>Max</strong>
          <small>Recordatorio activo</small>
        </div>
        <div className="phone-tabs">
          <span>Inicio</span>
          <span>Buscar</span>
          <span>Reservas</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCheck({ children }: { children: string }) {
  return (
    <li>
      <span aria-hidden="true">OK</span>
      {children}
    </li>
  );
}

export function ProductLandingScreen() {
  return (
    <main className="landing-skin">

      <div className="landing-shell">
        <nav className="top-nav" aria-label="Navegacion principal">
          <a className="brand-link" href="/">
            <BrandMark compact />
            <span className="brand-copy">
              <strong>Pet Ecosystem</strong>
              <span>Cuidado, servicios y adopcion responsable</span>
            </span>
          </a>

          <div className="nav-items">
            {navItems.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </div>

          <a href="/app" style={primaryLinkStyle}>
            Conocer el piloto
          </a>
        </nav>

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Plataforma pet en piloto controlado</span>
            <h1>
              Gestiona el cuidado de tus mascotas con un ecosistema <span>confiable</span>
            </h1>
            <p>
              Pet Ecosystem conecta propietarios, proveedores y familias protectoras en una experiencia ordenada para
              mascotas, servicios, reservas, documentos, salud, mensajes y adopciones responsables.
            </p>

            <div className="hero-actions">
              <a href="/app" style={primaryLinkStyle}>
                Soy dueno de mascota
              </a>
              <a href="/app" style={secondaryLinkStyle}>
                Soy proveedor
              </a>
              <a href="/foster" style={secondaryLinkStyle}>
                Soy familia protectora
              </a>
            </div>

            <div className="hero-note" aria-label="Alcance del piloto">
              <span>Sin cobro real</span>
              <span>Proveedores aprobados</span>
              <span>Adopcion responsable</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-card" />
            <div className="logo-orbit">
              <img alt="" src={brandLogoPath} />
            </div>
            <PhonePreview />
          </div>
        </section>

        <section className="stats-band" aria-label="Resumen del piloto">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>

        <section className="section" aria-labelledby="confianza-title">
          <div className="section-header">
            <span className="eyebrow">Confianza operativa</span>
            <h2 id="confianza-title">Una plataforma pensada para operar con claridad</h2>
            <p>
              Cada rol tiene su propio espacio, sus permisos y sus acciones. La experiencia publica se mantiene simple y
              la operacion interna queda separada.
            </p>
          </div>

          <div className="trust-grid">
            {trustCards.map((card) => (
              <article className="trust-card" key={card.title}>
                <span className="trust-label">{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="audiencias-title">
          <div className="section-header">
            <span className="eyebrow">Para cada grupo</span>
            <h2 id="audiencias-title">Una experiencia separada por necesidad</h2>
            <p>
              Pet Ecosystem evita mezclar operaciones distintas: cuidar mascotas, operar servicios y gestionar adopciones
              responsables tienen espacios propios.
            </p>
          </div>

          <div className="audience-grid">
            {audienceCards.map((card) => (
              <article className="audience-card" id={card.id} key={card.id}>
                <span className="trust-label">{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
                <ul>
                  {card.points.map((point) => (
                    <FeatureCheck key={point}>{point}</FeatureCheck>
                  ))}
                </ul>
                <div className="audience-footer">
                  <a href={card.href} style={card.id === "para-duenos" ? compactPrimaryLinkStyle : compactSecondaryLinkStyle}>
                    {card.cta}
                  </a>
                  <span className="audience-badge">Piloto</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="piloto">
          <div className="pilot-panel">
            <div>
              <span className="eyebrow">Piloto controlado</span>
              <h2>Aprender con usuarios reales antes de escalar</h2>
              <p>
                Estamos validando los flujos criticos con propietarios, proveedores, familias protectoras y soporte
                interno. El objetivo es fortalecer confianza, trazabilidad y calidad operativa antes de produccion masiva.
              </p>
              <ul className="pilot-list">
                {pilotItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="hero-actions" style={{ marginTop: "18px" }}>
                <a href="/app" style={primaryLinkStyle}>
                  Entrar al piloto
                </a>
                <a href="/ayuda" style={secondaryLinkStyle}>
                  Consultar manual
                </a>
              </div>
            </div>

            <aside className="pilot-aside">
              <BrandMark />
              <strong>Pet Ecosystem</strong>
              <span>
                Cuidado, servicios y adopcion responsable con una experiencia separada para cada rol.
              </span>
              <a className="pilot-aside-cta" href="/foster" style={{ ...compactSecondaryLinkStyle, justifySelf: "start" }}>
                Familias protectoras
              </a>
            </aside>
          </div>
        </section>

        <footer className="footer" id="contacto">
          <div>
            <a className="brand-link" href="/">
              <BrandMark compact />
              <span className="brand-copy">
                <strong>Pet Ecosystem</strong>
                <span>Conectamos amor, cuidado y confianza.</span>
              </span>
            </a>
          </div>

          <div>
            <h4>Producto</h4>
            <a href="#para-duenos">Para duenos</a>
            <a href="#para-proveedores">Para proveedores</a>
            <a href="#para-protectores">Para protectores</a>
            <a href="/ayuda">Centro de ayuda</a>
          </div>

          <div>
            <h4>Accesos</h4>
            <a href="/app">App publica</a>
            <a href="/foster">Consola protectora</a>
            <a href="/account-deletion">Eliminar cuenta</a>
          </div>

          <div>
            <h4>Piloto</h4>
            <span>Payment-ready</span>
            <span>Sin cobro real</span>
            <span>Revision operativa</span>
          </div>

          <div>
            <h4>Contacto</h4>
            <span>hola@pet-ecosystem.com</span>
            <span>Panama</span>
            <a href="/ayuda">Manual de usuario</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
