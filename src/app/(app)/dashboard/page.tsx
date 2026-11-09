import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Info,
  CircleAlert,
  Clock3,
  ClipboardList,
  Ruler,
  Target,
  TrendingUp,
  UsersRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  isoDateInTimeZone,
  normalizeNutritionistProfile,
} from "@/lib/nutritionist-profile";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/format";
import { ProBadge } from "@/components/pro-badge";
import { hasProAccess } from "@/lib/account-plan";

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function shortDate(value: string, locale: string) {
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T12:00:00Z`);

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function dateParts(value: string, locale: string) {
  const [year, , day] = value.split("-");
  const date = new Date(`${value}T12:00:00Z`);
  return {
    year: year ?? "",
    month: new Intl.DateTimeFormat(locale, {
      month: "short",
      timeZone: "UTC",
    }).format(date),
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

type AttentionKind = "appointment" | "measurement" | "plan";

type AttentionItem = {
  key: string;
  clientName: string;
  title: string;
  detail: string;
  href: string;
  kind: AttentionKind;
};

const attentionMeta: Record<
  AttentionKind,
  { Icon: LucideIcon; iconClassName: string }
> = {
  appointment: {
    Icon: Clock3,
    iconClassName: "bg-amber-100 text-amber-700",
  },
  measurement: {
    Icon: Ruler,
    iconClassName: "bg-blue-100 text-blue-700",
  },
  plan: {
    Icon: Utensils,
    iconClassName: "bg-violet-100 text-violet-700",
  },
};

function AttentionRow({ item }: { item: AttentionItem }) {
  const { Icon, iconClassName } = attentionMeta[item.kind];

  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[#f9fbf9] sm:px-6"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-950">
          {item.clientName}
        </div>
        <div className="mt-0.5 text-sm text-slate-600">{item.title}</div>
        <div className="mt-0.5 text-xs text-slate-400">{item.detail}</div>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
        aria-hidden="true"
      />
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const [claimsResult, profileResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("nutritionist_profiles").select("*").maybeSingle(),
  ]);
  const profile = normalizeNutritionistProfile(
    profileResult.data,
    claimsResult.data?.claims?.email as string | undefined,
  );
  const isPro = hasProAccess(profile.accountPlan);
  const today = isoDateInTimeZone(profile.timeZone);
  const now = new Date();
  const monthStart = `${today.slice(0, 8)}01`;
  const followUpThreshold = addDays(today, -profile.followUpDays);
  const todayLabel = new Intl.DateTimeFormat(profile.locale, {
    timeZone: profile.timeZone,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);

  const [
    activeClientsResult,
    activePlansResult,
    upcomingAppointmentsResult,
    overdueAppointmentsResult,
    recentWeightsResult,
    recentAnthropometryResult,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,email,goal,sport,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("plans")
      .select("client_id,updated_at,clients!inner(status)")
      .eq("clients.status", "active"),
    isPro
      ? supabase
          .from("client_appointments")
          .select(
            "id,client_id,scheduled_date,scheduled_time,appointment_type,notes,clients(name)",
          )
          .gte("scheduled_date", today)
          .eq("status", "scheduled")
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    isPro
      ? supabase
          .from("client_appointments")
          .select("id,client_id,scheduled_date,clients!inner(name,status)")
          .lt("scheduled_date", today)
          .eq("status", "scheduled")
          .eq("clients.status", "active")
          .order("scheduled_date", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("client_weight_logs")
      .select("client_id")
      .gte("measured_at", followUpThreshold),
    supabase
      .from("client_anthropometry_assessments")
      .select("client_id")
      .gte("measured_at", followUpThreshold),
  ]);

  const activeClients = activeClientsResult.data ?? [];
  const activePlans = activePlansResult.data ?? [];
  const upcomingAppointments = upcomingAppointmentsResult.data ?? [];
  const recentClients = activeClients.slice(0, 6);
  const activeClientsCount = activeClients.length;
  const activePlansCount = activePlans.length;
  const newClientsThisMonth = activeClients.filter(
    (client) =>
      isoDateInTimeZone(profile.timeZone, new Date(client.created_at)) >=
      monthStart,
  ).length;
  const activeClientsWithPlanPercentage = activeClientsCount
    ? Math.round((activePlansCount / activeClientsCount) * 100)
    : 0;

  const clientsById = new Map(
    activeClients.map((client) => [client.id, client]),
  );
  const plansByClientId = new Map(
    activePlans.map((plan) => [plan.client_id, plan]),
  );
  const plansDataAvailable = !activePlansResult.error;
  const measurementsDataAvailable =
    !recentWeightsResult.error && !recentAnthropometryResult.error;
  const recentlyMeasuredClientIds = new Set([
    ...(recentWeightsResult.data ?? []).map((row) => row.client_id),
    ...(recentAnthropometryResult.data ?? []).map((row) => row.client_id),
  ]);
  const overdueAppointmentsByClient = new Map<
    string,
    NonNullable<typeof overdueAppointmentsResult.data>[number]
  >();

  for (const appointment of overdueAppointmentsResult.data ?? []) {
    if (!overdueAppointmentsByClient.has(appointment.client_id)) {
      overdueAppointmentsByClient.set(appointment.client_id, appointment);
    }
  }

  const attentionItems: AttentionItem[] = [
    ...Array.from(overdueAppointmentsByClient.values()).map((appointment) => ({
      key: `appointment-${appointment.id}`,
      clientName: appointment.clients.name,
      title: "Cita pendiente de completar",
      detail: `Programada el ${shortDate(appointment.scheduled_date, profile.locale)}`,
      href: `/clients/${appointment.client_id}?tab=citas`,
      kind: "appointment" as const,
    })),
    ...activeClients
      .filter((client) => plansDataAvailable && !plansByClientId.has(client.id))
      .map((client) => ({
        key: `plan-missing-${client.id}`,
        clientName: client.name,
        title: "Sin plan nutricional",
        detail: "Cliente activo sin un plan asignado",
        href: `/clients/${client.id}?tab=plan`,
        kind: "plan" as const,
      })),
    ...activePlans
      .filter(
        (plan) =>
          plansDataAvailable &&
          plan.updated_at.slice(0, 10) < followUpThreshold,
      )
      .flatMap((plan) => {
        const client = clientsById.get(plan.client_id);
        if (!client) return [];

        return [
          {
            key: `plan-stale-${client.id}`,
            clientName: client.name,
            title: "Plan pendiente de revisión",
            detail: `Sin actualizar desde el ${shortDate(plan.updated_at, profile.locale)}`,
            href: `/clients/${client.id}?tab=plan`,
            kind: "plan" as const,
          },
        ];
      }),
    ...activeClients
      .filter(
        (client) =>
          measurementsDataAvailable &&
          isoDateInTimeZone(profile.timeZone, new Date(client.created_at)) <=
            followUpThreshold &&
          !recentlyMeasuredClientIds.has(client.id),
      )
      .map((client) => ({
        key: `measurement-${client.id}`,
        clientName: client.name,
        title: "Seguimiento sin actualizar",
        detail: `Sin peso ni antropometría en los últimos ${profile.followUpDays} días`,
        href: `/clients/${client.id}?tab=peso`,
        kind: "measurement" as const,
      })),
  ];
  const visibleAttentionItems = attentionItems.slice(0, 6);

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
              {profile.clinicName}
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

      {!profile.isConfigured ? (
        <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Completa tu perfil profesional para personalizar la consulta y la
              agenda.
            </span>
          </span>
          <Link
            href="/settings"
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-sky-900 hover:text-sky-700"
          >
            Configurar perfil
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
        <section
          className="grid gap-4 grid-cols-1"
          aria-label="Indicadores de la consulta"
        >
          <DashboardMetric
            label="Clientes activos"
            value={activeClientsCount}
            helper="En seguimiento actualmente"
            Icon={UsersRound}
            trend={`+${newClientsThisMonth} este mes`}
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
                  Próximas citas
                </h2>
                {!isPro ? <ProBadge /> : null}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">Agenda pendiente</p>
            </div>
          </div>

          {!isPro ? (
            <div
              className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center"
              aria-disabled="true"
            >
              <ProBadge />
              <h3 className="mt-3 font-semibold text-slate-800">
                Agenda disponible con Pro
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Gestiona citas, horarios e historial de cada cliente con el plan
                Pro.
              </p>
              <Link
                href="/planes"
                className="mt-3 text-sm font-semibold text-emerald-700 hover:text-[#003626]"
              >
                Ver ventajas del plan Pro
              </Link>
            </div>
          ) : upcomingAppointments.length ? (
            <div className="relative mt-5 space-y-3 pl-5 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-slate-200">
              {upcomingAppointments.slice(0, 2).map((appointment, index) => {
                const parts = dateParts(
                  appointment.scheduled_date,
                  profile.locale,
                );
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <CircleAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
                Requieren atención
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Tareas que conviene revisar
              </p>
            </div>
          </div>
          <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
            {attentionItems.length}
          </span>
        </div>

        {visibleAttentionItems.length ? (
          <>
            <div className="divide-y divide-slate-100">
              {visibleAttentionItems.map((item) => (
                <AttentionRow key={item.key} item={item} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-[#f8faf9] px-5 py-3 sm:px-6">
              <p className="text-xs text-slate-500">
                {attentionItems.length > visibleAttentionItems.length
                  ? `Mostrando ${visibleAttentionItems.length} de ${attentionItems.length} tareas`
                  : `${attentionItems.length} ${attentionItems.length === 1 ? "tarea pendiente" : "tareas pendientes"}`}
              </p>
              <Link
                href="/clients"
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-[#003626]"
              >
                Ver clientes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-semibold text-slate-950">Todo al día</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {isPro
                ? "No hay citas vencidas ni seguimientos que necesiten atención."
                : "No hay seguimientos que necesiten atención."}
            </p>
          </div>
        )}
      </section>

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

        {recentClients.length ? (
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
                {recentClients.map((client, index) => (
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
