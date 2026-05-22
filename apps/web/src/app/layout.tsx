import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pet Ecosystem",
  description: "Ecosistema digital para cuidado de mascotas, proveedores pet y marketplace de servicios."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          background: "linear-gradient(180deg, #f7f2e7 0%, #efe5d0 100%)",
          color: "#1c1917"
        }}
      >
        {children}
      </body>
    </html>
  );
}
