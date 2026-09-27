"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Users } from "lucide-react";

const icons = {
  dashboard: LayoutDashboard,
  clients: Users,
  appointments: CalendarDays,
};

type NavLinkProps = {
  href: string;
  label: string;
  icon: keyof typeof icons;
};

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = icons[icon];

  return (
    <Link
      href={href}
      className={`flex min-w-max items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#0b4f3a] font-semibold text-white shadow-[0_2px_8px_rgba(11,79,58,0.14)]"
          : "text-slate-600 hover:bg-[#f2f3ff] hover:text-slate-950"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
