"use client";

import { useState } from "react";
import { uploadClientFile } from "@/app/(app)/clients/actions";
import { SubmitButton } from "@/components/submit-button";
import {
  CLIENT_FILE_ACCEPT,
  CLIENT_FILE_FORMATS_LABEL,
  CLIENT_FILE_MAX_SIZE_LABEL,
  clientFileValidationError,
} from "@/lib/client-files";

export function ClientFileUpload({ clientId }: { clientId: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={uploadClientFile}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      onSubmit={(event) => {
        const input = event.currentTarget.elements.namedItem("file");
        const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
        const validationError = file
          ? clientFileValidationError(file)
          : "Selecciona un archivo.";

        if (validationError) {
          event.preventDefault();
          setError(validationError);
        }
      }}
    >
      <input type="hidden" name="client_id" value={clientId} />
      <div className="min-w-0 flex-1">
        <input
          name="file"
          type="file"
          required
          accept={CLIENT_FILE_ACCEPT}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? "client-file-requirements client-file-error"
              : "client-file-requirements"
          }
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setError(file ? clientFileValidationError(file) : null);
          }}
          className={`block w-full cursor-pointer rounded-lg border bg-white text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 ${error ? "border-red-300" : "border-slate-200"}`}
        />
        <p
          id="client-file-requirements"
          className="mt-1.5 text-xs leading-5 text-slate-500"
        >
          {CLIENT_FILE_FORMATS_LABEL}. Máximo {CLIENT_FILE_MAX_SIZE_LABEL} por
          archivo.
        </p>
        {error ? (
          <p
            id="client-file-error"
            role="alert"
            className="mt-1 text-xs font-semibold text-red-600"
          >
            {error}
          </p>
        ) : null}
      </div>
      <SubmitButton
        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        pendingLabel="Subiendo..."
        icon="upload"
        disabled={Boolean(error)}
      >
        Subir archivo
      </SubmitButton>
    </form>
  );
}
