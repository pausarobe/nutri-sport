import type { Client } from "@/lib/database.types";
import { SubmitButton } from "@/components/submit-button";

type ClientFormProps = {
  action: (formData: FormData) => Promise<void>;
  client?: Client;
  submitLabel: string;
};

export function ClientForm({ action, client, submitLabel }: ClientFormProps) {
  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {client ? <input type="hidden" name="client_id" value={client.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            name="name"
            required
            defaultValue={client?.name ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Client name"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Sex</span>
          <select
            name="sex"
            defaultValue={client?.sex ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Not set</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Birth date</span>
          <input
            name="birth_date"
            type="date"
            defaultValue={client?.birth_date ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Height (cm)</span>
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
          <span className="text-sm font-medium text-slate-700">Weight (kg)</span>
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
          <span className="text-sm font-medium text-slate-700">Phone</span>
          <input
            name="phone"
            defaultValue={client?.phone ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="+34 600 000 000"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Sport</span>
          <input
            name="sport"
            defaultValue={client?.sport ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Running, CrossFit, cycling..."
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Activity level</span>
          <select
            name="activity_level"
            defaultValue={client?.activity_level ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Not set</option>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="very_high">Very high</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Goal</span>
          <input
            name="goal"
            defaultValue={client?.goal ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Fat loss, performance, muscle gain..."
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Allergies</span>
          <textarea
            name="allergies"
            defaultValue={client?.allergies ?? ""}
            rows={3}
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Food allergies, intolerances, supplements to avoid..."
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea
            name="notes"
            defaultValue={client?.notes ?? ""}
            rows={5}
            className="min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            placeholder="Allergies, preferences, medical context, reminders..."
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <SubmitButton
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          pendingLabel="Saving..."
          icon="save"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
