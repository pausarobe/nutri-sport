import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { normalizeNutritionistProfile } from "@/lib/nutritionist-profile";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const userEmail = data.claims.email as string | undefined;
  const { data: profileData } = await supabase
    .from("nutritionist_profiles")
    .select("*")
    .maybeSingle();
  const profile = normalizeNutritionistProfile(profileData, userEmail);

  return (
    <AppShell
      userEmail={userEmail}
      displayName={profile.displayName}
      clinicName={profile.clinicName}
    >
      {children}
    </AppShell>
  );
}
