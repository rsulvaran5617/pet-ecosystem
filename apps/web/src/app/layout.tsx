import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pet Ecosystem",
  description: "Ecosistema digital para cuidado de mascotas, proveedores pet y marketplace de servicios.",
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
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
