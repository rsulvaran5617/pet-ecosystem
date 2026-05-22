const brandLogoPath = "/brand/pet-ecosystem-logo.png";

const surfaceStyle = {
  minHeight: "100vh",
  background: "#f8fbf8",
  color: "#12313a",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
};

const primaryLinkStyle = {
  alignItems: "center",
  background: "#008f89",
  border: "1px solid #008f89",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-flex",
  fontSize: "14px",
  fontWeight: 850,
  gap: "8px",
  justifyContent: "center",
  minHeight: "42px",
  padding: "0 16px",
  textDecoration: "none"
};

const secondaryLinkStyle = {
  alignItems: "center",
  background: "#ffffff",
  border: "1px solid rgba(0,143,137,0.32)",
  borderRadius: "8px",
  color: "#006f6a",
  display: "inline-flex",
  fontSize: "14px",
  fontWeight: 850,
  gap: "8px",
  justifyContent: "center",
  minHeight: "42px",
  padding: "0 16px",
  textDecoration: "none"
};

const navItems = ["Inicio", "Para dueños", "Para proveedores", "Clinica/servicios", "Piloto", "Contacto"];

const serviceChips = [
  { icon: "VC", label: "Veterinaria" },
  { icon: "PS", label: "Paseos" },
  { icon: "GR", label: "Grooming" },
  { icon: "GD", label: "Guarderia" }
];

const trustCards = [
  {
    icon: "SH",
    title: "Seguridad y confianza en cada paso",
    copy: "Proveedores aprobados, reservas trazables e informacion protegida."
  },
  {
    icon: "EQ",
    title: "Piloto controlado para aprender con datos reales",
    copy: "Operacion inicial con propietarios, proveedores y admin interno."
  }
];

const flowSteps = [
  { title: "Registra", copy: "Crea tu cuenta y organiza hogar, mascotas y proveedor si aplica." },
  { title: "Completa tu perfil", copy: "Activa informacion clave para operar o reservar servicios." },
  { title: "Reserva o recibe solicitudes", copy: "Elige proveedor, servicio y horario; o atiende reservas entrantes." },
  { title: "Da seguimiento", copy: "Usa mensajes, estados, QR operacional y evidencia documental." }
];

const ownerItems = [
  "Registra todos tus datos importantes",
  "Encuentra servicios cercanos",
  "Reserva horarios disponibles",
  "Revisa chats y soporte",
  "Evidencia documental del servicio"
];

const providerItems = [
  "Publica tu negocio y servicios",
  "Configura horarios y cupos",
  "Recibe y aprueba reservas",
  "Check-in y check-out con QR",
  "Mide citas cerradas y pendientes"
];

function FeatureCheck({ children }: { children: string }) {
  return (
    <li>
      <span aria-hidden="true">✓</span>
      {children}
    </li>
  );
}

function PhoneMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "phone-mock phone-mock-small" : "phone-mock"} aria-label="Vista previa de la app">
      <div className="phone-speaker" />
      <div className="phone-content">
        <div className="phone-top">
          <span>Hola, Valeria</span>
          <strong>¿Que necesita hoy?</strong>
        </div>
        <div className="phone-search">Buscar veterinaria, grooming o paseos</div>
        <div className="phone-services">
          {serviceChips.map((service) => (
            <div className="phone-service" key={service.label}>
              <span>{service.icon}</span>
              <small>{service.label}</small>
            </div>
          ))}
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

