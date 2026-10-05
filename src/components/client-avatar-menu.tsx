"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Edit3 } from "lucide-react";
import { DeleteClientButton } from "@/components/delete-client-button";

type ClientAvatarMenuProps = {
  clientId: string;
  clientName: string;
  clientInitials: string;
  showDelete: boolean;
};

const avatarClassName =
  "flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-bold text-[#0b4f3a] ring-2 ring-emerald-400 ring-offset-2 ring-offset-white";

export function ClientAvatarMenu({
  clientId,
  clientName,
  clientInitials,
  showDelete,
}: ClientAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        className={`${avatarClassName} cursor-pointer transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 sm:hidden`}
        aria-label={`Mostrar opciones de ${clientName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {clientInitials}
      </button>

      <div className={`${avatarClassName} hidden sm:flex`} aria-hidden="true">
        {clientInitials}
      </div>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Opciones de ${clientName}`}
          className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl sm:hidden"
        >
          <Link
            href={`/clients/${clientId}/edit`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Editar datos
          </Link>
          {showDelete ? (
            <DeleteClientButton
              clientId={clientId}
              clientName={clientName}
              onDialogClose={() => setIsOpen(false)}
              triggerClassName="flex w-full items-center justify-start gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              triggerRole="menuitem"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
