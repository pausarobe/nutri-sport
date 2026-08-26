"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateMedian,
  formatAnthroNumber,
  GIRTH_FIELDS,
  hasAllMeasurements,
  DIAMETER_FIELDS,
  SKINFOLD_FIELDS,
} from "@/lib/anthropometry";
import {
  calculateEnergyPlan,
  DEFAULT_ENERGY_SETTINGS,
  DEFAULT_MEAL_DISTRIBUTION,
  normalizeThermalEffect,
  type EnergySettings,
  type ExerciseSession,
} from "@/lib/nutrition-plan";
import {
  formString,
  getAuthedSupabase,
  optionalFormNumber,
  optionalFormString,
  redirectWithMessage,
} from "@/lib/form";
import type { ActivityLevel, ClientSex } from "@/lib/database.types";

const FILE_BUCKET = "client-files";
const clientTabPath = (clientId: string, tab: string) =>
  `/clients/${clientId}?tab=${tab}`;
const CLIENT_SEX_VALUES = [
  "female",
  "male",
  "non_binary",
  "prefer_not_to_say",
] satisfies ClientSex[];
const ACTIVITY_LEVEL_VALUES = [
  "sedentary",
  "light",
  "moderate",
  "high",
  "very_high",
] satisfies ActivityLevel[];

function optionalClientSex(formData: FormData, key = "sex") {
  const value = optionalFormString(formData, key);
  return CLIENT_SEX_VALUES.includes(value as ClientSex)
    ? (value as ClientSex)
    : null;
}

function optionalActivityLevel(formData: FormData) {
  const value = optionalFormString(formData, "activity_level");
  return ACTIVITY_LEVEL_VALUES.includes(value as ActivityLevel)
    ? (value as ActivityLevel)
    : null;
}

function noteType(formData: FormData) {
  return formString(formData, "note_type") === "supplement"
    ? "supplement"
    : "normal";
}

function clientPayload(formData: FormData) {
  return {
    name: formString(formData, "name"),
    email: optionalFormString(formData, "email"),
    phone: optionalFormString(formData, "phone"),
    sex: optionalClientSex(formData),
    birth_date: optionalFormString(formData, "birth_date"),
    height_cm: optionalFormNumber(formData, "height_cm"),
    weight_kg: optionalFormNumber(formData, "weight_kg"),
    sport: optionalFormString(formData, "sport"),
    activity_level: optionalActivityLevel(formData),
    goal: optionalFormString(formData, "goal"),
    allergies: optionalFormString(formData, "allergies"),
    notes: optionalFormString(formData, "notes"),
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function positiveFormNumber(formData: FormData, key: string) {
  const value = optionalFormNumber(formData, key);
  return value && value > 0 ? value : null;
}

function nonNegativeFormNumber(formData: FormData, key: string) {
  const value = optionalFormNumber(formData, key);
  return value !== null && value >= 0 ? value : null;
}

function positiveNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function measurementGroup(
  formData: FormData,
  prefix: string,
  fields: typeof SKINFOLD_FIELDS,
) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = calculateMedian([
        optionalFormNumber(formData, `${prefix}_${field.key}_1`),
        optionalFormNumber(formData, `${prefix}_${field.key}_2`),
        optionalFormNumber(formData, `${prefix}_${field.key}_3`),
      ]);

      return [field.key, formatAnthroNumber(value)];
    }),
  );
}

function energySettingsPayload(formData: FormData): EnergySettings {
  const method =
    formString(formData, "energy_method") === "harris"
      ? "harris"
      : "cunningham";
  const rawSessions = formString(formData, "exercise_sessions");
  let exerciseSessions: ExerciseSession[] =
    DEFAULT_ENERGY_SETTINGS.exerciseSessions;

  try {
    const parsed = JSON.parse(rawSessions);

    if (Array.isArray(parsed)) {
      const sessions = parsed.map((row) => ({
        mets: positiveNumber(row?.mets),
        durationMin: positiveNumber(row?.durationMin),
        daysPerWeek: positiveNumber(row?.daysPerWeek),
      }));

      if (sessions.length) exerciseSessions = sessions;
    }
  } catch {
    exerciseSessions = DEFAULT_ENERGY_SETTINGS.exerciseSessions;
  }

  return {
    method,
    leanMassKg: positiveFormNumber(formData, "lean_mass_kg"),
    activityFactor:
      positiveFormNumber(formData, "activity_factor") ??
      DEFAULT_ENERGY_SETTINGS.activityFactor,
    thermalEffect: normalizeThermalEffect(
      positiveFormNumber(formData, "thermal_effect"),
    ),
    exerciseSessions,
    calorieTarget: positiveFormNumber(formData, "calorie_target"),
    proteinPct:
      nonNegativeFormNumber(formData, "protein_pct") ??
      DEFAULT_ENERGY_SETTINGS.proteinPct,
    carbsPct:
      nonNegativeFormNumber(formData, "carbs_pct") ??
      DEFAULT_ENERGY_SETTINGS.carbsPct,
    fatPct:
      nonNegativeFormNumber(formData, "fat_pct") ??
      DEFAULT_ENERGY_SETTINGS.fatPct,
  };
}