export function ProductLandingScreen() {
  return (
    <main style={surfaceStyle}>
      <style>{`
        .landing-page {
          width: min(1180px, calc(100% - 34px));
          margin: 0 auto;
        }

        .top-nav {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .brand-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #12313a;
          text-decoration: none;
        }

        .brand-link img {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          object-fit: cover;
        }

        .brand-link strong {
          font-size: 14px;
          line-height: 1;
        }

        .nav-items {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-items a {
          color: #27464f;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .nav-items a:first-child {
          color: #008f89;
          border-bottom: 2px solid #008f89;
          padding-bottom: 8px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 560px);
          gap: 34px;
          min-height: 620px;
          align-items: center;
          position: relative;
        }

        .hero-copy {
          display: grid;
          gap: 18px;
          max-width: 560px;
          z-index: 2;
        }

        .eyebrow {
          justify-self: start;
          background: #e7f7f5;
          border-radius: 999px;
          color: #008f89;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          padding: 8px 12px;
          text-transform: uppercase;
        }

        .hero h1 {
          color: #102f3a;
          font-size: clamp(40px, 5vw, 66px);
          line-height: 1.02;
          margin: 0;
          max-width: 590px;
        }

        .hero h1 span {
          color: #008f89;
        }

        .hero p {
          color: #536873;
          font-size: 17px;
          line-height: 1.65;
          margin: 0;
          max-width: 520px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hero-mini-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
          max-width: 560px;
        }

        .hero-stat {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .hero-stat span {
          color: #008f89;
          font-size: 16px;
          font-weight: 900;
        }

        .hero-stat strong {
          color: #3d5963;
          font-size: 12px;
          line-height: 1.3;
        }

        .hero-visual {
          position: relative;
          min-height: 560px;
          display: grid;
          place-items: center;
        }

        .pet-shape {
          position: absolute;
          right: 0;
          width: min(450px, 80%);
          aspect-ratio: 1;
          border-radius: 44% 56% 50% 50%;
          background: linear-gradient(135deg, #a8ebe3 0%, #dff7f3 100%);
          opacity: 0.92;
        }

        .brand-orbit {
          position: absolute;
          right: 30px;
          bottom: 46px;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          background: rgba(255,255,255,0.74);
          display: grid;
          place-items: center;
          box-shadow: 0 24px 70px rgba(16,24,40,0.12);
        }

        .brand-orbit img {
          width: 190px;
          height: 190px;
          border-radius: 42px;
          object-fit: cover;
        }

        .pet-portrait {
          position: absolute;
          right: 18px;
          bottom: 32px;
          width: 210px;
          height: 260px;
          border-radius: 130px 130px 42px 42px;
          background: linear-gradient(180deg, #f2c48d, #c98949);
          box-shadow: inset 0 -38px 0 rgba(112,78,45,0.16);
          display: grid;
          place-items: start center;
          padding-top: 36px;
        }

        .pet-face {
          width: 132px;
          height: 118px;
          border-radius: 58% 58% 48% 48%;
          background: #f7d19d;
          position: relative;
        }

        .pet-face::before,
        .pet-face::after {
          content: "";
          position: absolute;
          top: 40px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #19323a;
        }

        .pet-face::before {
          left: 36px;
        }

        .pet-face::after {
          right: 36px;
        }

        .pet-nose {
          position: absolute;
          left: 50%;
          top: 66px;
          width: 26px;
          height: 18px;
          border-radius: 999px 999px 12px 12px;
          background: #19323a;
          transform: translateX(-50%);
        }

        .cat-card {
          position: absolute;
          right: 214px;
          bottom: 28px;
          width: 132px;
          height: 150px;
          border-radius: 74px 74px 30px 30px;
          background: linear-gradient(180deg, #b08b62, #735640);
          box-shadow: 0 20px 50px rgba(16,24,40,0.12);
        }

        .cat-card::before,
        .cat-card::after {
          content: "";
          position: absolute;
          top: -10px;
          width: 44px;
          height: 44px;
          background: #9a7652;
          transform: rotate(45deg);
        }

        .cat-card::before {
          left: 12px;
        }

        .cat-card::after {
          right: 12px;
        }

        .phone-mock {
          position: relative;
          z-index: 3;
          width: 250px;
          min-height: 485px;
          border-radius: 42px;
          background: #101828;
          border: 8px solid #101828;
          box-shadow: 0 24px 80px rgba(16,24,40,0.22);
          padding: 14px;
        }

        .phone-mock-small {
          width: 178px;
          min-height: 350px;
          border-radius: 34px;
          border-width: 7px;
          box-shadow: 0 18px 48px rgba(16,24,40,0.18);
        }

        .phone-speaker {
          position: absolute;
          top: 12px;
          left: 50%;
          width: 78px;
          height: 18px;
          border-radius: 999px;
          background: #101828;
          transform: translateX(-50%);
          z-index: 4;
        }

        .phone-content {
          min-height: inherit;
          border-radius: 32px;
          background: #ffffff;
          overflow: hidden;
          padding: 36px 14px 12px;
          display: grid;
          gap: 12px;
        }

        .phone-mock-small .phone-content {
          border-radius: 26px;
          padding: 30px 10px 10px;
          gap: 8px;
        }

        .phone-top {
          display: grid;
          gap: 4px;
        }

        .phone-top span,
        .phone-card span {
          color: #667085;
          font-size: 10px;
          font-weight: 750;
        }

        .phone-top strong {
          color: #12313a;
          font-size: 16px;
        }

        .phone-search {
          background: #f0f7f6;
          border-radius: 12px;
          color: #667085;
          font-size: 10px;
          padding: 10px;
        }

        .phone-services {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
        }

        .phone-service {
          background: #f6fbfa;
          border: 1px solid #e1f0ee;
          border-radius: 12px;
          display: grid;
          gap: 5px;
          justify-items: center;
          padding: 8px 4px;
        }

        .phone-service span {
          color: #008f89;
          font-size: 10px;
          font-weight: 900;
        }

        .phone-service small,
        .phone-card small,
        .phone-tabs span {
          color: #667085;
          font-size: 8px;
        }

        .phone-card {
          border: 1px solid #e7f0ee;
          border-radius: 14px;
          display: grid;
          gap: 5px;
          padding: 10px;
        }

        .phone-card strong {
          color: #12313a;
          font-size: 12px;
        }

        .phone-card-soft {
          background: #f8fbf8;
        }

        .phone-tabs {
          margin-top: auto;
          border-top: 1px solid #eef4f3;
          display: flex;
          justify-content: space-around;
          padding-top: 10px;
        }

        .info-strip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: -34px;
          position: relative;
          z-index: 5;
        }

        .trust-card {
          background: #ffffff;
          border: 1px solid rgba(16,24,40,0.08);
          border-radius: 18px;
          box-shadow: 0 16px 36px rgba(16,24,40,0.06);
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 14px;
          padding: 18px;
        }

        .trust-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #e7f7f5;
          color: #008f89;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .trust-card strong {
          display: block;
          margin-bottom: 5px;
        }

        .trust-card p {
          color: #667085;
          font-size: 13px;
          line-height: 1.45;
          margin: 0;
        }

        .section {
          padding: 58px 0;
        }

        .section h2 {
          color: #12313a;
          font-size: 28px;
          line-height: 1.15;
          margin: 0 0 28px;
          text-align: center;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .step {
          display: grid;
          gap: 10px;
          justify-items: center;
          text-align: center;
        }

        .step-number {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: #008f89;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .step strong {
          color: #12313a;
          font-size: 15px;
        }

        .step p {
          color: #667085;
          font-size: 12px;
          line-height: 1.45;
          margin: 0;
        }

        .audience-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .audience-card {
          min-height: 360px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(16,24,40,0.08);
          box-shadow: 0 18px 50px rgba(16,24,40,0.06);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 190px;
          gap: 18px;
          overflow: hidden;
          padding: 24px;
          position: relative;
        }

        .audience-card:nth-child(2) {
          background: #fffaf0;
        }

        .audience-card h3 {
          color: #12313a;
          font-size: 24px;
          margin: 0 0 6px;
        }

        .audience-card p {
          color: #667085;
          line-height: 1.55;
          margin: 0 0 14px;
        }

        .audience-card ul {
          display: grid;
          gap: 9px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .audience-card li {
          color: #334b54;
          display: flex;
          gap: 8px;
          font-size: 13px;
          line-height: 1.35;
        }

        .audience-card li span {
          color: #008f89;
          font-weight: 900;
        }

        .audience-visual {
          display: grid;
          align-items: end;
          justify-items: center;
          position: relative;
        }

        .mini-pet {
          position: absolute;
          bottom: 8px;
          right: 18px;
          width: 112px;
          height: 132px;
          border-radius: 80px 80px 24px 24px;
          background: linear-gradient(180deg, #f6d19b, #c98f52);
        }

        .pilot-cta {
          align-items: center;
          background: #fff8ed;
          border-radius: 24px;
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr) 210px;
          gap: 28px;
          min-height: 210px;
          overflow: hidden;
          padding: 28px;
        }

        .plant {
          width: 120px;
          height: 150px;
          justify-self: center;
          position: relative;
        }

        .plant::before {
          content: "";
          position: absolute;
          bottom: 0;
          left: 28px;
          width: 64px;
          height: 56px;
          border-radius: 0 0 18px 18px;
          background: #e8e0ce;
        }

        .plant::after {
          content: "";
          position: absolute;
          left: 48px;
          top: 10px;
          width: 24px;
          height: 102px;
          border-radius: 999px;
          background: #4f9d70;
          box-shadow: -34px 18px 0 #6eb886, 34px 12px 0 #5baa79, -12px -4px 0 #3f8b61, 18px -8px 0 #75bd8e;
          transform: rotate(-12deg);
        }

        .pilot-copy {
          text-align: center;
        }

        .pilot-copy h2 {
          margin: 0 0 8px;
          text-align: center;
        }

        .pilot-copy p {
          color: #667085;
          line-height: 1.55;
          margin: 0 auto 16px;
          max-width: 520px;
        }

        .pilot-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .footer {
          border-top: 1px solid rgba(16,24,40,0.08);
          display: grid;
          grid-template-columns: 1.2fr repeat(4, 1fr);
          gap: 24px;
          padding: 34px 0;
        }

        .footer h4 {
          color: #12313a;
          font-size: 12px;
          margin: 0 0 10px;
        }

        .footer a,
        .footer span {
          color: #667085;
          display: block;
          font-size: 12px;
          line-height: 1.9;
          text-decoration: none;
        }

        @media (max-width: 940px) {
          .top-nav {
            align-items: flex-start;
            flex-direction: column;
            padding: 16px 0;
          }

          .nav-items {
            gap: 12px;
            overflow-x: auto;
            width: 100%;
          }

          .hero,
          .info-strip,
          .audience-grid,
          .pilot-cta,
          .footer {
            grid-template-columns: 1fr;
          }

          .hero {
            min-height: auto;
            padding: 34px 0 58px;
          }

          .hero-visual {
            min-height: 510px;
          }

          .hero-mini-stats,
          .steps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .audience-card {
            grid-template-columns: 1fr;
          }

          .audience-visual {
            min-height: 260px;
          }

          .pilot-copy {
            order: -1;
          }
        }

        @media (max-width: 560px) {
          .hero-mini-stats,
          .steps {
            grid-template-columns: 1fr;
          }

          .hero-visual {
            min-height: 440px;
          }

          .phone-mock {
            width: 210px;
            min-height: 430px;
          }

          .brand-orbit,
          .cat-card {
            display: none;
          }

          .pet-portrait {
            right: 0;
            width: 160px;
            height: 210px;
          }
        }
      `}</style>

      <div className="landing-page">
        <nav className="top-nav" aria-label="Navegacion principal">
          <a className="brand-link" href="/">
            <img alt="" src={brandLogoPath} />
            <strong>Pet Ecosystem</strong>
          </a>
          <div className="nav-items">
            {navItems.map((item) => (
              <a href={item === "Inicio" ? "/" : `#${item.toLowerCase().replace(/\s+/g, "-")}`} key={item}>
                {item}
              </a>
            ))}
          </div>
          <a href="/app" style={primaryLinkStyle}>
            Conocer el piloto
          </a>
        </nav>

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">MVP controlado</span>
            <h1>
              Todo el cuidado de tu mascota en un solo <span>ecosistema</span>
            </h1>
            <p>
              Conectamos dueños de mascotas con proveedores confiables para reservar servicios, dar seguimiento a
              la atencion y mantener la informacion de cada mascota organizada.
            </p>
            <div className="hero-actions">
              <a href="/app" style={primaryLinkStyle}>
                Soy dueño de mascota
              </a>
              <a href="/app" style={secondaryLinkStyle}>
                Soy proveedor de servicios
              </a>
            </div>
            <div className="hero-mini-stats">
              <div className="hero-stat">
                <span>12</span>
                <strong>Proveedores aprobados</strong>
              </div>
              <div className="hero-stat">
                <span>24</span>
                <strong>Reservas trazadas</strong>
              </div>
              <div className="hero-stat">
                <span>QR</span>
                <strong>Check-in y check-out</strong>
              </div>
              <div className="hero-stat">
                <span>EV</span>
                <strong>Evidencia documental</strong>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="pet-shape" />
            <div className="brand-orbit">
              <img alt="" src={brandLogoPath} />
            </div>
            <PhoneMock />
            <div className="cat-card" />
            <div className="pet-portrait">
              <div className="pet-face">
                <span className="pet-nose" />
              </div>
            </div>
          </div>
        </section>

        <section className="info-strip" aria-label="Confianza del piloto">
          {trustCards.map((card) => (
            <article className="trust-card" key={card.title}>
              <span className="trust-card-icon">{card.icon}</span>
              <div>
                <strong>{card.title}</strong>
                <p>{card.copy}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="section" id="asi-funciona">
          <h2>Asi funciona</h2>
          <div className="steps">
            {flowSteps.map((step, index) => (
              <article className="step" key={step.title}>
                <span className="step-number">{index + 1}</span>
                <strong>{step.title}</strong>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="para-duenos">
          <div className="audience-grid">
            <article className="audience-card">
              <div>
                <h3>Para dueños de mascotas</h3>
                <p>Encuentra servicios confiables y da seguimiento completo al bienestar de tus mascotas.</p>
                <ul>
                  {ownerItems.map((item) => (
                    <FeatureCheck key={item}>{item}</FeatureCheck>
                  ))}
                </ul>
              </div>
              <div className="audience-visual" aria-hidden="true">
                <PhoneMock compact />
                <span className="mini-pet" />
              </div>
            </article>

            <article className="audience-card" id="para-proveedores">
              <div>
                <h3>Para proveedores de servicios</h3>
                <p>Gestiona tu negocio, recibe reservas y controla la operacion diaria desde una consola clara.</p>
                <ul>
                  {providerItems.map((item) => (
                    <FeatureCheck key={item}>{item}</FeatureCheck>
                  ))}
                </ul>
              </div>
              <div className="audience-visual" aria-hidden="true">
                <span className="mini-pet" />
                <PhoneMock compact />
              </div>
            </article>
          </div>
        </section>

        <section className="section" id="piloto">
          <div className="pilot-cta">
            <div className="plant" aria-hidden="true" />
            <div className="pilot-copy">
              <h2>Se parte del piloto inicial</h2>
              <p>
                Ayudanos a construir la mejor experiencia para el cuidado de las mascotas. Participa gratis por
                tiempo limitado y comparte tu feedback.
              </p>
              <div className="pilot-actions">
                <a href="/app" style={primaryLinkStyle}>
                  Quiero participar como dueño
                </a>
                <a href="/app" style={secondaryLinkStyle}>
                  Quiero registrarme como proveedor
                </a>
              </div>
            </div>
            <div className="pet-portrait" aria-hidden="true">
              <div className="pet-face">
                <span className="pet-nose" />
              </div>
            </div>
          </div>
        </section>

        <footer className="footer" id="contacto">
          <div>
            <a className="brand-link" href="/">
              <img alt="" src={brandLogoPath} />
              <strong>Pet Ecosystem</strong>
            </a>
            <span>Conectamos amor, cuidado y confianza.</span>
          </div>
          <div>
            <h4>Producto</h4>
            <a href="#para-duenos">Para dueños</a>
            <a href="#para-proveedores">Para proveedores</a>
            <a href="/app">Consola</a>
          </div>
          <div>
            <h4>Empresa</h4>
            <a href="#piloto">Piloto controlado</a>
            <a href="#asi-funciona">Como funciona</a>
            <a href="#contacto">Contacto</a>
          </div>
          <div>
            <h4>Piloto</h4>
            <span>Payment-ready</span>
            <span>Sin cobro real</span>
            <span>Proveedor aprobado</span>
          </div>
          <div>
            <h4>Contacto</h4>
            <span>hola@pet-ecosystem.com</span>
            <span>Panama</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
