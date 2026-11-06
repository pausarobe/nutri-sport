"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  calculateMedian,
  formatAnthroNumber,
  GIRTH_FIELDS,
  DIAMETER_FIELDS,
  normalizeAnthropometryRace,
  SKINFOLD_FIELDS,
} from "@/lib/anthropometry";
import {
  activityFactorForSex,
  calculateEnergyPlan,
  contextReference,
  DEFAULT_ENERGY_SETTINGS,
  energySettingsFromJson,
  type EnergySettings,
} from "@/lib/nutrition-plan";
import {
  formString,
  getAuthedSupabase,
  optionalFormNumber,
  optionalFormString,
  redirectWithMessage,
} from "@/lib/form";
import type {
  ActivityLevel,
  ClientSex,
  ClientStatus,
} from "@/lib/database.types";
import { clientFileValidationError } from "@/lib/client-files";
import { normalizeNutritionistProfile } from "@/lib/nutritionist-profile";

const FILE_BUCKET = "client-files";
const clientTabPath = (clientId: string, tab: string) =>
  `/clients/${clientId}?tab=${tab}`;
const CLIENT_SEX_VALUES = ["female", "male"] satisfies ClientSex[];
const CLIENT_STATUS_VALUES = [
  "active",
  "paused",
  "inactive",
] satisfies ClientStatus[];
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

function clientStatus(formData: FormData) {
  const value = optionalFormString(formData, "status");
  return CLIENT_STATUS_VALUES.includes(value as ClientStatus)
    ? (value as ClientStatus)
    : "active";
}

function noteType(formData: FormData) {
  return formString(formData, "note_type") === "supplement"
    ? "supplement"
    : "normal";
}

