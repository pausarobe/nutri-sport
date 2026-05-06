"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";

const icons = {
  dashboard: LayoutDashboard,
  clients: Users,
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
      className={`flex items-center gap-3 border-l-4 px-5 py-3 text-sm transition ${
        active
          ? "border-emerald-700 bg-emerald-50 text-emerald-800"
          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
