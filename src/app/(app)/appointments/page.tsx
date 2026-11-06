import {
  AppointmentsWorkspace,
  type AgendaAppointment,
} from "@/components/appointments-workspace";
import { PageHeader } from "@/components/page-header";
import {
  isoDateInTimeZone,
  normalizeNutritionistProfile,
} from "@/lib/nutritionist-profile";
import { createClient } from "@/lib/supabase/server";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: profileData } = await supabase
    .from("nutritionist_profiles")
    .select("*")
    .maybeSingle();
  const profile = normalizeNutritionistProfile(profileData);
  const today = isoDateInTimeZone(profile.timeZone);

  const { data, error } = await supabase
    .from("client_appointments")
    .select(
      "id,client_id,scheduled_date,scheduled_time,duration_minutes,appointment_type,notes,status,clients(id,name)",
    )
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Citas"
        description="Consulta la agenda diaria, las próximas semanas y el historial completo."
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se han podido cargar las citas: {error.message}
        </div>
      ) : null}

      <AppointmentsWorkspace
        appointments={(data ?? []) as AgendaAppointment[]}
        today={today}
        agendaStartTime={profile.agendaStartTime}
        agendaEndTime={profile.agendaEndTime}
        locale={profile.locale}
      />
    </div>
  );
}
