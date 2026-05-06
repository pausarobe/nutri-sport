import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { updateNutritionClient } from "../../actions";

type EditClientPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function EditClientPage({
  params,
  searchParams,
}: EditClientPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${client.name}`}
        description="Update the profile information used across the client workspace."
        action={
          <Link
            href={`/clients/${client.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
        }
      />

      <div className="mb-4">
        <Notice error={query?.error} />
      </div>

      <ClientForm
        client={client}
        action={updateNutritionClient}
        submitLabel="Save changes"
      />
    </>
  );
}