function clientPayload(formData: FormData) {
  return {
    name: formString(formData, "name"),
    status: clientStatus(formData),
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
  const raw = Object.fromEntries(
    fields.map((field) => [
      field.key,
      [
        optionalFormNumber(formData, `${prefix}_${field.key}_1`),
        optionalFormNumber(formData, `${prefix}_${field.key}_2`),
        optionalFormNumber(formData, `${prefix}_${field.key}_3`),
      ],
    ]),
  );
  const values = Object.fromEntries(
    fields.map((field) => [
      field.key,
      formatAnthroNumber(calculateMedian(raw[field.key])),
    ]),
  );
  return { values, raw };
}

function energySettingsPayload(formData: FormData): EnergySettings {
  const raw = formString(formData, "energy_settings_payload");
  try {
    return energySettingsFromJson(JSON.parse(raw));
  } catch {
    return DEFAULT_ENERGY_SETTINGS;
  }
}

function databaseSetupMessage(message: string | undefined) {
  if (message?.includes("schema cache")) {
    return "Falta aplicar la migración de Supabase. Ejecuta primero las migraciones pendientes de la carpeta supabase/migrations.";
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
    redirectWithMessage("/clients/new", "error", "El nombre del cliente es obligatorio.");
  }
  if (!payload.sex) {
    redirectWithMessage("/clients/new", "error", "Selecciona hombre o mujer.");
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
      error?.message ?? "No se pudo crear el cliente.",
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
      "El nombre del cliente es obligatorio.",
    );
  }
  if (!payload.sex) {
    redirectWithMessage(
      `/clients/${clientId}/edit`,
      "error",
      "Selecciona hombre o mujer.",
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
    "Cliente actualizado.",
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
      clientTabPath(clientId, "antropometria"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  revalidatePath("/clients");
  redirectWithMessage("/clients", "success", "Cliente eliminado.");
}

export async function savePlan(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const saveMode = formString(formData, "save_mode");

  if (!clientId) redirect("/clients");

  if (saveMode === "manual") {
    const content = formString(formData, "content");
    const manualCalories = positiveFormNumber(formData, "manual_calories");
    const manualProtein = nonNegativeFormNumber(formData, "manual_protein_g");
    const manualCarbs = nonNegativeFormNumber(formData, "manual_carbs_g");
    const manualFat = nonNegativeFormNumber(formData, "manual_fat_g");

    if (
      !manualCalories ||
      manualProtein === null ||
      manualCarbs === null ||
      manualFat === null
    ) {
      redirectWithMessage(
        clientTabPath(clientId, "plan"),
        "error",
        "Completa los cuatro valores del ajuste manual.",
      );
    }

    const { error } = await supabase.from("plans").upsert(
      {
        user_id: userId,
        client_id: clientId,
        content,
        calories: Math.round(manualCalories),
        protein_g: manualProtein,
        carbs_g: manualCarbs,
        fat_g: manualFat,
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
      "Ajustes manuales guardados.",
    );
  }

  const content = formString(formData, "content");
  const settings = energySettingsPayload(formData);
  const requestedContextKey = formString(formData, "apply_context_key");

  const [clientMetricsResult, latestWeightResult] = await Promise.all([
    supabase
      .from("clients")
      .select("weight_kg,updated_at,sex")
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
  const clientSex =
    clientMetricsResult.data?.sex ??
    optionalClientSex(formData, "reference_sex");
  const selectedContext = settings.contexts.find(
    (context) => context.key === requestedContextKey,
  );
  const resolvedSettings: EnergySettings = {
    ...settings,
    activityFactor: activityFactorForSex(settings.activityLevel, clientSex),
    activeContextKey: selectedContext?.key ?? settings.activeContextKey,
  };
  const energy = calculateEnergyPlan({
    settings: resolvedSettings,
    weightKg: currentWeightKg,
    heightCm: positiveFormNumber(formData, "reference_height_cm"),
    age: positiveFormNumber(formData, "reference_age"),
    sex: clientSex,
  });
  const activeContext =
    resolvedSettings.contexts.find(
      (context) => context.key === resolvedSettings.activeContextKey,
    ) ?? resolvedSettings.contexts[0];

  if (!activeContext) {
    redirectWithMessage(
      clientTabPath(clientId, "plan"),
      "error",
      "No se ha podido determinar el contexto nutricional.",
    );
  }

  const macroTotal =
    activeContext.proteinPct + activeContext.carbsPct + activeContext.fatPct;
  if (Math.abs(macroTotal - 100) > 0.11) {
    redirectWithMessage(
      clientTabPath(clientId, "plan"),
      "error",
      `Los macronutrientes de ${activeContext.label} deben sumar 100%.`,
    );
  }

  const mealTotal = activeContext.meals.reduce(
    (total, meal) => total + meal.pct,
    0,
  );
  if (Math.abs(mealTotal - 100) > 0.11) {
    redirectWithMessage(
      clientTabPath(clientId, "plan"),
      "error",
      `La distribución de comidas de ${activeContext.label} debe sumar 100%.`,
    );
  }

  const referenceCalories = Math.round(
    contextReference(activeContext.key, energy),
  );
  const automaticCalories = Math.round(
    activeContext.calorieTarget && activeContext.calorieTarget > 0
      ? activeContext.calorieTarget
      : referenceCalories,
  );
  const automaticProtein = Math.round(
    (automaticCalories * activeContext.proteinPct) / 100 / 4,
  );
  const automaticCarbs = Math.round(
    (automaticCalories * activeContext.carbsPct) / 100 / 4,
  );
  const automaticFat = Math.round(
    (automaticCalories * activeContext.fatPct) / 100 / 9,
  );
  const calculationDescription =
    activeContext.key === "rest"
      ? `Día de descanso: GET ${referenceCalories} kcal; objetivo ${automaticCalories} kcal.`
      : `${activeContext.label}: GET ${referenceCalories} kcal; objetivo ${automaticCalories} kcal.`;
  const savedSettings: EnergySettings = {
    ...resolvedSettings,
    calculationDescription,
  };

  const { error } = await supabase.from("plans").upsert(
    {
      user_id: userId,
      client_id: clientId,
      content,
      calories: automaticCalories,
      protein_g: automaticProtein,
      carbs_g: automaticCarbs,
      fat_g: automaticFat,
      energy_settings: savedSettings,
      meal_distribution: activeContext.meals,
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
    `${activeContext.label} aplicado como plan activo.`,
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

function anthropometryPayload(formData: FormData) {
  const measuredAt =
    optionalFormString(formData, "measured_at") ?? todayIsoDate();
  const heightCm = positiveFormNumber(formData, "height_cm");
  const weightKg = positiveFormNumber(formData, "weight_kg");
  const sex = optionalClientSex(formData);
  const skinfolds = measurementGroup(formData, "skinfolds", SKINFOLD_FIELDS);
  const girths = measurementGroup(formData, "girths", GIRTH_FIELDS);
  const diameters = measurementGroup(formData, "diameters", DIAMETER_FIELDS);

  return {
    measuredAt,
    heightCm,
    weightKg,
    sex,
    race: normalizeAnthropometryRace(optionalFormString(formData, "race")),
    sittingHeightCm: positiveFormNumber(formData, "sitting_height_cm"),
    armSpanCm: positiveFormNumber(formData, "arm_span_cm"),
    skinfolds,
    girths,
    diameters,
    notes: optionalFormString(formData, "notes"),
  };
}

export async function addClientAnthropometry(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const payload = anthropometryPayload(formData);

  if (!clientId) redirect("/clients");

  if (!payload.heightCm || !payload.weightKg || !payload.sex) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      "Completa peso, altura y sexo de la valoración antropométrica.",
    );
  }

  const { error } = await supabase
    .from("client_anthropometry_assessments")
    .insert({
      user_id: userId,
      client_id: clientId,
      measured_at: payload.measuredAt,
      height_cm: payload.heightCm,
      weight_kg: payload.weightKg,
      sex: payload.sex,
      race: payload.race,
      sitting_height_cm: payload.sittingHeightCm,
      arm_span_cm: payload.armSpanCm,
      skinfolds: payload.skinfolds.values,
      girths: payload.girths.values,
      diameters: payload.diameters.values,
      measurements3: {
        skinfolds: payload.skinfolds.raw,
        girths: payload.girths.raw,
        diameters: payload.diameters.raw,
      },
      notes: payload.notes,
    });

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      error.message,
    );
  }

  await Promise.all([
    supabase
      .from("clients")
      .update({ height_cm: payload.heightCm })
      .eq("id", clientId),
    supabase.from("client_weight_logs").insert({
      user_id: userId,
      client_id: clientId,
      measured_at: payload.measuredAt,
      weight_kg: payload.weightKg,
    }),
  ]);
  await syncClientCurrentWeight(supabase, clientId);

  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "antropometria"),
    "success",
    "Valoración antropométrica guardada.",
  );
}

export async function updateClientAnthropometry(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const assessmentId = formString(formData, "assessment_id");
  const payload = anthropometryPayload(formData);

  if (!clientId || !assessmentId) redirect("/clients");
  if (!payload.heightCm || !payload.weightKg || !payload.sex) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      "Completa peso, altura y sexo de la valoración antropométrica.",
    );
  }

  const { error } = await supabase
    .from("client_anthropometry_assessments")
    .update({
      measured_at: payload.measuredAt,
      height_cm: payload.heightCm,
      weight_kg: payload.weightKg,
      sex: payload.sex,
      race: payload.race,
      sitting_height_cm: payload.sittingHeightCm,
      arm_span_cm: payload.armSpanCm,
      skinfolds: payload.skinfolds.values,
      girths: payload.girths.values,
      diameters: payload.diameters.values,
      measurements3: {
        skinfolds: payload.skinfolds.raw,
        girths: payload.girths.raw,
        diameters: payload.diameters.raw,
      },
      notes: payload.notes,
    })
    .eq("id", assessmentId)
    .eq("client_id", clientId);

  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      databaseSetupMessage(error.message),
    );
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "antropometria"),
    "success",
    "Valoración actualizada.",
  );
}

