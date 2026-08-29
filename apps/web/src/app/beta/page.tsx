import type { Metadata } from "next";
import { BetaAccessPage } from "../../features/beta/components/BetaAccessPage";
import { isBetaPlatform, readBetaTrackingParams } from "../../features/beta/lib/beta-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prueba la beta | Pet Ecosystem",
  description: "Acceso privado a la beta de Pet Ecosystem para Android, iPhone y Web.",
  robots: { index: false, follow: false }
};

interface BetaPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function BetaPage({ searchParams }: BetaPageProps) {
  const unavailableValue = searchParams.unavailable;
  const unavailable = Array.isArray(unavailableValue) ? unavailableValue[0] : unavailableValue;

  return (
    <BetaAccessPage
      trackingParams={readBetaTrackingParams(searchParams)}
      unavailablePlatform={unavailable && isBetaPlatform(unavailable) ? unavailable : undefined}
    />
  );
}
