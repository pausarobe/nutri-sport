import type { Client } from "@/lib/database.types";
import { SubmitButton } from "@/components/submit-button";
import { CLIENT_STATUS_OPTIONS } from "@/lib/client-status";

type ClientFormProps = {
  action: (formData: FormData) => Promise<void>;
  client?: Client;
  submitLabel: string;
};

export function ClientForm({ action, client, submitLabel }: ClientFormProps) {
  return (
    <form action={action} className="clinical-card p-5 sm:p-6">
      {client ? <input type="hidden" name="client_id" value={client.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Nombre</span>
          <input
            name="name"
            required
            defaultValue={client?.name ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Nombre del cliente"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Estado</span>
          <select
            name="status"
            required
            defaultValue={client?.status ?? "active"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            {CLIENT_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <span className="block text-xs leading-5 text-slate-400">
            Los clientes inactivos conservan todo su historial.
          </span>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Sexo</span>
          <select
            name="sex"
            required
            defaultValue={client?.sex ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="" disabled>Selecciona una opción</option>
            <option value="female">Mujer</option>
            <option value="male">Hombre</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Fecha de nacimiento</span>
          <input
            name="birth_date"
            type="date"
            defaultValue={client?.birth_date ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Altura (cm)</span>
          <input
            name="height_cm"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            defaultValue={client?.height_cm ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="175"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Peso (kg)</span>
          <input
            name="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            defaultValue={client?.weight_kg ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="70"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="client@example.com"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Teléfono</span>
          <input
            name="phone"
            defaultValue={client?.phone ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="+34 600 000 000"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Deporte</span>
          <input
            name="sport"
            defaultValue={client?.sport ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Running, CrossFit, cycling..."
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Nivel de actividad</span>
          <select
            name="activity_level"
            defaultValue={client?.activity_level ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">No indicado</option>
            <option value="sedentary">Sedentario</option>
            <option value="light">Ligero</option>
            <option value="moderate">Moderado</option>
            <option value="high">Alto</option>
            <option value="very_high">Muy alto</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Objetivo</span>
          <input
            name="goal"
            defaultValue={client?.goal ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Pérdida de grasa, rendimiento, ganancia muscular..."
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Alergias</span>
          <textarea
            name="allergies"
            defaultValue={client?.allergies ?? ""}
            rows={3}
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Alergias, intolerancias o suplementos que evitar..."
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notas</span>
          <textarea
            name="notes"
            defaultValue={client?.notes ?? ""}
            rows={5}
            className="min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Preferencias, contexto médico, recordatorios..."
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <SubmitButton
          className="clinical-button-primary"
          pendingLabel="Guardando..."
          icon="save"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
