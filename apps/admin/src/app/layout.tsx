import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pet Ecosystem Admin",
  description: "Backoffice base del MVP del ecosistema pet."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "linear-gradient(180deg, #f4f4ef 0%, #dedbcc 100%)",
          color: "#18181b"
        }}
      >
        {children}
      </body>
    </html>
  );
}
