import type { Metadata } from "next";

import { PublicAdoptionInvitePage } from "../../../features/foster/components/PublicAdoptionInvitePage";

export const metadata: Metadata = {
  description: "Continua de forma segura tu proceso responsable de adopcion en Pet Ecosystem.",
  title: "Invitacion de adopcion | Pet Ecosystem"
};

export default function AdoptionInvitePage({ params }: { params: { token: string } }) {
  return <PublicAdoptionInvitePage token={params.token} />;
}
