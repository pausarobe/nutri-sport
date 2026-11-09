import type { AppointmentStatus } from "@/lib/database.types";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
];

export const appointmentStatusMeta: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Programada",
    className: "bg-indigo-100 text-indigo-700",
  },
  completed: {
    label: "Completada",
    className: "bg-emerald-100 text-emerald-800",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-slate-100 text-slate-600",
  },
  no_show: {
    label: "No asistió",
    className: "bg-amber-100 text-amber-800",
  },
};
