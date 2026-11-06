import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Plus,
  Sparkles,
  TicketCheck,
  UserRoundPlus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

const bonusTemplates = [
  {
    name: "Sesión individual",
    sessions: 1,
    validity: "1 mes",
    description:
      "Para consultas puntuales, revisiones concretas o resolver una necesidad específica.",
    accent: "bg-emerald-100 text-emerald-800",
    type: "Puntual",
    prize: "30€",
  },
  {
    name: "Bono Trimestral",
    sessions: 3,
    validity: "3 meses",
    description:
      "Seguimiento continuado para evaluar el progreso y realizar ajustes.",
    accent: "bg-blue-100 text-blue-800",
    type: "Seguimiento",
    prize: "90€",
  },
  {
    name: "Bono Anual",
    sessions: 12,
    validity: "12 meses",
    description:
      "Acompañamiento continuado durante toda la temporada deportiva, con revisiones y ajustes periódicos.",
    accent: "bg-violet-100 text-violet-800",
    type: "Temporada",
    prize: "300€",
  },
];

const workflow = [
  {
    title: "Crea el bono",
    description: "Define sesiones, precio, caducidad y condiciones.",
    Icon: TicketCheck,
  },
  {
    title: "Asígnalo al cliente",
    description: "Vincula el pack a una ficha desde el momento de la compra.",
    Icon: UserRoundPlus,
  },
  {
    title: "Controla los usos",
    description: "Descuenta sesiones y consulta el saldo disponible.",
    Icon: CheckCircle2,
  },
];

export default function BonusesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Bonos"
        description="Prepara packs de sesiones y controla su uso desde cada cliente."
        action={
          <button
            type="button"
            disabled
            className="clinical-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo bono
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50 px-6 py-7 shadow-[0_1px_3px_rgba(11,79,58,0.03),0_12px_30px_rgba(15,23,42,0.03)] sm:px-8">
        <div
          className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-200/35 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Prototipo visual
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] text-[#003626]">
              Fideliza el seguimiento con packs de sesiones
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Las plantillas, precios y acciones son demostrativos. La creación,
              asignación y consumo de bonos se activarán más adelante.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#003626]">
              Plantillas de bonos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ejemplos configurables para distintos tipos de seguimiento.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {bonusTemplates.map((bonus) => (
            <article
              key={bonus.name}
              className="clinical-card clinical-card-hover flex flex-col border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.05em] ${bonus.accent}`}
                >
                  {bonus.type}
                </span>
                <TicketCheck
                  className="h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-[-0.02em] text-[#003626]">
                {bonus.name}
              </h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {bonus.description}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f7f8ff] p-3">
                  <div className="clinical-label">Sesiones</div>
                  <div className="mt-1 text-2xl font-extrabold text-[#003626]">
                    {bonus.sessions}
                  </div>
                </div>
                <div className="rounded-xl bg-[#f7f8ff] p-3">
                  <div className="clinical-label">Caducidad</div>
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <CalendarClock
                      className="h-4 w-4 text-emerald-700"
                      aria-hidden="true"
                    />
                    {bonus.validity}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <div className="clinical-label">Precio</div>
                  <div className="mt-1 text-xl font-semibold text-emerald-700">
                    {bonus.prize}
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
                  aria-label={`Configurar ${bonus.name}`}
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="clinical-card border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f3ff] text-emerald-700">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
              Flujo previsto
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Así funcionará la gestión cuando esté conectada.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {workflow.map(({ title, description, Icon }, index) => (
            <div key={title} className="relative rounded-xl bg-[#f7f8ff] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-3xl font-extrabold text-slate-200">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
