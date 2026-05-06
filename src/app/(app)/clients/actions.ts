"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formString,
  getAuthedSupabase,
  optionalFormNumber,
  optionalFormString,
  redirectWithMessage,
} from "@/lib/form";
import type { ActivityLevel, ClientSex } from "@/lib/database.types";

const FILE_BUCKET = "client-files";
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

function optionalClientSex(formData: FormData) {
  const value = optionalFormString(formData, "sex");
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

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateNutritionClient(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
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

  const { error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", clientId);

  if (error) {
    redirectWithMessage(`/clients/${clientId}/edit`, "error", error.message);
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(`/clients/${clientId}`, "success", "Client updated.");
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
    redirectWithMessage(`/clients/${clientId}`, "error", error.message);
  }

  revalidatePath("/clients");
  redirectWithMessage("/clients", "success", "Client deleted.");
}

export async function savePlan(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const content = formString(formData, "content");

  if (!clientId) redirect("/clients");

  const { error } = await supabase.from("plans").upsert(
    {
      user_id: userId,
      client_id: clientId,
      content,
    },
    { onConflict: "client_id" },
  );

  if (error) {
    redirectWithMessage(`/clients/${clientId}`, "error", error.message);
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(`/clients/${clientId}`, "success", "Plan saved.");
}

export async function addClientNote(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const content = formString(formData, "content");

  if (!clientId) redirect("/clients");

  if (!content) {
    redirectWithMessage(`/clients/${clientId}`, "error", "Note cannot be empty.");
  }

  const { error } = await supabase.from("client_notes").insert({
    user_id: userId,
    client_id: clientId,
    content,
  });

  if (error) {
    redirectWithMessage(`/clients/${clientId}`, "error", error.message);
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(`/clients/${clientId}`, "success", "Note added.");
}

export async function deleteClientNote(formData: FormData) {
  const { supabase } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const noteId = formString(formData, "note_id");

  if (!clientId || !noteId) redirect("/clients");

  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);

  if (error) {
    redirectWithMessage(`/clients/${clientId}`, "error", error.message);
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(`/clients/${clientId}`, "success", "Note deleted.");
}

export async function uploadClientFile(formData: FormData) {
  const { supabase, userId } = await getAuthedSupabase();
  const clientId = formString(formData, "client_id");
  const file = formData.get("file");

  if (!clientId) redirect("/clients");

  if (!(file instanceof File) || file.size === 0) {
    redirectWithMessage(`/clients/${clientId}`, "error", "Choose a file first.");
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
    redirectWithMessage(`/clients/${clientId}`, "error", uploadError.message);
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
    redirectWithMessage(`/clients/${clientId}`, "error", error.message);
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(`/clients/${clientId}`, "success", "File uploaded.");
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
    redirectWithMessage(`/clients/${clientId}`, "error", "File not found.");
  }

  await supabase.storage.from(FILE_BUCKET).remove([file.path]);
  const { error } = await supabase.from("client_files").delete().eq("id", fileId);

  if (error) {
    redirectWithMessage(`/clients/${clientId}`, "error", error.message);
  }

  revalidatePath(`/clients/${clientId}`);
  redirectWithMessage(`/clients/${clientId}`, "success", "File deleted.");
}
