import type { ClientStatus } from "@/lib/database.types";

export const CLIENT_STATUS_OPTIONS: Array<{
  value: ClientStatus;
  label: string;
  badgeLabel: string;
  description: string;
}> = [
  {
    value: "active",
    label: "Activo",
    badgeLabel: "Cliente activo",
    description: "Cliente en seguimiento actualmente.",
  },
  {
    value: "paused",
    label: "En pausa",
    badgeLabel: "Cliente en pausa",
    description: "Seguimiento detenido temporalmente.",
  },
  {
    value: "inactive",
    label: "Inactivo",
    badgeLabel: "Cliente inactivo",
    description: "Ya no recibe seguimiento, pero conserva su historial.",
  },
];

export function clientStatusMeta(status: ClientStatus) {
  const option =
    CLIENT_STATUS_OPTIONS.find((candidate) => candidate.value === status) ??
    CLIENT_STATUS_OPTIONS[0];

  const className =
    status === "paused"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === "inactive"
        ? "border-slate-200 bg-slate-100 text-slate-600"
        : "border-emerald-200 bg-emerald-100 text-emerald-800";

  return { ...option, className };
}
