import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasProAccess,
  normalizeAccountPlan,
  PRO_REQUIRED_MESSAGE,
} from "@/lib/account-plan";

export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalFormString(formData: FormData, key: string) {
  const value = formString(formData, key);
  return value.length > 0 ? value : null;
}

export function optionalFormNumber(formData: FormData, key: string) {
  const value = formString(formData, key).replace(",", ".");
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function redirectWithMessage(
  path: string,
  type: "error" | "success" | "message",
  message: string,
): never {
  const params = new URLSearchParams({ [type]: message });
  const hashIndex = path.indexOf("#");
  const basePath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const separator = basePath.includes("?") ? "&" : "?";

  redirect(`${basePath}${separator}${params.toString()}${hash}`);
}

export async function getAuthedSupabase() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

export async function requireProPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  redirectPath: string,
) {
  const { data, error } = await supabase
    .from("nutritionist_profiles")
    .select("account_plan")
    .maybeSingle();

  if (error || !hasProAccess(normalizeAccountPlan(data?.account_plan))) {
    redirectWithMessage(redirectPath, "error", PRO_REQUIRED_MESSAGE);
  }
}
