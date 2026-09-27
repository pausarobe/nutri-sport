import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Target,
  TrendingUp,
  UsersRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/format";

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-");
  return {
    year: year ?? "",
    month: months[Math.max(0, Number(month) - 1)] ?? "",
    day: day ?? "",
  };
}

function DashboardMetric({
  label,
  value,
  helper,
  Icon,
  accent = false,
  trend,
}: {
  label: string;
  value: number;
  helper: string;
  Icon: LucideIcon;
  accent?: boolean;
  trend?: string;
}) {
  return (
    <div className="clinical-card flex flex-col justify-between p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="clinical-label text-slate-700">{label}</span>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent ? "bg-emerald-100 text-emerald-700" : "bg-[#f2f3ff] text-emerald-700"}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div>
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="text-[40px] font-extrabold leading-none tracking-[-0.04em] text-[#003626]">
            {value}
          </div>
          {trend !== undefined ? (
            <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {trend}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-5 text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayIsoDate();
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const todayLabel = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);

  const [
    clientsCount,
    newClientsThisMonth,
    plansCount,
    recentClients,
    upcomingAppointments,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", monthStart),
    supabase
      .from("plans")
      .select("id,clients!inner(status)", { count: "exact", head: true })
      .eq("clients.status", "active"),
    supabase
      .from("clients")
      .select("id,name,email,goal,sport,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("client_appointments")
      .select(
        "id,client_id,scheduled_date,scheduled_time,appointment_type,notes,clients(name)",
      )
      .gte("scheduled_date", today)
      .eq("completed", false)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(2),
  ]);

  const activeClientsCount = clientsCount.count ?? 0;
  const activePlansCount = plansCount.count ?? 0;
  const activeClientsWithPlanPercentage = activeClientsCount
    ? Math.round((activePlansCount / activeClientsCount) * 100)
    : 0;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50 px-6 py-7 shadow-[0_1px_3px_rgba(11,79,58,0.03),0_12px_30px_rgba(15,23,42,0.03)] sm:px-8">
        <div
          className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-200/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Portal de nutrición deportiva
            </span>
            <h1 className="mt-4 text-[32px] font-extrabold leading-tight tracking-[-0.035em] text-[#003626] sm:text-[40px]">
              Consulta de Guillem Monserrat Vinyoles
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
              Seguimiento clínico, planes nutricionales y próximas citas en una
              sola vista.
            </p>
          </div>
          <div className="inline-flex w-fit self-start items-center gap-2 rounded-full pt-1 text-sm font-semibold text-[#0b4f3a]">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            <span className="capitalize">{todayLabel}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-[auto_minmax(0,1fr)]">
        <section
          className="grid gap-4 grid-cols-1"
          aria-label="Indicadores de la consulta"
        >
          <DashboardMetric
            label="Clientes activos"
            value={clientsCount.count ?? 0}
            helper="En seguimiento actualmente"
            Icon={UsersRound}
            trend={`+${newClientsThisMonth.count ?? 0} este mes`}
          />
          <DashboardMetric
            label="Planes nutricionales"
            value={activePlansCount}
            helper="Planes de clientes activos"
            Icon={Utensils}
            trend={`${activeClientsWithPlanPercentage}% con plan`}
          />
        </section>

        <section className="clinical-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f3ff] text-emerald-700">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
                Próximas citas
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">Agenda pendiente</p>
            </div>
          </div>

          {upcomingAppointments.data?.length ? (
            <div className="relative mt-5 space-y-3 pl-5 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-slate-200">
              {upcomingAppointments.data.map((appointment, index) => {
                const parts = dateParts(appointment.scheduled_date);
                return (
                  <Link
                    key={appointment.id}
                    href={`/clients/${appointment.client_id}?tab=citas`}
                    className="group relative block rounded-xl bg-[#f7f8ff] p-4 transition hover:bg-[#f2f3ff]"
                  >
                    <span
                      className={`absolute -left-[21px] top-5 h-3 w-3 rounded-full ring-4 ring-white ${index === 0 ? "bg-emerald-600" : "bg-slate-400"}`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-emerald-700">
                          {parts.day} {parts.month} {parts.year}
                          {appointment.scheduled_time
                            ? ` · ${appointment.scheduled_time.slice(0, 5)}`
                            : ""}
                        </div>
                        <div className="mt-1 truncate font-semibold text-slate-950">
                          {appointment.clients?.name ?? "Cliente"}
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                        {appointment.appointment_type}
                      </span>
                    </div>
                    {appointment.notes ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {appointment.notes}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Sin citas programadas"
                description="Las citas aparecerán aquí al añadirlas desde la ficha de un cliente."
              />
            </div>
          )}
        </section>
      </div>

      <section className="clinical-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4f3a] text-white">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
                Atletas en Seguimiento Clínico
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Acceso rápido a los perfiles más recientes
              </p>
            </div>
          </div>
          <Link
            href="/clients"
            className="hidden items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-[#003626] sm:inline-flex"
          >
            Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {recentClients.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#f8faf9] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <tr>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-4 py-3">Deporte</th>
                  <th className="px-4 py-3">Objetivo</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-6 py-3 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentClients.data.map((client, index) => (
                  <tr key={client.id} className="transition hover:bg-[#f9fbf9]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index % 3 === 1 ? "bg-emerald-200 text-emerald-900" : index % 3 === 2 ? "bg-blue-100 text-blue-900" : "bg-[#0b4f3a] text-white"}`}
                        >
                          {initials(client.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950">
                            {client.name}
                          </div>
                          <div className="truncate text-xs text-slate-400">
                            {client.email || "Sin email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {client.sport || "No indicado"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex max-w-48 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                        <Target
                          className="h-3 w-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {client.goal || "Sin objetivo"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                        aria-label={`Abrir ficha de ${client.name}`}
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="Aún no hay clientes"
              description="Crea el primer perfil para empezar a añadir planes, mediciones y notas."
            />
          </div>
        )}
      </section>
    </div>
  );
}