function mealDistributionPayload(formData: FormData) {
  return DEFAULT_MEAL_DISTRIBUTION.map((meal, index) => ({
    name: formString(formData, `meal_${index}_name`) || meal.name,
    pct: optionalFormNumber(formData, `meal_${index}_pct`) ?? meal.pct,
  }));
}

function databaseSetupMessage(message: string | undefined) {
  if (message?.includes("schema cache")) {
    return "Falta aplicar la migracion de Supabase con las tablas nuevas. Ejecuta el SQL de supabase/migrations/20260811_add_client_detail_sections.sql.";
  }

  return message ?? "No se pudo guardar.";
}

async function syncClientCurrentWeight(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"],
  clientId: string,
) {
  const { data } = await supabase
    .from("client_weight_logs")
    .select("weight_kg")
    .eq("client_id", clientId)
    .order("measured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("clients")
    .update({ weight_kg: data?.weight_kg ?? null })
    .eq("id", clientId);
}

export async function createNutritionClient(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const payload = clientPayload(formData);

  if (!payload.name) {
    redirectWithMessage("/clients/new", "error", "Client name is required.");
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();

  if (error || !client) {
    redirectWithMessage(
      "/clients/new",
      "error",
      error?.message ?? "Could not create client.",
    );
  }

  await supabase
    .from("plans")
    .insert({ user_id: userId, client_id: client.id, content: "" });

  if (payload.weight_kg) {
    await supabase.from("client_weight_logs").insert({
      user_id: userId,
      client_id: client.id,
      measured_at: todayIsoDate(),
      weight_kg: payload.weight_kg,
    });
  }

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateNutritionClient(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const payload = clientPayload(formData);

  if (!clientId) redirect("/clients");

  if (!payload.name) {
    redirectWithMessage(
      `/clients/${clientId}/edit`,
      "error",
      "Client name is required.",
    );
  }

  const { data: previousClient } = await supabase
    .from("clients")
    .select("weight_kg")
    .eq("id", clientId)
    .maybeSingle();
  const { error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", clientId);

  if (error) {
    redirectWithMessage(`/clients/${clientId}/edit`, "error", error.message);
  }

  if (
    payload.weight_kg &&
    Math.abs(payload.weight_kg - Number(previousClient?.weight_kg ?? 0)) > 0.01
  ) {
    await supabase.from("client_weight_logs").insert({
      user_id: userId,
      client_id: clientId,
      measured_at: todayIsoDate(),
      weight_kg: payload.weight_kg,
    });
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "ficha"),
    "success",
    "Client updated.",
  );
}

export async function deleteNutritionClient(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");

  if (!clientId) redirect("/clients");

  const { data: files } = await supabase
    .from("client_files")
    .select("path")
    .eq("client_id", clientId);

  const paths = files?.map((file) => file.path) ?? [];
  if (paths.length > 0) {
    await supabase.storage.from(FILE_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "danger"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  revalidatePath("/clients");
  redirectWithMessage("/clients", "success", "Client deleted.");
}

export async function savePlan(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const content = formString(formData, "content");
  const settings = energySettingsPayload(formData);
  const macroTotal = settings.proteinPct + settings.carbsPct + settings.fatPct;

  if (!clientId) redirect("/clients");

  if (Math.abs(macroTotal - 100) > 1) {
    redirectWithMessage(
      clientTabPath(clientId, "plan"),
      "error",
      "La suma de macronutrientes debe ser 100%.",
    );
  }

  const [clientMetricsResult, latestWeightResult] = await Promise.all([
    supabase
      .from("clients")
      .select("weight_kg,updated_at")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("client_weight_logs")
      .select("weight_kg,created_at")
      .eq("client_id", clientId)
      .order("measured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const clientWeight = positiveNumber(clientMetricsResult.data?.weight_kg);
  const loggedWeight = positiveNumber(latestWeightResult.data?.weight_kg);
  const clientWeightUpdatedAt = clientMetricsResult.data?.updated_at
    ? new Date(clientMetricsResult.data.updated_at).getTime()
    : 0;
  const loggedWeightCreatedAt = latestWeightResult.data?.created_at
    ? new Date(latestWeightResult.data.created_at).getTime()
    : 0;
  const currentWeightKg =
    clientWeight && loggedWeight
      ? clientWeightUpdatedAt >= loggedWeightCreatedAt
        ? clientWeight
        : loggedWeight
      : (clientWeight ??
        loggedWeight ??
        positiveFormNumber(formData, "reference_weight_kg"));
  const energy = calculateEnergyPlan({
    settings,
    weightKg: currentWeightKg,
    heightCm: positiveFormNumber(formData, "reference_height_cm"),
    age: positiveFormNumber(formData, "reference_age"),
    sex: optionalClientSex(formData, "reference_sex"),
  });

  const { error } = await supabase.from("plans").upsert(
    {
      user_id: userId,
      client_id: clientId,
      content,
      calories: energy.calories,
      protein_g: energy.proteinG,
      carbs_g: energy.carbsG,
      fat_g: energy.fatG,
      energy_settings: settings,
      meal_distribution: mealDistributionPayload(formData),
    },
    { onConflict: "client_id" },
  );

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "plan"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "plan"),
    "success",
    "Plan saved.",
  );
}

export async function addClientWeight(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const measuredAt =
    optionalFormString(formData, "measured_at") ?? todayIsoDate();
  const weightKg = positiveFormNumber(formData, "weight_kg");

  if (!clientId) redirect("/clients");

  if (!weightKg) {
    redirectWithMessage(
      clientTabPath(clientId, "peso"),
      "error",
      "Introduce un peso valido.",
    );
  }

  const { error } = await supabase.from("client_weight_logs").insert({
    user_id: userId,
    client_id: clientId,
    measured_at: measuredAt,
    weight_kg: weightKg,
  });

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "peso"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  await syncClientCurrentWeight(supabase, clientId);

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "peso"),
    "success",
    "Peso registrado.",
  );
}

export async function updateClientWeight(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const weightId = formString(formData, "weight_id");
  const measuredAt = optionalFormString(formData, "measured_at");
  const weightKg = positiveFormNumber(formData, "weight_kg");

  if (!clientId || !weightId) redirect("/clients");

  if (!measuredAt || !weightKg) {
    redirectWithMessage(
      clientTabPath(clientId, "peso"),
      "error",
      "Completa fecha y peso.",
    );
  }

  const { error } = await supabase
    .from("client_weight_logs")
    .update({ measured_at: measuredAt, weight_kg: weightKg })
    .eq("id", weightId)
    .eq("client_id", clientId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "peso"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  await syncClientCurrentWeight(supabase, clientId);

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "peso"),
    "success",
    "Peso actualizado.",
  );
}

export async function deleteClientWeight(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const weightId = formString(formData, "weight_id");

  if (!clientId || !weightId) redirect("/clients");

  const { error } = await supabase
    .from("client_weight_logs")
    .delete()
    .eq("id", weightId)
    .eq("client_id", clientId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "peso"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  await syncClientCurrentWeight(supabase, clientId);

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "peso"),
    "success",
    "Peso eliminado.",
  );
}

export async function addClientAnthropometry(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const measuredAt =
    optionalFormString(formData, "measured_at") ?? todayIsoDate();
  const heightCm = positiveFormNumber(formData, "height_cm");
  const weightKg = positiveFormNumber(formData, "weight_kg");
  const sex = optionalClientSex(formData);
  const skinfolds = measurementGroup(formData, "skinfolds", SKINFOLD_FIELDS);
  const girths = measurementGroup(formData, "girths", GIRTH_FIELDS);
  const diameters = measurementGroup(formData, "diameters", DIAMETER_FIELDS);

  if (!clientId) redirect("/clients");

  if (!heightCm || !weightKg) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      "Completa peso y altura de la valoracion antropometrica.",
    );
  }

  if (
    !hasAllMeasurements(skinfolds, SKINFOLD_FIELDS) ||
    !hasAllMeasurements(girths, GIRTH_FIELDS) ||
    !hasAllMeasurements(diameters, DIAMETER_FIELDS)
  ) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      "Completa todas las medidas antropometricas.",
    );
  }

  const { error } = await supabase
    .from("client_anthropometry_assessments")
    .insert({
      user_id: userId,
      client_id: clientId,
      measured_at: measuredAt,
      height_cm: heightCm,
      weight_kg: weightKg,
      sex,
      skinfolds,
      girths,
      diameters,
      notes: optionalFormString(formData, "notes"),
    });

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      error.message,
    );
  }

  await Promise.all([
    supabase.from("clients").update({ height_cm: heightCm }).eq("id", clientId),
    supabase.from("client_weight_logs").insert({
      user_id: userId,
      client_id: clientId,
      measured_at: measuredAt,
      weight_kg: weightKg,
    }),
  ]);
  await syncClientCurrentWeight(supabase, clientId);

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "antropometria"),
    "success",
    "Antropometria guardada.",
  );
}