export async function deleteClientAnthropometry(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const assessmentId = formString(formData, "assessment_id");
  if (!clientId || !assessmentId) redirect("/clients");

  const { error } = await supabase
    .from("client_anthropometry_assessments")
    .delete()
    .eq("id", assessmentId)
    .eq("client_id", clientId);
  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      databaseSetupMessage(error.message),
    );
  }
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "antropometria"),
    "success",
    "Valoración eliminada.",
  );
}

export async function deleteClientAnthropometryBulk(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const rawIds = formString(formData, "assessment_ids");
  if (!clientId) redirect("/clients");
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(rawIds);
    if (Array.isArray(parsed)) {
      ids = parsed.filter((value): value is string => typeof value === "string");
    }
  } catch {
    ids = [];
  }
  if (!ids.length) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      "Selecciona al menos una valoración.",
    );
  }
  const { error } = await supabase
    .from("client_anthropometry_assessments")
    .delete()
    .eq("client_id", clientId)
    .in("id", ids);
  if (error) {
    redirectWithMessage(
      clientTabPath(clientId, "antropometria"),
      "error",
      databaseSetupMessage(error.message),
    );
  }
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(
    clientTabPath(clientId, "antropometria"),
    "success",
    `${ids.length} valoraciones eliminadas.`,
  );
}

export async function addClientAppointment(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const scheduledDate = optionalFormString(formData, "scheduled_date");
  const { data: profileData } = await supabase
    .from("nutritionist_profiles")
    .select("*")
    .maybeSingle();
  const profile = normalizeNutritionistProfile(profileData);
  const durationMinutes = Math.min(
    480,
    Math.max(
      15,
      Math.round(
        optionalFormNumber(formData, "duration_minutes") ??
          profile.defaultAppointmentDuration,
      ),
    ),
  );
  const appointmentType =
    optionalFormString(formData, "appointment_type") ??
    profile.appointmentTypes[0];

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
    duration_minutes: durationMinutes,
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
      "La nota no puede estar vacía.",
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
    "Nota añadida.",
  );
}

export async function updateClientNote(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const noteId = formString(formData, "note_id");
  const content = formString(formData, "content");
  const type = noteType(formData);

  if (!clientId || !noteId) redirect("/clients");

  if (!content) {
    redirectWithMessage(
      clientTabPath(clientId, "notas"),
      "error",
      "La nota no puede estar vacía.",
    );
  }

  const { error } = await supabase
    .from("client_notes")
    .update({ content, note_type: type })
    .eq("id", noteId)
    .eq("client_id", clientId);

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
    "Nota actualizada.",
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
    "Nota eliminada.",
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
      "Selecciona un archivo.",
    );
  }

  const validationError = clientFileValidationError(file);
  if (validationError) {
    redirectWithMessage(
      clientTabPath(clientId, "archivos"),
      "error",
      validationError,
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
    "Archivo subido.",
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
