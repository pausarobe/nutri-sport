import { signOut } from "@/app/(auth)/login/actions";
import { NavLink } from "@/components/nav-link";
import { SubmitButton } from "@/components/submit-button";
import Image from "next/image";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex print:block print:bg-white">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r print:static print:block print:h-auto print:w-auto print:border-0">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-5 print:border-0 print:px-0 print:py-0">
          <div className="flex min-w-0 items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
            <div className="flex shrink-0 items-center justify-center">
              <Image
                src="/logo.svg"
                alt="NutriSport Pro"
                width={80}
                height={80}
                className="print:h-10 print:w-10"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xl font-semibold tracking-tight text-emerald-800 print:text-base">
                NutriSport Pro
              </div>
              <div className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-slate-400 print:text-[9px]">
                Client nutrition
              </div>
            </div>
          </div>
          <form action={signOut} className="shrink-0 lg:hidden print:hidden">
            <SubmitButton
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              pendingLabel=""
              icon="logout"
              ariaLabel="Sign out"
            />
          </form>
        </div>

        <nav className="flex gap-1 p-2 lg:block lg:p-0 print:hidden">
          <NavLink href="/dashboard" label="Dashboard" icon="dashboard" />
          <NavLink href="/clients" label="Clients" icon="clients" />
        </nav>

        <div className="mt-auto hidden border-t border-slate-200 p-5 lg:block print:hidden">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Signed in
          </div>
          <div className="mt-1 truncate text-sm font-medium text-slate-700">
            {userEmail ?? "Nutritionist"}
          </div>
          <form action={signOut} className="mt-4">
            <SubmitButton
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              pendingLabel="Signing out..."
              icon="logout"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 print:block">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-3">
          {children}
        </div>
      </main>
    </div>
  );
}
