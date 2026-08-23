import { PublicCommunitySightingsPage } from "../../../../features/pet-alert/components/PublicCommunitySightingsPage";

export const metadata = { title: "Mascota aparentemente perdida | PET ALERT" };

export default function CommunitySightingPage({ params }: { params: { slug: string } }) { return <PublicCommunitySightingsPage slug={params.slug} />; }
