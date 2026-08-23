import type { Metadata } from "next";

import { PublicLostPetAlertPage } from "../../../../features/pet-alert/components/PublicLostPetAlertPage";

export const metadata: Metadata = {
  description: "Alerta publica controlada para ayudar a encontrar una mascota extraviada.",
  title: "PET ALERT | Pet Ecosystem"
};

export default function LostPetAlertRoute({ params }: { params: { slug: string } }) {
  return <PublicLostPetAlertPage slug={params.slug} />;
}
