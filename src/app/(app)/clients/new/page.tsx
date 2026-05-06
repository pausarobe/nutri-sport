import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { createNutritionClient } from "../actions";

type NewClientPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewClientPage({ searchParams }: NewClientPageProps) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="New client"
        description="Start with the essentials. You can add the plan and history after saving."
        action={
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
        }
      />

      <div className="mb-4">
        <Notice error={params?.error} />
      </div>

      <ClientForm action={createNutritionClient} submitLabel="Create client" />
    </>
  );
}
