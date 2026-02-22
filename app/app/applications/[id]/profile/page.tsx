import { AppStepper } from "@/components/app-stepper";
import { ProfileReview } from "@/components/features/profile-review";
import { getApplicationProfile } from "@/lib/server-data";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profileDoc = await getApplicationProfile(id);

  return (
    <div className="space-y-4">
      <AppStepper current={3} />
      <ProfileReview applicationId={id} initialProfile={profileDoc?.profile ?? null} />
    </div>
  );
}
