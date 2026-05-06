import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [clientsCount, plansCount, notesCount, recentClients] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("plans").select("id", { count: "exact", head: true }),
    supabase.from("client_notes").select("id", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("id,name,email,goal,created_at")
      .order("created_at", { ascending: false })
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Clients" value={clientsCount.count ?? 0} />
        <StatCard label="Plans" value={plansCount.count ?? 0} />
        <StatCard label="History notes" value={notesCount.count ?? 0} />
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
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
    </>
  );
}