export async function addClientAppointment(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const scheduledDate = optionalFormString(formData, "scheduled_date");
  const appointmentType =
    optionalFormString(formData, "appointment_type") ?? "Revision mensual";

  if (!clientId) redirect("/clients");

  if (!scheduledDate) {
    redirectWithMessage(
      clientTabPath(clientId, "citas"),
      "error",
      "Selecciona una fecha para la cita.",
    );
  }

  const { error } = await supabase.from("client_appointments").insert({
    user_id: userId,
    client_id: clientId,
    scheduled_date: scheduledDate,
    scheduled_time: optionalFormString(formData, "scheduled_time"),
    appointment_type: appointmentType,
    notes: optionalFormString(formData, "notes"),
  });

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "citas"),
      "error",
      error.message,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "citas"),
    "success",
    "Cita creada.",
  );
}

async function setClientAppointmentCompleted(
  formData: FormData,
  completed: boolean,
) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const appointmentId = formString(formData, "appointment_id");

  if (!clientId || !appointmentId) redirect("/clients");

  const { error } = await supabase
    .from("client_appointments")
    .update({ completed })
    .eq("id", appointmentId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "citas"),
      "error",
      error.message,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "citas"),
    "success",
    completed ? "Cita completada." : "Cita reabierta.",
  );
}

