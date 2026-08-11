import type { Metadata } from "next";

import { HelpCenterPage } from "../../features/help/components/HelpCenterPage";

export const metadata: Metadata = {
  title: "Centro de ayuda | Pet Ecosystem",
  description: "Manual publico de usuario para propietarios, proveedores, familias protectoras, adoptantes y soporte."
};

export default function HelpPage() {
  return <HelpCenterPage />;
}
