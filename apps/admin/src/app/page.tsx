export default function AdminPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px"
      }}
    >
      <section
        style={{
          width: "min(720px, 100%)",
          border: "1px solid rgba(24, 24, 27, 0.16)",
          background: "rgba(255, 255, 255, 0.82)",
          padding: "32px",
          borderRadius: "20px"
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#1d4ed8"
          }}
        >
          Admin Surface
        </p>
        <h1 style={{ fontSize: "36px", marginBottom: "12px" }}>Admin MVP Bootstrap</h1>
        <p style={{ margin: 0, fontSize: "18px", lineHeight: 1.6, color: "#3f3f46" }}>
          Shell técnico inicial para aprobaciones, soporte básico y trazabilidad administrativa.
        </p>
      </section>
    </main>
  );
}
