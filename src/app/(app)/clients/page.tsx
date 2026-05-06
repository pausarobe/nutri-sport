import Link from "next/link";
import { Mail, Plus, Target } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { formatDate, initials } from "@/lib/format";

type ClientsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage client profiles, plans, notes, and files."
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

      <div className="mb-4">
        <Notice error={params?.error ?? error?.message} success={params?.success} />
      </div>

      {clients?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                  {initials(client.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-slate-950">
                    {client.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Added {formatDate(client.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="truncate">{client.email || "No email"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="truncate">{client.goal || "No goal yet"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No clients found"
          description="Add a client profile and then write their nutrition plan from the detail page."
          action={
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add first client
            </Link>
          }
        />
      )}
    </>
  );
}
