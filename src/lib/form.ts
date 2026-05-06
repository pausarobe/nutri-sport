import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  redirect(`${path}?${params.toString()}`);
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
