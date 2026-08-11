import Link from "next/link";
import { ArrowRight, CalendarClock, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/format";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateParts(value: string) {
  const [, month, day] = value.split("-");
  const monthIndex = Math.max(0, Number(month) - 1);
  return {
    month: months[monthIndex] ?? "",
    day: day ?? "",
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayIsoDate();

  const [
    clientsCount,
    plansCount,
    notesCount,
    upcomingCount,
    recentClients,
    upcomingAppointments,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("plans").select("id", { count: "exact", head: true }),
    supabase.from("client_notes").select("id", { count: "exact", head: true }),
    supabase
      .from("client_appointments")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_date", today)
      .eq("completed", false),
    supabase
      .from("clients")
      .select("id,name,email,goal,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("client_appointments")
      .select("id,client_id,scheduled_date,scheduled_time,appointment_type,notes,clients(name)")
      .gte("scheduled_date", today)
      .eq("completed", false)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(5),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A compact view of your personal nutrition practice."
        action={
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New client
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients" value={clientsCount.count ?? 0} />
        <StatCard label="Plans" value={plansCount.count ?? 0} />
        <StatCard label="History notes" value={notesCount.count ?? 0} />
        <StatCard label="Upcoming appointments" value={upcomingCount.count ?? 0} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-950">Recent clients</h2>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:text-emerald-700"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {recentClients.data?.length ? (
            <div className="divide-y divide-slate-100">
              {recentClients.data.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                    {initials(client.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-950">{client.name}</div>
                    <div className="truncate text-sm text-slate-500">
                      {client.goal || client.email || "No goal set"}
                    </div>
                  </div>
                  <div className="hidden text-sm text-slate-400 sm:block">
                    {formatDate(client.created_at)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="No clients yet"
                description="Create your first client to start adding plans and notes."
                action={
                  <Link
                    href="/clients/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add client
                  </Link>
                }
              />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-950">Proximas citas</h2>
            <CalendarClock className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>

          {upcomingAppointments.data?.length ? (
            <div className="divide-y divide-slate-100">
              {upcomingAppointments.data.map((appointment) => {
                const parts = dateParts(appointment.scheduled_date);

                return (
                  <Link
                    key={appointment.id}
                    href={`/clients/${appointment.client_id}?tab=citas`}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="min-w-12 rounded-lg bg-emerald-50 px-3 py-2 text-center">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {parts.month}
                      </div>
                      <div className="text-lg font-semibold leading-none text-emerald-800">
                        {parts.day}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-950">
                        {appointment.clients?.name ?? "Cliente"}
                      </div>
                      <div className="truncate text-sm text-slate-500">
                        {appointment.appointment_type}
                        {appointment.notes ? ` - ${appointment.notes}` : ""}
                      </div>
                    </div>
                    {appointment.scheduled_time ? (
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-700">
                        {appointment.scheduled_time.slice(0, 5)}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="Sin citas programadas"
                description="Las proximas citas apareceran aqui cuando las anadas desde la ficha del cliente."
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
