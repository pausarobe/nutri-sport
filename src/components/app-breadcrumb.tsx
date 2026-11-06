"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppBreadcrumb() {
  const pathname = usePathname();
  const currentSection = pathname.startsWith("/clients")
    ? "Clientes"
    : pathname.startsWith("/appointments")
      ? "Citas"
      : pathname.startsWith("/bonos")
        ? "Bonos"
        : pathname.startsWith("/planes")
          ? "Planes"
      : "Dashboard";

  return (
    <nav
      className="flex items-center gap-2 text-sm text-slate-500"
      aria-label="Migas de pan"
    >
      <Link
        href="/dashboard"
        className="font-medium text-slate-700 transition hover:text-emerald-700"
      >
        Portal clínico
      </Link>
      <ChevronRight
        className="h-4 w-4 text-slate-400"
        aria-hidden="true"
      />
      <span className="font-semibold text-emerald-700" aria-current="page">
        {currentSection}
      </span>
    </nav>
  );
}
