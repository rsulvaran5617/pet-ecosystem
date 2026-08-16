import type { Metadata } from "next";

import { PublicProtectiveLandingPage } from "../../../features/foster/components/PublicProtectiveLandingPage";

export const metadata: Metadata = {
  title: "Familia Protectora | Pet Ecosystem",
  description: "Landing publica de una Familia Protectora aprobada en Pet Ecosystem.",
  openGraph: {
    title: "Familia Protectora | Pet Ecosystem",
    description: "Conoce mascotas en adopcion y el perfil publico de una Familia Protectora aprobada.",
    siteName: "Pet Ecosystem",
    type: "website"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function ProtectiveLandingRoute({ params }: { params: { slug: string } }) {
  return <PublicProtectiveLandingPage slug={params.slug} />;
}
