import type { Metadata } from "next";

import { PublicClinicalAccessPage } from "../../../features/clinical-access/components/PublicClinicalAccessPage";

export const metadata: Metadata = {
  title: "Expediente temporal | Pet Ecosystem",
  description: "Consulta temporal y autorizada del expediente de una mascota.",
  robots: { index: false, follow: false, noarchive: true }
};

export default function ClinicalAccessRoute({ params }: { params: { token: string } }) {
  return <PublicClinicalAccessPage token={params.token} />;
}
