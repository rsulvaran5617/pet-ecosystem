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
      <style>{`
        .landing-skin {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 8%, rgba(0, 151, 143, 0.1), transparent 28%),
            linear-gradient(180deg, #fbfaf7 0%, #f7f2e7 100%);
          color: #101828;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .landing-shell {
          width: min(1180px, calc(100% - 34px));
          margin: 0 auto;
        }

        .top-nav {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .brand-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #101828;
          text-decoration: none;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid rgba(0, 143, 137, 0.18);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          display: grid;
          place-items: center;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .brand-mark-compact {
          width: 34px;
          height: 34px;
          border-radius: 11px;
        }

        .brand-mark img {
          width: 80%;
          height: 80%;
          object-fit: contain;
        }

        .brand-copy {
          display: grid;
          gap: 2px;
        }

        .brand-copy strong {
          font-size: 15px;
          line-height: 1;
        }

        .brand-copy span {
          color: #5f6675;
          font-size: 11px;
          font-weight: 750;
        }

        .nav-items {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .nav-items a {
          color: #374151;
          font-size: 12px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .nav-items a:hover {
          color: #00847d;
        }

        .hero {
          min-height: 650px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 520px);
          gap: 44px;
          align-items: center;
          padding: 34px 0 44px;
        }

        .hero-copy {
          display: grid;
          gap: 22px;
          align-content: center;
        }

        .eyebrow {
          justify-self: start;
          border-radius: 999px;
          background: #e6f7f5;
          border: 1px solid rgba(0, 143, 137, 0.16);
          color: #007a6b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          padding: 9px 13px;
          text-transform: uppercase;
        }

        .hero h1 {
          color: #102f3a;
          font-size: 62px;
          line-height: 1;
          margin: 0;
          max-width: 690px;
        }

        .hero h1 span {
          color: #008f89;
        }

        .hero p {
          color: #536873;
          font-size: 17px;
          line-height: 1.7;
          margin: 0;
          max-width: 610px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hero-note {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hero-note span {
          border-radius: 999px;
          border: 1px solid rgba(16, 24, 40, 0.1);
          background: rgba(255, 255, 255, 0.75);
          color: #374151;
          font-size: 12px;
          font-weight: 800;
          padding: 8px 11px;
        }

        .hero-visual {
          min-height: 600px;
          position: relative;
          display: grid;
          place-items: center;
        }

        .visual-card {
          position: absolute;
          inset: 34px 0 34px 74px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(230, 247, 245, 0.96), rgba(255, 255, 255, 0.82));
          border: 1px solid rgba(0, 143, 137, 0.14);
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.12);
        }

        .visual-card::after {
          content: "";
          position: absolute;
          right: -36px;
          bottom: -34px;
          width: 210px;
          height: 250px;
          border-radius: 130px 130px 44px 44px;
          background: linear-gradient(180deg, #f0c487, #c88745);
          box-shadow: inset 0 -38px 0 rgba(112, 78, 45, 0.16);
        }

        .visual-card::before {
          content: "";
          position: absolute;
          right: 96px;
          bottom: 24px;
          width: 128px;
          height: 150px;
          border-radius: 82px 82px 30px 30px;
          background: linear-gradient(180deg, #b49370, #735640);
          opacity: 0.76;
        }

        .logo-orbit {
          position: absolute;
          right: 30px;
          top: 80px;
          width: 130px;
          height: 130px;
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(0, 143, 137, 0.12);
          box-shadow: 0 20px 54px rgba(15, 23, 42, 0.12);
          display: grid;
          place-items: center;
          z-index: 2;
        }

        .logo-orbit img {
          width: 92px;
          height: 92px;
          object-fit: contain;
        }

        .phone-frame {
          position: relative;
          z-index: 3;
          width: 260px;
          min-height: 510px;
          border-radius: 44px;
          background: #101828;
          border: 8px solid #101828;
          box-shadow: 0 26px 72px rgba(15, 23, 42, 0.24);
          padding: 14px;
        }

        .phone-notch {
          position: absolute;
          top: 12px;
          left: 50%;
          width: 82px;
          height: 20px;
          border-radius: 999px;
          background: #101828;
          transform: translateX(-50%);
          z-index: 4;
        }

        .phone-screen {
          min-height: inherit;
          border-radius: 34px;
          background: #ffffff;
          display: grid;
          gap: 14px;
          overflow: hidden;
          padding: 42px 16px 14px;
        }

        .phone-header {
          display: grid;
          gap: 10px;
        }

        .phone-header span,
        .phone-card span {
          color: #5f6675;
          font-size: 11px;
          font-weight: 800;
        }

        .phone-header strong {
          color: #102f3a;
          font-size: 18px;
        }

        .phone-search {
          background: #f0f7f6;
          border-radius: 14px;
          color: #536873;
          font-size: 11px;
          padding: 14px;
        }

        .phone-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .phone-grid span {
          min-height: 64px;
          border-radius: 14px;
          border: 1px solid #dcefeb;
          background: #f8fbf8;
          color: #00847d;
          display: grid;
          gap: 4px;
          place-items: center;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
        }

        .phone-grid small {
          color: #5f6675;
          font-size: 8px;
          font-weight: 600;
        }

        .phone-card {
          border: 1px solid rgba(16,24,40,0.1);
          border-radius: 16px;
          display: grid;
          gap: 8px;
          padding: 14px;
        }

        .phone-card strong {
          color: #102f3a;
          font-size: 14px;
        }

        .phone-card small {
          color: #5f6675;
          font-size: 10px;
        }

        .phone-card-soft {
          background: #f8fbf8;
        }

        .phone-tabs {
          margin-top: auto;
          border-top: 1px solid rgba(16,24,40,0.08);
          display: flex;
          justify-content: space-around;
          padding-top: 12px;
        }

        .phone-tabs span {
          color: #5f6675;
          font-size: 9px;
        }

        .stats-band {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: -22px;
          position: relative;
          z-index: 5;
        }

        .stat-card,
        .trust-card,
        .audience-card,
        .pilot-panel {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(16, 24, 40, 0.1);
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.07);
        }

        .stat-card {
          border-radius: 18px;
          display: grid;
          gap: 6px;
          padding: 18px;
        }

        .stat-card strong {
          color: #00847d;
          font-size: 24px;
          line-height: 1;
        }

        .stat-card span {
          color: #536873;
          font-size: 12px;
          font-weight: 800;
        }

        .section {
          padding: 64px 0;
        }

        .section-header {
          display: grid;
          gap: 10px;
          margin: 0 auto 24px;
          max-width: 720px;
          text-align: center;
        }

        .section-header h2 {
          color: #102f3a;
          font-size: 34px;
          line-height: 1.15;
          margin: 0;
        }

        .section-header p {
          color: #536873;
          font-size: 15px;
          line-height: 1.65;
          margin: 0;
        }

        .trust-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .trust-card {
          border-radius: 18px;
          display: grid;
          gap: 10px;
          padding: 22px;
        }

        .trust-label {
          align-self: start;
          border-radius: 999px;
          background: #e6f7f5;
          color: #007a6b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          padding: 7px 10px;
          text-transform: uppercase;
          width: fit-content;
        }

        .trust-card h3,
        .audience-card h3,
        .pilot-panel h2 {
          color: #102f3a;
          margin: 0;
        }

        .trust-card h3 {
          font-size: 18px;
        }

        .trust-card p,
        .audience-card p,
        .pilot-panel p {
          color: #536873;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }

        .audience-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .audience-card {
          border-radius: 20px;
          display: grid;
          gap: 16px;
          min-height: 380px;
          padding: 24px;
        }

        .audience-card h3 {
          font-size: 25px;
          line-height: 1.12;
        }

        .audience-card ul {
          display: grid;
          gap: 9px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .audience-card li {
          align-items: center;
          color: #374151;
          display: flex;
          font-size: 13px;
          gap: 8px;
        }

        .audience-card li span {
          align-items: center;
          background: #e6f7f5;
          border-radius: 999px;
          color: #007a6b;
          display: inline-flex;
          flex: 0 0 auto;
          font-size: 8px;
          font-weight: 900;
          height: 22px;
          justify-content: center;
          width: 22px;
        }

        .audience-footer {
          align-items: center;
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-top: auto;
        }

        .audience-badge {
          border-radius: 999px;
          background: #fff8e8;
          border: 1px solid rgba(217, 119, 6, 0.2);
          color: #b45309;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          padding: 8px 10px;
          text-transform: uppercase;
        }

        .pilot-panel {
          border-radius: 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          overflow: hidden;
          padding: 30px;
          position: relative;
        }

        .pilot-panel::after {
          content: "";
          position: absolute;
          right: -60px;
          bottom: -80px;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          background: rgba(0, 143, 137, 0.12);
        }

        .pilot-panel h2 {
          font-size: 30px;
          line-height: 1.15;
        }

        .pilot-list {
          display: grid;
          gap: 10px;
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
        }

        .pilot-list li {
          border-radius: 14px;
          background: #fffdf8;
          border: 1px solid rgba(16,24,40,0.08);
          color: #374151;
          font-size: 13px;
          line-height: 1.45;
          padding: 12px 14px;
        }

        .pilot-aside {
          align-self: stretch;
          background: #111827;
          border-radius: 20px;
          color: #ffffff;
          display: grid;
          gap: 14px;
          padding: 22px;
          position: relative;
          z-index: 1;
        }

        .pilot-aside strong {
          font-size: 22px;
          line-height: 1.15;
        }

        .pilot-aside span {
          color: rgba(255,255,255,0.72);
          font-size: 13px;
          line-height: 1.55;
        }

        .pilot-aside-cta {
          align-self: start;
          box-sizing: border-box;
          height: 36px;
          line-height: 1;
          max-height: 36px;
          min-height: 36px;
          width: fit-content;
        }

        .footer {
          border-top: 1px solid rgba(16, 24, 40, 0.1);
          display: grid;
          gap: 24px;
          grid-template-columns: 1.4fr repeat(4, 1fr);
          padding: 38px 0;
        }

        .footer h4 {
          color: #102f3a;
          font-size: 12px;
          margin: 0 0 10px;
        }

        .footer a,
        .footer span {
          color: #536873;
          display: block;
          font-size: 12px;
          line-height: 1.9;
          text-decoration: none;
        }

        .footer a:hover {
          color: #00847d;
        }

        @media (max-width: 980px) {
          .top-nav {
            align-items: flex-start;
            flex-direction: column;
            padding: 18px 0;
          }

          .nav-items {
            gap: 14px;
            overflow-x: auto;
            padding-bottom: 4px;
            width: 100%;
          }

          .hero,
          .pilot-panel,
          .footer {
            grid-template-columns: 1fr;
          }

          .hero {
            min-height: auto;
            padding: 36px 0 54px;
          }

          .hero h1 {
            font-size: 48px;
          }

          .hero-visual {
            min-height: 540px;
          }

          .visual-card {
            inset: 24px 0;
          }

          .trust-grid,
          .audience-grid {
            grid-template-columns: 1fr;
          }

          .audience-card {
            min-height: auto;
          }

          .stats-band {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 0;
          }
        }

        @media (max-width: 560px) {
          .landing-shell {
            width: min(100% - 24px, 1180px);
          }

          .brand-copy span {
            display: none;
          }

          .hero h1 {
            font-size: 38px;
          }

          .hero p {
            font-size: 15px;
          }

          .hero-actions a,
          .pilot-panel a {
            width: 100%;
          }

          .hero-visual {
            min-height: 470px;
          }

          .visual-card {
            inset: 30px 0 24px;
          }

          .logo-orbit {
            display: none;
          }

          .phone-frame {
            width: 224px;
            min-height: 454px;
          }

          .visual-card::after {
            right: -58px;
            width: 160px;
            height: 210px;
          }

          .visual-card::before {
            right: 92px;
            width: 90px;
            height: 118px;
          }

          .stats-band {
            grid-template-columns: 1fr;
          }

          .section {
            padding: 46px 0;
          }

          .section-header h2,
          .pilot-panel h2 {
            font-size: 26px;
          }

          .audience-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

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
