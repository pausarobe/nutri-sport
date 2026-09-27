"use client";

import { useRef } from "react";
import { Trash2, X } from "lucide-react";
import { deleteNutritionClient } from "@/app/(app)/clients/actions";
import { SubmitButton } from "@/components/submit-button";

type DeleteClientButtonProps = {
  clientId: string;
  clientName: string;
};

export function DeleteClientButton({
  clientId,
  clientName,
}: DeleteClientButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Eliminar cliente
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialogRef.current?.close();
          }
        }}
        className="m-auto w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Eliminar cliente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar confirmación"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            Se eliminará <strong>{clientName}</strong> junto con sus planes,
            mediciones, citas, notas y archivos guardados.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <form action={deleteNutritionClient}>
              <input type="hidden" name="client_id" value={clientId} />
              <SubmitButton
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                pendingLabel="Eliminando..."
                icon="trash"
              >
                Eliminar definitivamente
              </SubmitButton>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
