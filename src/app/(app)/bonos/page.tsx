import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  Link2,
  Plus,
  RotateCcw,
  TicketCheck,
  UserRound,
} from "lucide-react";
import { BonusShareButton } from "@/components/bonus-share-button";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { hasProAccess, PRO_REQUIRED_MESSAGE } from "@/lib/account-plan";
import type { ClientBonus, ClientBonusSession } from "@/lib/database.types";
import { redirectWithMessage } from "@/lib/form";
import {
  isoDateInTimeZone,
  normalizeNutritionistProfile,
} from "@/lib/nutritionist-profile";
import { createClient } from "@/lib/supabase/server";
import {
  consumeBonusSession,
  createClientBonus,
  regenerateBonusPublicLink,
  setBonusPublicAccess,
  undoLastBonusSession,
} from "./actions";

type BonusesPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    message?: string;
  }>;
};

function dateLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function bonusState(bonus: ClientBonus, usedSessions: number, today: string) {
  if (!bonus.is_active) {
    return {
      label: "Inactivo",
      className: "bg-slate-100 text-slate-600",
      canConsume: false,
    };
  }
  if (bonus.valid_until && bonus.valid_until < today) {
    return {
      label: "Caducado",
      className: "bg-amber-100 text-amber-800",
      canConsume: false,
    };
  }
  if (usedSessions >= bonus.total_sessions) {
    return {
      label: "Completado",
      className: "bg-blue-100 text-blue-800",
      canConsume: false,
    };
  }
  if (bonus.starts_on > today) {
    return {
      label: "Próximamente",
      className: "bg-violet-100 text-violet-800",
      canConsume: false,
    };
  }
  return {
    label: "Activo",
    className: "bg-emerald-100 text-emerald-800",
    canConsume: bonus.starts_on <= today,
  };
}

