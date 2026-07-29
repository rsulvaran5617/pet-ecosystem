import type { Metadata } from "next";

const supportEmail = "hola@pet-ecosystem.com";

export const metadata: Metadata = {
  title: "Eliminar cuenta | Pet Ecosystem",
  description: "Solicitud publica para eliminar o anonimizar una cuenta de Pet Ecosystem."
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
  justifyContent: "center",
  minHeight: "42px",
  padding: "0 16px",
  textDecoration: "none"
};

const retainedItems = [
  "reservas y estados historicos",
  "mensajes asociados a reservas",
  "casos de soporte",
  "resenas publicadas",
  "eventos operativos, auditoria y trazabilidad"
];

const anonymizedItems = [
  "nombre y apellido del perfil",
  "correo visible dentro del perfil de la app",
  "telefono, avatar y preferencias de comunicacion",
  "direcciones guardadas",
  "metodos de pago guardados en modo piloto/payment-ready"
];

export default function AccountDeletionPage() {
  return (
    <main
      style={{
        background: "linear-gradient(180deg, #f8fbf8 0%, #f3eee2 100%)",
        color: "#12313a",
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        minHeight: "100vh"
      }}
    >
      <section
        style={{
          display: "grid",
          gap: 24,
          margin: "0 auto",
          maxWidth: 980,
          padding: "44px 18px 56px"
        }}
      >
        <nav
          aria-label="Navegacion"
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            gap: 14
          }}
        >
          <a href="/" style={{ color: "#12313a", fontSize: 14, fontWeight: 900, textDecoration: "none" }}>
            Pet Ecosystem
          </a>
          <a href="/" style={secondaryLinkStyle}>
            Volver al inicio
          </a>
        </nav>

        <header
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,143,137,0.18)",
            borderRadius: 20,
            boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
            display: "grid",
            gap: 16,
            padding: "34px 28px"
          }}
        >
          <span
            style={{
              color: "#007a6b",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase"
            }}
          >
            Cuenta y privacidad
          </span>
          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ color: "#102f3a", fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.02, margin: 0 }}>
              Solicitud de eliminacion de cuenta
            </h1>
            <p style={{ color: "#4b5c62", fontSize: 16, lineHeight: 1.65, margin: 0, maxWidth: 760 }}>
              Esta pagina permite a usuarios de Pet Ecosystem solicitar la eliminacion o anonimizacion de su cuenta y datos
              personales asociados. Tambien puedes iniciar el proceso desde la app mobile en Cuenta &gt; Eliminar cuenta.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href={`mailto:${supportEmail}?subject=Solicitud%20de%20eliminacion%20de%20cuenta%20Pet%20Ecosystem&body=Hola%20Pet%20Ecosystem%2C%0A%0ASolicito%20la%20eliminacion%20de%20mi%20cuenta.%0A%0ACorreo%20registrado%3A%20%0ANombre%20de%20usuario%20o%20referencia%3A%20%0AMotivo%20opcional%3A%20%0A%0AEntiendo%20que%20algunos%20datos%20transaccionales%20pueden%20conservarse%20por%20operacion%2C%20soporte%20o%20auditoria.%0A`}
              style={primaryLinkStyle}
            >
              Solicitar por correo
            </a>
            <a href="/app" style={secondaryLinkStyle}>
              Abrir la app web
            </a>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
          }}
        >
          <article style={cardStyle}>
            <h2 style={sectionTitleStyle}>Como solicitarlo</h2>
            <ol style={listStyle}>
              <li>Desde la app mobile, inicia sesion y entra en Cuenta.</li>
              <li>Abre Eliminar cuenta y escribe ELIMINAR para confirmar.</li>
              <li>Si no tienes acceso a la app, usa el boton Solicitar por correo en esta pagina.</li>
              <li>Incluye el correo registrado para ubicar la cuenta.</li>
            </ol>
          </article>

          <article style={cardStyle}>
            <h2 style={sectionTitleStyle}>Plazo estimado</h2>
            <p style={paragraphStyle}>
              Las solicitudes recibidas por correo se revisan normalmente dentro de 7 dias calendario. Si se necesita
              validar identidad o informacion adicional, soporte respondera al correo indicado.
            </p>
          </article>
        </section>

        <section
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))"
          }}
        >
          <article style={cardStyle}>
            <h2 style={sectionTitleStyle}>Datos personales que se anonimizan</h2>
            <ul style={listStyle}>
              {anonymizedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article style={cardStyle}>
            <h2 style={sectionTitleStyle}>Datos que pueden conservarse</h2>
            <p style={paragraphStyle}>
              Algunos registros se conservan cuando son necesarios para operacion, soporte, seguridad, prevencion de fraude,
              cumplimiento o auditoria.
            </p>
            <ul style={listStyle}>
              {retainedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section style={{ ...cardStyle, borderColor: "rgba(217,119,6,0.28)", background: "rgba(255,251,235,0.82)" }}>
          <h2 style={sectionTitleStyle}>Notas importantes</h2>
          <p style={paragraphStyle}>
            La eliminacion de cuenta no cancela automaticamente obligaciones operativas en curso ni elimina datos requeridos
            para soporte, historial de reservas, seguridad o auditoria. Si tienes una reserva activa, un caso de soporte
            abierto o una solicitud pendiente, indicalo en el correo para revisar el caso de forma ordenada.
          </p>
        </section>
      </section>
    </main>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(0,143,137,0.16)",
  borderRadius: 18,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
  display: "grid",
  gap: 12,
  padding: 22
};

const sectionTitleStyle = {
  color: "#102f3a",
  fontSize: 20,
  lineHeight: 1.2,
  margin: 0
};

const paragraphStyle = {
  color: "#4b5c62",
  fontSize: 14,
  lineHeight: 1.65,
  margin: 0
};

const listStyle = {
  color: "#4b5c62",
  display: "grid",
  fontSize: 14,
  gap: 8,
  lineHeight: 1.55,
  margin: 0,
  paddingLeft: 20
};
