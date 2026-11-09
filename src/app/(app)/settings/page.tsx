import {
  Info,
  Clock3,
  IdCard,
  Settings2,
  Stethoscope,
} from "lucide-react";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { normalizeNutritionistProfile } from "@/lib/nutritionist-profile";
import { createClient } from "@/lib/supabase/server";
import { saveNutritionistProfile } from "./actions";

type SettingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    message?: string;
  }>;
};

const inputClass = "clinical-input";
const labelClass = "clinical-label";

function SectionHeading({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: typeof IdCard;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f3ff] text-emerald-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const [claimsResult, profileResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("nutritionist_profiles").select("*").maybeSingle(),
  ]);
  const loginEmail = claimsResult.data?.claims?.email as string | undefined;
  const profile = normalizeNutritionistProfile(profileResult.data, loginEmail);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes de la consulta"
        description="Configura la identidad profesional y las preferencias que se aplican a tu espacio de trabajo."
      />

      <Notice
        error={
          query?.error ??
          (profileResult.error
            ? "No se ha podido cargar el perfil. Comprueba que la migración de Supabase esté aplicada."
            : undefined)
        }
        success={query?.success}
        message={query?.message}
      />

      {!profile.isConfigured && !profileResult.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
          <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Completa el nombre profesional para dejar de utilizar el identificador
            derivado del email en el dashboard.
          </span>
        </div>
      ) : null}

      <form action={saveNutritionistProfile} className="space-y-5">
        <section className="clinical-card overflow-hidden">
          <SectionHeading
            title="Identidad profesional"
            description="Estos datos identifican al nutricionista y a su consulta."
            Icon={IdCard}
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <label className="space-y-1.5">
              <span className={labelClass}>Nombre profesional</span>
              <input
                name="display_name"
                required
                defaultValue={profileResult.data?.display_name ?? ""}
                placeholder={profile.displayName || "Nombre y apellidos"}
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Nombre de la consulta</span>
              <input
                name="clinic_name"
                defaultValue={profileResult.data?.clinic_name ?? ""}
                placeholder={`Consulta de ${profile.displayName}`}
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Titulación o especialidad</span>
              <input
                name="professional_title"
                defaultValue={profileResult.data?.professional_title ?? ""}
                placeholder="Dietista-nutricionista deportivo"
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Número de colegiado</span>
              <input
                name="license_number"
                defaultValue={profile.licenseNumber}
                placeholder="Opcional"
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="clinical-card overflow-hidden">
          <SectionHeading
            title="Contacto profesional"
            description="Información preparada para futuros informes y comunicaciones."
            Icon={Stethoscope}
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <label className="space-y-1.5">
              <span className={labelClass}>Email profesional</span>
              <input
                name="professional_email"
                type="email"
                defaultValue={profile.professionalEmail}
                placeholder={loginEmail ?? "tu@email.com"}
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Teléfono</span>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone}
                placeholder="Teléfono profesional"
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className={labelClass}>Dirección</span>
              <input
                name="address"
                defaultValue={profile.address}
                placeholder="Dirección de la consulta"
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="clinical-card overflow-hidden">
          <SectionHeading
            title="Agenda y seguimiento"
            description="Preferencias utilizadas en citas, calendario y avisos del dashboard."
            Icon={Clock3}
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            <label className="space-y-1.5">
              <span className={labelClass}>Zona horaria</span>
              <input
                name="time_zone"
                required
                list="time-zones"
                defaultValue={profile.timeZone}
                className={inputClass}
              />
              <datalist id="time-zones">
                <option value="Europe/Madrid" />
                <option value="Atlantic/Canary" />
                <option value="Europe/Lisbon" />
                <option value="UTC" />
                <option value="America/Bogota" />
                <option value="America/Mexico_City" />
                <option value="America/Argentina/Buenos_Aires" />
              </datalist>
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Idioma y formato</span>
              <select
                name="locale"
                defaultValue={profile.locale}
                className={inputClass}
              >
                <option value="es-ES">Español</option>
                <option value="ca-ES">Català</option>
                <option value="en-GB">English</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Seguimiento atrasado</span>
              <div className="relative">
                <input
                  name="follow_up_days"
                  type="number"
                  min={7}
                  max={365}
                  required
                  defaultValue={profile.followUpDays}
                  className={`${inputClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  días
                </span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Inicio de agenda</span>
              <input
                name="agenda_start_time"
                type="time"
                required
                defaultValue={profile.agendaStartTime}
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Fin de agenda</span>
              <input
                name="agenda_end_time"
                type="time"
                required
                defaultValue={profile.agendaEndTime}
                className={inputClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelClass}>Duración predeterminada</span>
              <div className="relative">
                <input
                  name="default_appointment_duration"
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  required
                  defaultValue={profile.defaultAppointmentDuration}
                  className={`${inputClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  min
                </span>
              </div>
            </label>
            <label className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <span className={labelClass}>Tipos de cita</span>
              <textarea
                name="appointment_types"
                rows={5}
                required
                defaultValue={profile.appointmentTypes.join("\n")}
                className={`${inputClass} min-h-32 py-3`}
              />
              <span className="block text-xs text-slate-400">
                Escribe un tipo por línea. El primero se utilizará como opción
                predeterminada.
              </span>
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <SubmitButton
            className="clinical-button-primary min-w-44"
            pendingLabel="Guardando..."
            icon="save"
          >
            Guardar ajustes
          </SubmitButton>
        </div>
      </form>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        <Settings2
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
          aria-hidden="true"
        />
        El logo, avatar y firma podrán añadirse cuando se active la
        personalización de informes.
      </div>
    </div>
  );
}
