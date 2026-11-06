import {
  CalendarDays,
  Check,
  Files,
  LayoutDashboard,
  Sparkles,
  TicketCheck,
  UsersRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

const freeFeatures = [
  "Dashboard de actividad",
  "Gestión de clientes con un máximo",
  "Planes nutricionales",
  "Antropometría, evolución y notas",
];

const proFeatures = [
  "Todo lo incluido en el plan Gratis",
  "Gestor completo de citas",
  "Agenda y seguimiento de citas por cliente",
  "Archivos clínicos y documentos",
  "Bonos de sesiones",
];

const comparison = [
  {
    label: "Dashboard",
    description: "Resumen de clientes y actividad",
    Icon: LayoutDashboard,
    free: true,
  },
  {
    label: "Clientes",
    description: "Ficha, nutrición, antropometría y notas",
    Icon: UsersRound,
    free: true,
  },
  {
    label: "Citas",
    description: "Agenda y seguimiento dentro de cada cliente",
    Icon: CalendarDays,
    free: false,
  },
  {
    label: "Archivos",
    description: "Subida y almacenamiento de documentos",
    Icon: Files,
    free: false,
  },
  {
    label: "Bonos",
    description: "Packs de sesiones y control de usos",
    Icon: TicketCheck,
    free: false,
  },
];

function Availability({ available }: { available: boolean }) {
  return available ? (
    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
      <Check className="h-4 w-4" aria-hidden="true" />
      Incluido
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
      <X className="h-4 w-4" aria-hidden="true" />
      No incluido
    </span>
  );
}

export default function PlansPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Planes"
        description="Elige el nivel de herramientas que mejor encaja con tu consulta."
      />

      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#003626] via-[#0b4f3a] to-[#147a59] px-6 py-8 text-white shadow-[0_18px_48px_rgba(0,54,38,0.18)] sm:px-8">
        <div
          className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#6ffbbe]/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Vista previa
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            Empieza gratis y activa todo el potencial cuando lo necesites
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80 sm:text-base sm:leading-7">
            La contratación y el control de acceso todavía no están activos.
            Esta pantalla muestra cómo se diferenciarán los planes.
          </p>
        </div>
      </section>

      <section
        className="grid items-stretch gap-5 lg:grid-cols-2"
        aria-label="Planes disponibles"
      >
        <article className="clinical-card flex flex-col border border-slate-200 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="clinical-label">Para empezar</span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#003626]">
                Gratis
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Esencial
            </span>
          </div>
          <div className="mt-6 flex items-end gap-2 border-b border-slate-100 pb-6">
            <span className="text-5xl font-extrabold tracking-[-0.05em] text-slate-950">
              0 €
            </span>
            <span className="pb-1 text-sm text-slate-500">para siempre</span>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Las herramientas principales para organizar clientes y crear su
            seguimiento nutricional.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className="mt-auto inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500"
          >
            Disponible próximamente
          </button>
        </article>

        <article className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-[0_16px_40px_rgba(11,79,58,0.12)] sm:p-7">
          <div className="absolute right-0 top-0 rounded-bl-2xl bg-emerald-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
            Recomendado
          </div>
          <div className="flex items-start justify-between gap-4 pr-24">
            <div>
              <span className="clinical-label text-emerald-700">
                Experiencia completa
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#003626]">
                Pro
              </h2>
            </div>
          </div>
          <div className="mt-6 border-b border-emerald-100 pb-6">
            <span className="text-3xl font-extrabold tracking-[-0.04em] text-slate-950">
              Precio por definir
            </span>
            <p className="mt-1 text-sm text-slate-500">
              Acceso a todas las funcionalidades
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            La solución completa para gestionar la consulta, desde la primera
            cita hasta los documentos y bonos de seguimiento.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <button
              type="button"
              disabled
              className="clinical-button-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Disponible próximamente
            </button>
          </div>
        </article>
      </section>

      <section className="clinical-card overflow-hidden border border-slate-200">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
            Comparativa rápida
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Las funciones disponibles en cada modalidad.
          </p>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_140px_140px] items-center border-b border-slate-100 bg-slate-50 px-6 py-3 sm:grid">
          <span className="text-xs font-semibold text-slate-500">
            Funcionalidad
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600">
            Plan Gratis
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-emerald-700">
            Plan Pro
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {comparison.map(({ label, description, Icon, free }) => (
            <div
              key={label}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_140px_140px] sm:items-center sm:px-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f3ff] text-emerald-700">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {label}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {description}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:block">
                <span className="text-xs font-semibold text-slate-400 sm:hidden">
                  Gratis
                </span>
                <Availability available={free} />
              </div>
              <div className="flex items-center justify-between sm:block">
                <span className="text-xs font-semibold text-slate-400 sm:hidden">
                  Pro
                </span>
                <Availability available />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
