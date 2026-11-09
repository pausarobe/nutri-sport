"use server";

import { revalidatePath } from "next/cache";
import {
  formString,
  getAuthedSupabase,
  optionalFormString,
  redirectWithMessage,
  requireProPlan,
} from "@/lib/form";
import {
  isoDateInTimeZone,
  normalizeNutritionistProfile,
} from "@/lib/nutritionist-profile";

const bonusPath = "/bonos";
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function bonusError(message: string): never {
  redirectWithMessage(bonusPath, "error", message);
}

function readableBonusError(message: string) {
  if (message.includes("no remaining sessions")) {
    return "El bono ya no tiene sesiones disponibles.";
  }
  if (message.includes("outside the bonus validity")) {
    return "La fecha está fuera del periodo de validez del bono.";
  }
  if (message.includes("inactive")) return "El bono está desactivado.";
  return message;
}

async function currentProfile(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>["supabase"],
) {
  const { data } = await supabase
    .from("nutritionist_profiles")
    .select("*")
    .maybeSingle();
  return normalizeNutritionistProfile(data);
}

export async function createClientBonus(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  await requireProPlan(supabase, "/planes");

  const clientId = formString(formData, "client_id");
  const name = formString(formData, "name");
  const totalSessions = Number(formString(formData, "total_sessions"));
  const startsOn = formString(formData, "starts_on");
  const validUntil = optionalFormString(formData, "valid_until");

  if (!clientId) bonusError("Selecciona un cliente.");
  if (!name || name.length > 120) {
    bonusError("Introduce un nombre de bono de hasta 120 caracteres.");
  }
  if (!Number.isInteger(totalSessions) || totalSessions < 1 || totalSessions > 200) {
    bonusError("El número de sesiones debe estar entre 1 y 200.");
  }
  if (!isoDatePattern.test(startsOn)) bonusError("Selecciona una fecha de inicio.");
  if (validUntil && !isoDatePattern.test(validUntil)) {
    bonusError("La fecha de caducidad no es válida.");
  }
  if (validUntil && validUntil < startsOn) {
    bonusError("La fecha de caducidad debe ser posterior al inicio.");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) bonusError("No se ha encontrado el cliente.");

  const { error } = await supabase.from("client_bonuses").insert({
    user_id: userId,
    client_id: clientId,
    name,
    total_sessions: totalSessions,
    starts_on: startsOn,
    valid_until: validUntil,
    public_token: crypto.randomUUID(),
  });

  if (error) bonusError(readableBonusError(error.message));

  revalidatePath(bonusPath);
  redirectWithMessage(bonusPath, "success", "Bono creado y enlace público activado.");
}

export async function consumeBonusSession(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  await requireProPlan(supabase, "/planes");
  const bonusId = formString(formData, "bonus_id");
  if (!bonusId) bonusError("No se ha encontrado el bono.");

  const profile = await currentProfile(supabase);
  const consumedAt = isoDateInTimeZone(profile.timeZone);
  const { error } = await supabase.from("client_bonus_sessions").insert({
    user_id: userId,
    bonus_id: bonusId,
    consumed_at: consumedAt,
  });

  if (error) bonusError(readableBonusError(error.message));

  revalidatePath(bonusPath);
  redirectWithMessage(bonusPath, "success", "Sesión registrada.");
}

export async function undoLastBonusSession(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  await requireProPlan(supabase, "/planes");
  const bonusId = formString(formData, "bonus_id");
  if (!bonusId) bonusError("No se ha encontrado el bono.");

  const { data: session, error: lookupError } = await supabase
    .from("client_bonus_sessions")
    .select("id")
    .eq("bonus_id", bonusId)
    .order("consumed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError || !session) bonusError("El bono no tiene sesiones que deshacer.");

  const { error } = await supabase
    .from("client_bonus_sessions")
    .delete()
    .eq("id", session.id);
  if (error) bonusError(error.message);

  revalidatePath(bonusPath);
  redirectWithMessage(bonusPath, "success", "Última sesión anulada.");
}

export async function setBonusPublicAccess(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  await requireProPlan(supabase, "/planes");
  const bonusId = formString(formData, "bonus_id");
  const enabled = formString(formData, "enabled") === "true";
  if (!bonusId) bonusError("No se ha encontrado el bono.");

  const { error } = await supabase
    .from("client_bonuses")
    .update({ public_access_enabled: enabled })
    .eq("id", bonusId);
  if (error) bonusError(error.message);

  revalidatePath(bonusPath);
  redirectWithMessage(
    bonusPath,
    "success",
    enabled ? "Enlace público activado." : "Enlace público desactivado.",
  );
}

export async function regenerateBonusPublicLink(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  await requireProPlan(supabase, "/planes");
  const bonusId = formString(formData, "bonus_id");
  if (!bonusId) bonusError("No se ha encontrado el bono.");

  const { error } = await supabase
    .from("client_bonuses")
    .update({
      public_token: crypto.randomUUID(),
      public_access_enabled: true,
    })
    .eq("id", bonusId);
  if (error) bonusError(error.message);

  revalidatePath(bonusPath);
  redirectWithMessage(
    bonusPath,
    "success",
    "Enlace regenerado. El enlace anterior ya no funciona.",
  );
}
