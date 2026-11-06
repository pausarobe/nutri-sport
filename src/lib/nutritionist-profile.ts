import type { NutritionistProfile } from "@/lib/database.types";

export const DEFAULT_APPOINTMENT_TYPES = [
  "Revisión mensual",
  "Antropometría",
  "Primera visita",
  "Consulta",
  "Seguimiento",
];

export const DEFAULT_TIME_ZONE = "Europe/Madrid";
export const DEFAULT_LOCALE = "es-ES";
export const DEFAULT_AGENDA_START_TIME = "07:00";
export const DEFAULT_AGENDA_END_TIME = "22:00";
export const DEFAULT_APPOINTMENT_DURATION = 60;
export const DEFAULT_FOLLOW_UP_DAYS = 45;

export type NutritionistProfileView = {
  displayName: string;
  clinicName: string;
  professionalTitle: string;
  licenseNumber: string;
  professionalEmail: string;
  phone: string;
  address: string;
  timeZone: string;
  locale: string;
  agendaStartTime: string;
  agendaEndTime: string;
  defaultAppointmentDuration: number;
  appointmentTypes: string[];
  followUpDays: number;
  isConfigured: boolean;
};

function emailDisplayName(email?: string) {
  const account = email?.split("@")[0]?.trim();
  if (!account) return "Nutricionista";

  return account
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function safeTimeZone(value: string | null | undefined) {
  const candidate = value?.trim() || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function safeLocale(value: string | null | undefined) {
  const candidate = value?.trim() || DEFAULT_LOCALE;
  try {
    new Intl.DateTimeFormat(candidate).format();
    return candidate;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function safeTime(value: string | null | undefined, fallback: string) {
  const candidate = value?.slice(0, 5) ?? "";
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
}

function boundedInteger(
  value: number | null | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

export function normalizeNutritionistProfile(
  profile: NutritionistProfile | null | undefined,
  loginEmail?: string,
): NutritionistProfileView {
  const displayName = profile?.display_name?.trim() || emailDisplayName(loginEmail);
  const agendaStartTime = safeTime(
    profile?.agenda_start_time,
    DEFAULT_AGENDA_START_TIME,
  );
  const proposedAgendaEndTime = safeTime(
    profile?.agenda_end_time,
    DEFAULT_AGENDA_END_TIME,
  );
  const agendaEndTime =
    proposedAgendaEndTime > agendaStartTime
      ? proposedAgendaEndTime
      : DEFAULT_AGENDA_END_TIME;
  const appointmentTypes = Array.from(
    new Set(
      (profile?.appointment_types ?? DEFAULT_APPOINTMENT_TYPES)
        .map((type) => type.trim())
        .filter(Boolean),
    ),
  );

  return {
    displayName,
    clinicName: profile?.clinic_name?.trim() || `Consulta de ${displayName}`,
    professionalTitle:
      profile?.professional_title?.trim() || "Nutricionista",
    licenseNumber: profile?.license_number?.trim() || "",
    professionalEmail:
      profile?.professional_email?.trim() || loginEmail?.trim() || "",
    phone: profile?.phone?.trim() || "",
    address: profile?.address?.trim() || "",
    timeZone: safeTimeZone(profile?.time_zone),
    locale: safeLocale(profile?.locale),
    agendaStartTime,
    agendaEndTime,
    defaultAppointmentDuration: boundedInteger(
      profile?.default_appointment_duration,
      DEFAULT_APPOINTMENT_DURATION,
      15,
      480,
    ),
    appointmentTypes: appointmentTypes.length
      ? appointmentTypes
      : [...DEFAULT_APPOINTMENT_TYPES],
    followUpDays: boundedInteger(
      profile?.follow_up_days,
      DEFAULT_FOLLOW_UP_DAYS,
      7,
      365,
    ),
    isConfigured: Boolean(profile?.display_name?.trim()),
  };
}

export function profileInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1
    ? `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`
    : name.slice(0, 2)
  ).toUpperCase();
}

export function isoDateInTimeZone(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
