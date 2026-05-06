import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Download,
  Dumbbell,
  Edit3,
  FileText,
  Mail,
  Phone,
  Ruler,
  Scale,
  Target,
  UserRound,
} from "lucide-react";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import type { ClientFile } from "@/lib/database.types";
import { fileSizeLabel, formatDate, initials } from "@/lib/format";
import {
  addClientNote,
  deleteClientFile,
  deleteClientNote,
  deleteNutritionClient,
  savePlan,
  uploadClientFile,
} from "../actions";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type SignedFile = ClientFile & {
  signedUrl?: string;
};

const sexLabels = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

const activityLabels = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  high: "High",
  very_high: "Very high",
};

function clientAge(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Number.isFinite(age) && age >= 0 ? age : null;
}

function clientBmi(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const [clientResult, planResult, notesResult, filesResult] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("plans").select("*").eq("client_id", id).maybeSingle(),
    supabase
      .from("client_notes")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_files")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (clientResult.error || !clientResult.data) notFound();

  const client = clientResult.data;
  const plan = planResult.data;
  const notes = notesResult.data ?? [];
  const age = clientAge(client.birth_date);
  const bmi = clientBmi(client.weight_kg, client.height_cm);
  const storedFiles = filesResult.data ?? [];
  const files: SignedFile[] = await Promise.all(
    storedFiles.map(async (file) => {
      const { data } = await supabase.storage
        .from("client-files")
        .createSignedUrl(file.path, 300);

      return { ...file, signedUrl: data?.signedUrl };
    }),
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-white"
            aria-label="Back to clients"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800">
            {initials(client.name)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {client.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Client since {formatDate(client.created_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/clients/${client.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <Notice
          error={query?.error ?? notesResult.error?.message ?? filesResult.error?.message}
          success={query?.success}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-950">Nutrition plan</h2>
              <span className="text-xs text-slate-400">
                {plan?.updated_at ? `Updated ${formatDate(plan.updated_at)}` : "Draft"}
              </span>
            </div>
            <form action={savePlan} className="space-y-4">
              <input type="hidden" name="client_id" value={client.id} />
              <textarea
                name="content"
                defaultValue={plan?.content ?? ""}
                rows={12}
                className="min-h-72 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                placeholder="Write the nutrition plan here: meals, portions, hydration, reminders, and review notes."
              />
              <div className="flex justify-end">
                <SubmitButton
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  pendingLabel="Saving..."
                  icon="save"
                >
                  Save plan
                </SubmitButton>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">History and notes</h2>
            <form action={addClientNote} className="mt-4 space-y-3">
              <input type="hidden" name="client_id" value={client.id} />
              <textarea
                name="content"
                rows={4}
                className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                placeholder="Add a follow-up note, check-in summary, symptoms, adherence, or next steps."
              />
              <div className="flex justify-end">
                <SubmitButton
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  pendingLabel="Adding..."
                >
                  Add note
                </SubmitButton>
              </div>
            </form>

            <div className="mt-5 divide-y divide-slate-100">
              {notes.length ? (
                notes.map((note) => (
                  <article key={note.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {formatDate(note.created_at)}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {note.content}
                        </p>
                      </div>
                      <form action={deleteClientNote}>
                        <input type="hidden" name="client_id" value={client.id} />
                        <input type="hidden" name="note_id" value={note.id} />
                        <SubmitButton
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          ariaLabel="Delete note"
                          icon="trash"
                        />
                      </form>
                    </div>
                  </article>
                ))
              ) : (
                <p className="py-6 text-sm text-slate-500">
                  No history yet. Add the first note after a client check-in.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Personal info</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Sex</dt>
                  <dd className="font-medium text-slate-700">
                    {client.sex ? sexLabels[client.sex] : "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Age</dt>
                  <dd className="font-medium text-slate-700">
                    {age !== null ? `${age} years` : "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Ruler className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Height</dt>
                  <dd className="font-medium text-slate-700">
                    {client.height_cm ? `${client.height_cm} cm` : "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Scale className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Weight</dt>
                  <dd className="font-medium text-slate-700">
                    {client.weight_kg ? `${client.weight_kg} kg` : "Not set"}
                    {bmi ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        BMI {bmi}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Email</dt>
                  <dd className="font-medium text-slate-700">
                    {client.email || "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Phone</dt>
                  <dd className="font-medium text-slate-700">
                    {client.phone || "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Dumbbell className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Sport</dt>
                  <dd className="font-medium text-slate-700">
                    {client.sport || "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Activity className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Activity</dt>
                  <dd className="font-medium text-slate-700">
                    {client.activity_level
                      ? activityLabels[client.activity_level]
                      : "Not set"}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Target className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-slate-400">Goal</dt>
                  <dd className="font-medium text-slate-700">
                    {client.goal || "Not set"}
                  </dd>
                </div>
              </div>
            </dl>
            {client.allergies ? (
              <div className="mt-5 rounded-lg bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Allergies
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                  {client.allergies}
                </p>
              </div>
            ) : null}
            {client.notes ? (
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notes
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {client.notes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Client files</h2>
            <form action={uploadClientFile} className="mt-4 space-y-3">
              <input type="hidden" name="client_id" value={client.id} />
              <input
                name="file"
                type="file"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
              <SubmitButton
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                pendingLabel="Uploading..."
                icon="upload"
              >
                Upload file
              </SubmitButton>
            </form>

            <div className="mt-5 space-y-3">
              {files.length ? (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      {file.signedUrl ? (
                        <a
                          href={file.signedUrl}
                          className="truncate text-sm font-medium text-slate-800 hover:text-emerald-800"
                        >
                          {file.file_name}
                        </a>
                      ) : (
                        <div className="truncate text-sm font-medium text-slate-800">
                          {file.file_name}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        {fileSizeLabel(file.size_bytes)}
                      </div>
                    </div>
                    {file.signedUrl ? (
                      <a
                        href={file.signedUrl}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                        aria-label={`Download ${file.file_name}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                    <form action={deleteClientFile}>
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="file_id" value={file.id} />
                      <SubmitButton
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        ariaLabel={`Delete ${file.file_name}`}
                        icon="trash"
                      />
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No files uploaded yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-red-700">Danger zone</h2>
            <p className="mt-2 text-sm text-slate-500">
              Deletes this client, their plan, notes, and stored files.
            </p>
            <form action={deleteNutritionClient} className="mt-4">
              <input type="hidden" name="client_id" value={client.id} />
              <SubmitButton
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                pendingLabel="Deleting..."
                icon="trash"
              >
                Delete client
              </SubmitButton>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