export async function completeClientAppointment(formData: FormData) {
  await setClientAppointmentCompleted(formData, true);
}

export async function reopenClientAppointment(formData: FormData) {
  await setClientAppointmentCompleted(formData, false);
}

export async function deleteClientAppointment(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const appointmentId = formString(formData, "appointment_id");

  if (!clientId || !appointmentId) redirect("/clients");

  const { error } = await supabase
    .from("client_appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "citas"),
      "error",
      error.message,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "citas"),
    "success",
    "Cita eliminada.",
  );
}

export async function addClientNote(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const content = formString(formData, "content");
  const type = noteType(formData);

  if (!clientId) redirect("/clients");

  if (!content) {
    redirectWithMessage(
      clientTabPath(clientId, "notas"),
      "error",
      "Note cannot be empty.",
    );
  }

  const { error } = await supabase.from("client_notes").insert({
    user_id: userId,
    client_id: clientId,
    content,
    note_type: type,
  });

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "notas"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "notas"),
    "success",
    "Note added.",
  );
}

export async function deleteClientNote(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const noteId = formString(formData, "note_id");

  if (!clientId || !noteId) redirect("/clients");

  const { error } = await supabase
    .from("client_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "notas"),
      "error",
      error.message,
    );
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "notas"),
    "success",
    "Note deleted.",
  );
}

export async function uploadClientFile(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const file = formData.get("file");

  if (!clientId) redirect("/clients");

  if (!(file instanceof File) || file.size === 0) {
    redirectWithMessage(
      clientTabPath(clientId, "archivos"),
      "error",
      "Choose a file first.",
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const path = `${userId}/${clientId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(FILE_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    redirectWithMessage(
      clientTabPath(clientId, "archivos"),
      "error",
      uploadError.message,
    );
  }

  const { error } = await supabase.from("client_files").insert({
    user_id: userId,
    client_id: clientId,
    bucket_id: FILE_BUCKET,
    path,
    file_name: file.name,
    content_type: file.type || null,
    size_bytes: file.size,
  });

  if (error) {
    await supabase.storage.from(FILE_BUCKET).remove([path]);
    redirectWithMessage(
      clientTabPath(clientId, "archivos"),
      "error",
      error.message,
    );
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "archivos"),
    "success",
    "File uploaded.",
  );
}

export async function deleteClientFile(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const fileId = formString(formData, "file_id");

  if (!clientId || !fileId) redirect("/clients");

  const { data: file, error: lookupError } = await supabase
    .from("client_files")
    .select("path")
    .eq("id", fileId)
    .single();

  if (lookupError || !file) {
    redirectWithMessage(
      clientTabPath(clientId, "archivos"),
      "error",
      "File not found.",
    );
  }

  await supabase.storage.from(FILE_BUCKET).remove([file.path]);
  const { error } = await supabase
    .from("client_files")
    .delete()
    .eq("id", fileId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "archivos"),
      "error",
      error.message,
    );
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "archivos"),
    "success",
    "File deleted.",
  );
}
