import { LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8faf9] px-4 py-10">
      <div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-36 -right-28 h-96 w-96 rounded-full bg-[#dae2fd]/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/logo.svg"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0"
              priority
            />
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] text-[#003626]">
              NutriSport Pro
            </h1>
          </div>
          <p className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-emerald-700">
            Client nutrition
          </p>
        </div>

        <section className="clinical-card p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-950">
              Acceso profesional
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Inicia sesión para acceder al portal clínico.
            </p>
          </div>

          <div className="mb-4">
            <Notice error={params?.error} message={params?.message} />
          </div>

          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={params?.next ?? ""} />

            <label className="block space-y-1.5">
              <span className="clinical-label">Email</span>
              <span className="relative block">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="clinical-input pl-10"
                  placeholder="tu@email.com"
                />
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="clinical-label">Contraseña</span>
              <span className="relative block">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="clinical-input pl-10"
                  placeholder="••••••••"
                />
              </span>
            </label>

            <SubmitButton
              className="clinical-button-primary mt-2 w-full"
              pendingLabel="Iniciando sesión..."
            >
              Iniciar sesión
            </SubmitButton>

            <p className="text-center text-xs leading-5 text-slate-400">
              Acceso privado.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
