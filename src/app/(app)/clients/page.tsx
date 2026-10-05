import Link from "next/link";
import {
  CalendarDays,
  Plus,
  UserPlus,
  UserCheck,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ClientsDirectory } from "@/components/clients-directory";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

type ClientsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function ClientsMetric({
  label,
  value,
  helper,
  Icon,
  accent = false,
}: {
  label: string;
  value: number;
  helper: string;
  Icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="clinical-card flex min-h-36 flex-col justify-between p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="clinical-label text-slate-700">{label}</span>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-emerald-100 text-emerald-700" : "bg-[#f2f3ff] text-emerald-700"}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4">
        <div className="text-[34px] font-extrabold leading-none tracking-[-0.04em] text-[#003626]">
          {value}
        </div>
        <p className="mt-2 text-sm leading-5 text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const [clientsResult, plansResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,email,phone,sport,goal,status,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("client_id"),
  ]);
  const clients = clientsResult.data ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now);
  yearStart.setFullYear(yearStart.getFullYear() - 1);
  const activeClients = clients.filter(
    (client) => client.status === "active",
  ).length;
  const newThisMonth = clients.filter(
    (client) => new Date(client.created_at) >= monthStart,
  ).length;
  const newLastYear = clients.filter(
    (client) => new Date(client.created_at) >= yearStart,
  ).length;
  const planClientIds = new Set(
    (plansResult.data ?? []).map((plan) => plan.client_id),
  );
  const clientsWithPlan = clients.filter((client) =>
    planClientIds.has(client.id),
  ).length;
  const planCoverage = clients.length
    ? Math.round((clientsWithPlan / clients.length) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gestiona fichas, planes, mediciones, citas, notas y archivos clínicos."
      />

      <div className="mb-4">
        <Notice
          error={
            params?.error ??
            clientsResult.error?.message ??
            plansResult.error?.message
          }
          success={params?.success}
        />
      </div>

      <section
        className="mb-7 grid gap-4 grid-cols-2 lg:grid-cols-5"
        aria-label="Métricas de clientes"
      >
        <ClientsMetric
          label="Clientes activos"
          value={activeClients}
          helper="En seguimiento actualmente"
          Icon={UserCheck}
          accent
        />
        <ClientsMetric
          label="Clientes totales"
          value={clients.length}
          helper="Todos los perfiles registrados"
          Icon={UsersRound}
        />
        <ClientsMetric
          label="Nuevos este mes"
          value={newThisMonth}
          helper="Altas desde el inicio del mes"
          Icon={UserPlus}
        />
        <ClientsMetric
          label="Nuevos último año"
          value={newLastYear}
          helper="Altas de los últimos 12 meses"
          Icon={CalendarDays}
        />
        <ClientsMetric
          label="Con plan nutricional"
          value={clientsWithPlan}
          helper={`${planCoverage}% de los clientes`}
          Icon={UtensilsCrossed}
        />
      </section>

      {clients.length ? (
        <ClientsDirectory clients={clients} />
      ) : (
        <EmptyState
          title="No hay clientes"
          description="Añade un perfil y después completa su plan nutricional y su seguimiento clínico."
          action={
            <Link href="/clients/new" className="clinical-button-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Añadir primer cliente
            </Link>
          }
        />
      )}
    </>
  );
}
