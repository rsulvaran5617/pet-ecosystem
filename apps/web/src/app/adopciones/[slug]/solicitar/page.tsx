import type { Metadata } from "next";

import { PublicAdoptionRequestPage } from "../../../../features/foster/components/PublicAdoptionRequestPage";

export const metadata: Metadata = {
  title: "Solicitud inicial de adopcion | Pet Ecosystem",
  description: "Expresa tu interes en una mascota publicada por una Familia Protectora."
};

export default function AdoptionRequestRoute({ params }: { params: { slug: string } }) {
  return <PublicAdoptionRequestPage slug={params.slug} />;
}
