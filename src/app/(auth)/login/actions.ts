"use server";

import { redirect } from "next/navigation";
import { formString, redirectWithMessage } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

function nextPath(formData: FormData) {
  const next = formString(formData, "next");
  return next.startsWith("/") ? next : "/dashboard";
}

export async function signIn(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithMessage("/login", "error", error.message);
  }

  redirect(nextPath(formData));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
