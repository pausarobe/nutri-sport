"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  Dumbbell,
  LayoutGrid,
  List,
  Mail,
  Search,
  Target,
  X,
} from "lucide-react";
import { initials } from "@/lib/format";
import { clientStatusMeta } from "@/lib/client-status";
import type { ClientStatus } from "@/lib/database.types";

type ClientDirectoryEntry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sport: string | null;
  goal: string | null;
  status: ClientStatus;
  created_at: string;
};

type SortMode = "recent" | "oldest" | "name-asc" | "name-desc";
type ViewMode = "cards" | "table";
type StatusFilter = ClientStatus | "all";

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "active", label: "Activos" },
  { value: "paused", label: "En pausa" },
  { value: "inactive", label: "Inactivos" },
  { value: "all", label: "Todos" },
];

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

function clientDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({
  status,
  full = false,
}: {
  status: ClientStatus;
  full?: boolean;
}) {
  const meta = clientStatusMeta(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${meta.className}`}
    >
      {full ? meta.badgeLabel : meta.label}
    </span>
  );
}

export function ClientsDirectory({
  clients,
}: {
  clients: ClientDirectoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [view, setView] = useState<ViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const deferredQuery = useDeferredValue(query);

  const statusCounts = useMemo(
    () => ({
      active: clients.filter((client) => client.status === "active").length,
      paused: clients.filter((client) => client.status === "paused").length,
      inactive: clients.filter((client) => client.status === "inactive").length,
      all: clients.length,
    }),
    [clients],
  );

  const visibleClients = useMemo(() => {
    const term = normalize(deferredQuery.trim());
    const clientsByStatus =
      statusFilter === "all"
        ? clients
        : clients.filter((client) => client.status === statusFilter);
    const filtered = term
      ? clientsByStatus.filter((client) =>
          normalize(
            [client.name, client.email, client.phone, client.sport, client.goal]
              .filter(Boolean)
              .join(" "),
          ).includes(term),
        )
      : [...clientsByStatus];

    return filtered.sort((left, right) => {
      if (sort === "oldest") {
        return (
          new Date(left.created_at).getTime() -
          new Date(right.created_at).getTime()
        );
      }
      if (sort === "name-asc") {
        return left.name.localeCompare(right.name, "es", {
          sensitivity: "base",
        });
      }
      if (sort === "name-desc") {
        return right.name.localeCompare(left.name, "es", {
          sensitivity: "base",
        });
      }
      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    });
  }, [clients, deferredQuery, sort, statusFilter]);

  return (
    <section aria-labelledby="client-directory-title">
      <div className="clinical-card relative mb-5 overflow-hidden border-emerald-100 p-5 sm:p-6">
        <div
          className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-200/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="clinical-label text-emerald-700">
                Directorio clínico
              </span>
              <h2
                id="client-directory-title"
                className="mt-1 text-xl font-bold tracking-[-0.025em] text-[#003626]"
              >
                Encuentra rápidamente a un cliente
              </h2>
            </div>
            <p className="text-sm text-slate-500" aria-live="polite">
              <strong className="text-slate-800">
                {visibleClients.length}
              </strong>{" "}
              {visibleClients.length === 1 ? "resultado" : "resultados"}
            </p>
          </div>

          <div
            className="mb-4 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar clientes por estado"
          >
            <span className="mr-1 text-xs font-semibold text-slate-500">
              Estado:
            </span>
            {statusFilters.map((filter) => {
              const selected = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? "border-[#0b4f3a] bg-[#0b4f3a] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#0b4f3a]"
                  }`}
                  aria-pressed={selected}
                >
                  {filter.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      selected
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {statusCounts[filter.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_220px_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar clientes</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 w-full rounded-xl border border-emerald-200 bg-white pl-12 pr-12 text-base text-slate-900 outline-none shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Buscar por nombre, email, teléfono, deporte u objetivo..."
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Borrar búsqueda"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <label className="relative block">
              <span className="sr-only">Ordenar clientes</span>
              <ArrowUpDown
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                aria-label="Ordenar clientes"
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="name-asc">Nombre: A–Z</option>
                <option value="name-desc">Nombre: Z–A</option>
              </select>
            </label>

            <div
              className="flex h-14 items-center rounded-xl bg-[#f2f3ff] p-1.5"
              aria-label="Modo de visualización"
            >
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`inline-flex h-full flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                  view === "cards"
                    ? "bg-white text-[#0b4f3a] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                aria-pressed={view === "cards"}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`inline-flex h-full flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                  view === "table"
                    ? "bg-white text-[#0b4f3a] shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                aria-pressed={view === "table"}
              >
                <List className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Listado</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {visibleClients.length ? (
        view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleClients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="clinical-card clinical-card-hover group p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0b4f3a] text-sm font-bold text-white ring-4 ring-emerald-50">
                    {initials(client.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold tracking-[-0.01em] text-slate-950 transition group-hover:text-[#0b4f3a]">
                      {client.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={client.status} full />
                      <span className="text-xs text-slate-400">
                        Desde {clientDate(client.created_at)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {client.email || "Sin email"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dumbbell
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {client.sport || "Deporte no indicado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg text-emerald-900">
                    <Target
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="truncate text-xs font-bold">
                      {client.goal || "Sin objetivo definido"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="clinical-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#f8faf9] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Deporte</th>
                    <th className="px-4 py-3">Objetivo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha de alta</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleClients.map((client) => (
                    <tr
                      key={client.id}
                      className="transition hover:bg-[#f9fbf9]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b4f3a] text-xs font-bold text-white">
                            {initials(client.name)}
                          </div>
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-semibold text-slate-950 hover:text-emerald-700"
                          >
                            {client.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-56 truncate text-slate-700">
                          {client.email || "Sin email"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {client.phone || "Sin teléfono"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {client.sport || "No indicado"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex max-w-52 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          <span className="truncate">
                            {client.goal || "Sin objetivo"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {clientDate(client.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 hover:text-[#003626]"
                        >
                          Ver ficha
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="clinical-card border-dashed px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-950">
            No hay clientes que coincidan
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Prueba con otro nombre, email, teléfono, deporte u objetivo.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
            }}
            className="clinical-button-secondary mt-5"
          >
            Ver todos los clientes
          </button>
        </div>
      )}
    </section>
  );
}
