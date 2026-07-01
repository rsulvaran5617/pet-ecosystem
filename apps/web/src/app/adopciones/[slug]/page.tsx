import { PublicPetAdoptionPage } from "../../../features/foster/components/PublicPetAdoptionPage";

export default function AdoptionPage({ params }: { params: { slug: string } }) {
  return <PublicPetAdoptionPage slug={params.slug} />;
}
