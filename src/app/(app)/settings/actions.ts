"use server";

import { revalidatePath } from "next/cache";
import {
  formString,
  getAuthedSupabase,
  optionalFormNumber,
  optionalFormString,
  redirectWithMessage,
} from "@/lib/form";
import {
  DEFAULT_APPOINTMENT_DURATION,
  DEFAULT_FOLLOW_UP_DAYS,
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
} from "@/lib/nutritionist-profile";

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(value: string) {
  try {
    new Intl.DateTimeFormat(value).format();
    return true;
  } catch {
    return false;
  }
}

function settingsError(message: string): never {
  redirectWithMessage("/settings", "error", message);
}

export async function saveNutritionistProfile(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const displayName = formString(formData, "display_name");
  const timeZone = formString(formData, "time_zone") || DEFAULT_TIME_ZONE;
  const locale = formString(formData, "locale") || DEFAULT_LOCALE;
  const agendaStartTime = formString(formData, "agenda_start_time");
  const agendaEndTime = formString(formData, "agenda_end_time");
  const defaultAppointmentDuration = Math.round(
    optionalFormNumber(formData, "default_appointment_duration") ??
      DEFAULT_APPOINTMENT_DURATION,
  );
  const followUpDays = Math.round(
    optionalFormNumber(formData, "follow_up_days") ?? DEFAULT_FOLLOW_UP_DAYS,
  );
  const appointmentTypes = Array.from(
    new Set(
      formString(formData, "appointment_types")
        .split(/\r?\n|,/)
        .map((type) => type.trim())
        .filter(Boolean),
    ),
  );

  if (!displayName) settingsError("El nombre profesional es obligatorio.");
  if (!isValidTimeZone(timeZone)) {
    settingsError("Introduce una zona horaria válida, por ejemplo Europe/Madrid.");
  }
  if (!isValidLocale(locale)) settingsError("Selecciona un idioma válido.");
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(agendaStartTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(agendaEndTime) ||
    agendaEndTime <= agendaStartTime
  ) {
    settingsError("La hora de fin debe ser posterior a la hora de inicio.");
  }
  if (
    defaultAppointmentDuration < 15 ||
    defaultAppointmentDuration > 480
  ) {
    settingsError("La duración predeterminada debe estar entre 15 y 480 minutos.");
  }
  if (followUpDays < 7 || followUpDays > 365) {
    settingsError("El plazo de seguimiento debe estar entre 7 y 365 días.");
  }
  if (!appointmentTypes.length) {
    settingsError("Añade al menos un tipo de cita.");
  }
  if (appointmentTypes.length > 20) {
    settingsError("Puedes configurar un máximo de 20 tipos de cita.");
  }

  const { error } = await supabase.from("nutritionist_profiles").upsert(
    {
      user_id: userId,
      display_name: displayName,
      clinic_name: optionalFormString(formData, "clinic_name"),
      professional_title: optionalFormString(formData, "professional_title"),
      license_number: optionalFormString(formData, "license_number"),
      professional_email: optionalFormString(formData, "professional_email"),
      phone: optionalFormString(formData, "phone"),
      address: optionalFormString(formData, "address"),
      time_zone: timeZone,
      locale,
      agenda_start_time: agendaStartTime,
      agenda_end_time: agendaEndTime,
      default_appointment_duration: defaultAppointmentDuration,
      appointment_types: appointmentTypes,
      follow_up_days: followUpDays,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    settingsError(
      error.message.includes("schema cache")
        ? "Falta aplicar la migración del perfil profesional en Supabase."
        : error.message,
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  redirectWithMessage(
    "/settings",
    "success",
    "Perfil profesional actualizado.",
  );
}
