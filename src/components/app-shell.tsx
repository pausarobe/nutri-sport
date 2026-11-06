import { signOut } from "@/app/(auth)/login/actions";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { NavLink } from "@/components/nav-link";
import { SubmitButton } from "@/components/submit-button";
import { Bell, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { profileInitials } from "@/lib/nutritionist-profile";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string;
  displayName: string;
  clinicName: string;
};

export function AppShell({
  children,
  userEmail,
  displayName,
  clinicName,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f8faf9] lg:flex print:block print:bg-white">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[260px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r print:hidden">
        <div className="flex h-[76px] items-center justify-between gap-3 border-b border-slate-100 px-4 lg:justify-start lg:px-5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
            aria-label="NutriSport Pro"
          >
            <Image
              src="/logo.svg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0"
              priority
            />
            <div className="min-w-0 leading-none">
              <div className="truncate text-[18px] font-bold tracking-[-0.025em] text-[#003626]">
                NutriSport Pro
              </div>
              <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                Client nutrition
              </div>
            </div>
          </Link>
          <form action={signOut} className="shrink-0 lg:hidden">
            <SubmitButton
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              pendingLabel=""
              icon="logout"
              ariaLabel="Cerrar sesión"
            />
          </form>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto p-2.5 lg:block lg:space-y-1 lg:p-3"
          aria-label="Navegación principal"
        >
          <NavLink href="/dashboard" label="Dashboard" icon="dashboard" />
          <NavLink href="/clients" label="Clientes" icon="clients" />
          <NavLink href="/appointments" label="Citas" icon="appointments" />
          <NavLink href="/bonos" label="Bonos" icon="bono" />
          <NavLink href="/planes" label="Planes" icon="plan" />
          <NavLink href="/settings" label="Ajustes" icon="settings" />
        </nav>

        <div className="mt-auto hidden p-3 lg:block">
          <div className="rounded-2xl bg-[#f7f8ff] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6ffbbe] text-sm font-bold text-[#005236]">
                {profileInitials(displayName)}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-700">
                  {clinicName}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {displayName}
                </div>
                {userEmail ? (
                  <div className="mt-0.5 truncate text-[11px] text-slate-400">
                    {userEmail}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="my-3 h-px bg-slate-200" />
            <form action={signOut}>
              <SubmitButton
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-red-700"
                pendingLabel="Cerrando sesión..."
                icon="logout"
              >
                Cerrar sesión
              </SubmitButton>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 hidden h-[76px] items-center justify-between border-b border-slate-100 bg-white/90 px-6 backdrop-blur-xl lg:flex print:hidden">
          <AppBreadcrumb />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              aria-label="Ver mensajes"
              title="Ver mensajes"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link href="/clients/new" className="clinical-button-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo cliente
            </Link>
          </div>
        </header>

        <main className="min-w-0 print:block">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6 print:max-w-none print:px-0 print:py-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
