"use client";

import { Printer } from "lucide-react";

type PrintButtonProps = {
  label?: string;
  className: string;
};

export function PrintButton({ label = "Imprimir / PDF", className }: PrintButtonProps) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
