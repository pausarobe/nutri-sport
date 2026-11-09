import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import {
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import { getPublicBonus } from "@/lib/public-bonus";

export const revalidate = 0;

type PublicBonusPageProps = {
  params: Promise<{ token: string }>;
};

async function metadataBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return new URL(configuredUrl);

  const requestHeaders = await headers();
  const host = (
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  )
    ?.split(",")[0]
    .trim();
  const protocol = (
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https")
  )
    .split(",")[0]
    .trim();

  return new URL(`${protocol}://${host ?? "localhost:3000"}`);
}

export async function generateMetadata({
  params,
}: PublicBonusPageProps): Promise<Metadata> {
  const { token } = await params;
  const [bonus, metadataBase] = await Promise.all([
    getPublicBonus(token),
    metadataBaseUrl(),
  ]);
  const title = bonus
    ? `${bonus.name} · ${bonus.clinicName}`
    : "Tu bono · NutriSport Pro";
  const description = bonus
    ? `${bonus.remainingSessions} de ${bonus.totalSessions} sesiones disponibles.`
    : "Consulta el estado y las sesiones disponibles de tu bono.";

  return {
    metadataBase,
    title,
    description,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_ES",
      siteName: "NutriSport Pro",
      url: `/bono/${token}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function UnavailableBonus() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f6] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <TicketCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-[#003626]">
          Bono no disponible
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          El enlace no es válido o ha sido desactivado. Solicita un nuevo enlace
          a tu nutricionista.
        </p>
      </section>
    </main>
  );
}

export default async function PublicBonusPage({ params }: PublicBonusPageProps) {
  const { token } = await params;
  const bonus = await getPublicBonus(token);
  if (!bonus) return <UnavailableBonus />;

  const progress = Math.min(
    100,
    Math.round((bonus.usedSessions / bonus.totalSessions) * 100),
  );
  const status = {
    active: {
      label: "Bono activo",
      className: "bg-emerald-100 text-emerald-800",
      message: "Tienes sesiones disponibles para continuar tu seguimiento.",
    },
    completed: {
      label: "Bono completado",
      className: "bg-blue-100 text-blue-800",
      message: "Has utilizado todas las sesiones de este bono.",
    },
    expired: {
      label: "Bono caducado",
      className: "bg-amber-100 text-amber-800",
      message: "El periodo de validez de este bono ha finalizado.",
    },
    inactive: {
      label: "Bono inactivo",
      className: "bg-slate-100 text-slate-600",
      message: "Este bono se encuentra temporalmente inactivo.",
    },
    scheduled: {
      label: "Próximamente",
      className: "bg-violet-100 text-violet-800",
      message: "Tu bono está preparado y se activará en la fecha de inicio.",
    },
  }[bonus.status];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(111,251,190,0.18),_transparent_36%),#f5f8f6] px-4 py-5 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-5 flex items-center gap-3 px-1">
          <Image src="/logo.svg" alt="" width={42} height={42} priority />
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-[#003626]">
              {bonus.clinicName}
            </div>
            <div className="truncate text-xs text-slate-500">
              {bonus.professionalName}
            </div>
          </div>
          <ShieldCheck
            className="ml-auto h-5 w-5 shrink-0 text-emerald-700"
            aria-label="Enlace privado de solo lectura"
          />
        </header>

        <section className="overflow-hidden rounded-[2rem] bg-[#064e3b] text-white shadow-[0_24px_60px_rgba(0,54,38,0.2)]">
          <div className="relative overflow-hidden px-5 pb-7 pt-6 sm:px-8 sm:pt-8">
            <div
              className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#6ffbbe]/20 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.07em] ${status.className}`}
              >
                {status.label}
              </span>
              <p className="mt-5 text-sm text-emerald-100">Hola, {bonus.clientName}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                {bonus.name}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50/75">
                {status.message}
              </p>

              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-200">
                    Sesiones restantes
                  </div>
                  <div className="mt-1 text-6xl font-black leading-none tracking-[-0.06em]">
                    {bonus.remainingSessions}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">{progress}%</div>
                  <div className="mt-1 text-xs text-emerald-200">completado</div>
                </div>
              </div>
              <div
                className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={bonus.totalSessions}
                aria-valuenow={bonus.usedSessions}
                aria-label="Progreso del bono"
              >
                <div
                  className="h-full rounded-full bg-[#6ffbbe]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-white/10 bg-black/10 px-2 py-4 text-center sm:px-6">
            {[
              ["Totales", bonus.totalSessions],
              ["Consumidas", bonus.usedSessions],
              ["Restantes", bonus.remainingSessions],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-white/10 px-2 last:border-r-0">
                <div className="text-2xl font-extrabold">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.05em] text-emerald-200">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold text-[#003626]">Validez del bono</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Desde {dateLabel(bonus.startsOn)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f7f8ff] px-4 py-3 text-sm">
            <span className="text-slate-500">Fecha de caducidad</span>
            <span className="font-semibold text-slate-800">
              {bonus.validUntil ? dateLabel(bonus.validUntil) : "Sin caducidad"}
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold text-[#003626]">Sesiones consumidas</h2>
                <p className="mt-0.5 text-xs text-slate-500">Historial del bono</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              {bonus.usedSessions}
            </span>
          </div>

          {bonus.sessions.length ? (
            <ol className="mt-5 space-y-3">
              {bonus.sessions.map((session, index) => (
                <li
                  key={`${session.consumedAt}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800">
                      Sesión consumida
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {dateLabel(session.consumedAt)}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    #{bonus.usedSessions - index}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 flex flex-col items-center rounded-2xl bg-[#f7f8ff] px-5 py-7 text-center">
              <CircleCheck className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Aún no hay sesiones consumidas
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Aquí aparecerán a medida que avance tu seguimiento.
              </p>
            </div>
          )}
        </section>

        <footer className="px-4 py-6 text-center text-[11px] leading-5 text-slate-400">
          Enlace privado de solo lectura · No lo compartas con terceros
        </footer>
      </div>
    </main>
  );
}
