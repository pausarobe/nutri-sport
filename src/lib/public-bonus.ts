import "server-only";

import { cache } from "react";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type PublicBonusStatus =
  | "active"
  | "completed"
  | "expired"
  | "inactive"
  | "scheduled";

export type PublicBonus = {
  name: string;
  clientName: string;
  clinicName: string;
  professionalName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  startsOn: string;
  validUntil: string | null;
  status: PublicBonusStatus;
  sessions: Array<{ consumedAt: string }>;
  updatedAt: string;
};

export const publicBonusUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(value: Json | undefined) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function publicBonusFromJson(value: Json | null): PublicBonus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const name = textValue(value.name);
  const clientName = textValue(value.client_name);
  const clinicName = textValue(value.clinic_name);
  const professionalName = textValue(value.professional_name);
  const totalSessions = numberValue(value.total_sessions);
  const usedSessions = numberValue(value.used_sessions);
  const remainingSessions = numberValue(value.remaining_sessions);
  const startsOn = textValue(value.starts_on);
  const validUntil = textValue(value.valid_until);
  const status = textValue(value.status);
  const updatedAt = textValue(value.updated_at);

  if (
    !name ||
    !clientName ||
    !clinicName ||
    !professionalName ||
    totalSessions === null ||
    usedSessions === null ||
    remainingSessions === null ||
    !startsOn ||
    !updatedAt ||
    !["active", "completed", "expired", "inactive", "scheduled"].includes(
      status ?? "",
    )
  ) {
    return null;
  }

  const sessions = Array.isArray(value.sessions)
    ? value.sessions.flatMap((session) => {
        if (!session || typeof session !== "object" || Array.isArray(session)) {
          return [];
        }
        const consumedAt = textValue(session.consumed_at);
        return consumedAt ? [{ consumedAt }] : [];
      })
    : [];

  return {
    name,
    clientName,
    clinicName,
    professionalName,
    totalSessions,
    usedSessions,
    remainingSessions,
    startsOn,
    validUntil,
    status: status as PublicBonusStatus,
    sessions,
    updatedAt,
  };
}

export const getPublicBonus = cache(async (token: string) => {
  if (!publicBonusUuidPattern.test(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_bonus", {
    p_token: token,
  });

  return error ? null : publicBonusFromJson(data);
});

export function publicBonusStatusLabel(status: PublicBonusStatus) {
  return {
    active: "Bono activo",
    completed: "Bono completado",
    expired: "Bono caducado",
    inactive: "Bono inactivo",
    scheduled: "Próximamente",
  }[status];
}