export default async function BonusesPage({ searchParams }: BonusesPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: profileData } = await supabase
    .from("nutritionist_profiles")
    .select("*")
    .maybeSingle();
  const profile = normalizeNutritionistProfile(profileData);

  if (!hasProAccess(profile.accountPlan)) {
    redirectWithMessage("/planes", "message", PRO_REQUIRED_MESSAGE);
  }

  const [clientsResult, bonusesResult, sessionsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,status")
      .order("name", { ascending: true }),
    supabase
      .from("client_bonuses")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("client_bonus_sessions")
      .select("*")
      .order("consumed_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  const clients = clientsResult.data ?? [];
  const bonuses = bonusesResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const sessionsByBonus = new Map<string, ClientBonusSession[]>();

  for (const session of sessions) {
    const bonusSessions = sessionsByBonus.get(session.bonus_id) ?? [];
    bonusSessions.push(session);
    sessionsByBonus.set(session.bonus_id, bonusSessions);
  }

  const today = isoDateInTimeZone(profile.timeZone);
  const setupError =
    bonusesResult.error?.message ?? sessionsResult.error?.message ?? undefined;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Bonos"
        description="Asigna packs de sesiones, registra su consumo y comparte el seguimiento con el cliente."
        action={
          <a href="#nuevo-bono" className="clinical-button-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo bono
          </a>
        }
      />

      <Notice
        error={
          query?.error ??
          (setupError
            ? `No se han podido cargar los bonos. Aplica la migración pendiente de Supabase: ${setupError}`
            : undefined)
        }
        success={query?.success}
        message={query?.message}
      />

      <section
        id="nuevo-bono"
        className="clinical-card scroll-mt-24 overflow-hidden border border-slate-200"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <TicketCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
              Crear y asignar bono
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              El enlace público se genera automáticamente al guardar.
            </p>
          </div>
        </div>

        <form action={createClientBonus} className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="clinical-label">Cliente</span>
              <select
                name="client_id"
                required
                defaultValue=""
                className="clinical-input"
                disabled={!clients.length}
              >
                <option value="" disabled>
                  {clients.length ? "Selecciona un cliente" : "No hay clientes"}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.status !== "active" ? " · Inactivo" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <span className="clinical-label">Nombre del bono</span>
              <input
                name="name"
                required
                maxLength={120}
                list="bonus-names"
                placeholder="Bono trimestral"
                className="clinical-input"
              />
              <datalist id="bonus-names">
                <option value="Sesión individual" />
                <option value="Bono trimestral" />
                <option value="Bono anual" />
              </datalist>
            </label>
            <label className="space-y-1.5">
              <span className="clinical-label">Sesiones</span>
              <input
                name="total_sessions"
                type="number"
                min={1}
                max={200}
                defaultValue={3}
                required
                className="clinical-input"
              />
            </label>
            <label className="space-y-1.5">
              <span className="clinical-label">Fecha de inicio</span>
              <input
                name="starts_on"
                type="date"
                defaultValue={today}
                required
                className="clinical-input"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <span className="clinical-label">Caducidad</span>
              <input name="valid_until" type="date" className="clinical-input" />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <SubmitButton
              className="clinical-button-primary w-full sm:w-auto"
              pendingLabel="Creando bono..."
              disabled={!clients.length}
            >
              Crear bono
            </SubmitButton>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#003626]">
              Bonos asignados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Control de sesiones y enlaces compartidos.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {bonuses.length}
          </span>
        </div>

        {bonuses.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {bonuses.map((bonus) => {
              const client = clientsById.get(bonus.client_id);
              const bonusSessions = sessionsByBonus.get(bonus.id) ?? [];
              const usedSessions = bonusSessions.length;
              const remainingSessions = Math.max(
                bonus.total_sessions - usedSessions,
                0,
              );
              const progress = Math.min(
                100,
                Math.round((usedSessions / bonus.total_sessions) * 100),
              );
              const state = bonusState(bonus, usedSessions, today);
              const publicPath = `/bono/${bonus.public_token}`;

              return (
                <article
                  key={bonus.id}
                  className="clinical-card overflow-hidden border border-slate-200"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xl font-bold text-[#003626]">
                            {bonus.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] ${state.className}`}
                          >
                            {state.label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                          <UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          {client?.name ?? "Cliente no disponible"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <form action={consumeBonusSession}>
                          <input type="hidden" name="bonus_id" value={bonus.id} />
                          <SubmitButton
                            className="clinical-button-primary min-h-10"
                            pendingLabel="Registrando..."
                            disabled={!state.canConsume}
                          >
                            Consumir sesión
                          </SubmitButton>
                        </form>
                        {usedSessions ? (
                          <form action={undoLastBonusSession}>
                            <input type="hidden" name="bonus_id" value={bonus.id} />
                            <SubmitButton
                              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                              pendingLabel=""
                              ariaLabel="Deshacer la última sesión"
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>{usedSessions} consumidas</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        ["Totales", bonus.total_sessions],
                        ["Consumidas", usedSessions],
                        ["Restantes", remainingSessions],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-[#f7f8ff] p-3 text-center">
                          <dt className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-1 text-2xl font-extrabold text-[#003626]">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        Inicio: {dateLabel(bonus.starts_on, profile.locale)}
                      </span>
                      <span>
                        Caducidad:{" "}
                        {bonus.valid_until
                          ? dateLabel(bonus.valid_until, profile.locale)
                          : "Sin caducidad"}
                      </span>
                      {bonusSessions[0] ? (
                        <span>
                          Último uso: {dateLabel(bonusSessions[0].consumed_at, profile.locale)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:px-6">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Enlace para el cliente
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${
                          bonus.public_access_enabled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {bonus.public_access_enabled ? "Activo" : "Desactivado"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {bonus.public_access_enabled ? (
                        <>
                          <BonusShareButton
                            path={publicPath}
                            bonusName={bonus.name}
                            clientName={client?.name ?? "cliente"}
                          />
                          <Link
                            href={publicPath}
                            target="_blank"
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            Vista pública
                          </Link>
                        </>
                      ) : null}

                      <form action={setBonusPublicAccess}>
                        <input type="hidden" name="bonus_id" value={bonus.id} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={bonus.public_access_enabled ? "false" : "true"}
                        />
                        <SubmitButton
                          className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          pendingLabel="Guardando..."
                        >
                          {bonus.public_access_enabled ? "Desactivar" : "Activar enlace"}
                        </SubmitButton>
                      </form>

                      <form action={regenerateBonusPublicLink}>
                        <input type="hidden" name="bonus_id" value={bonus.id} />
                        <SubmitButton
                          className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900"
                          pendingLabel="Regenerando..."
                        >
                          Regenerar
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="clinical-card flex flex-col items-center border border-dashed border-slate-200 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <TicketCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">Todavía no hay bonos</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Crea el primero, asígnalo a un cliente y comparte su enlace de
              seguimiento.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
