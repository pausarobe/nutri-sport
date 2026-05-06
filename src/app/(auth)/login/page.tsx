import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "./actions";
import Image from "next/image";

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
    <main className="flex min-h-screen items-center bg-emerald-700 justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="NutriSport Pro"
              width={200}
              height={200}
            />
          </div>
          <div>
            <h1 className="text-4xl font-black mb-2 text-emerald-200">
              NutriSport <span className="text-emerald-900">Pro</span>
            </h1>
            <p className="text-sm text-white">Personal nutrition workspace</p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <Notice error={params?.error} message={params?.message} />

          <form action={signIn} className="space-y-4">
            <input type="hidden" name="next" value={params?.next ?? ""} />

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-white">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-white bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-white">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                className="w-full rounded-lg border border-white bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                placeholder="******"
              />
            </label>

            <div className="space-y-3">
              <SubmitButton
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                pendingLabel="Signing in..."
              >
                Sign in
              </SubmitButton>
              <p className="text-center text-xs text-white">
                Private access. Users are created by the app owner.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
