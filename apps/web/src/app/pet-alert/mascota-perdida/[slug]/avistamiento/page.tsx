import type { Metadata } from "next";

import { PublicLostPetSightingPage } from "../../../../../features/pet-alert/components/PublicLostPetSightingPage";

export const metadata: Metadata = {
  description: "Envia informacion segura sobre una mascota extraviada.",
  title: "Reportar avistamiento | PET ALERT"
};

export default function LostPetSightingRoute({ params }: { params: { slug: string } }) {
  return <PublicLostPetSightingPage slug={params.slug} />;
}
