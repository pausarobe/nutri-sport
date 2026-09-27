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
        title="Nuevo cliente"
        description="Empieza por los datos esenciales. Podrás añadir el plan y el historial después de guardar."
        action={
          <Link
            href="/clients"
            className="clinical-button-secondary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
        }
      />

      <div className="mb-4">
        <Notice error={params?.error} />
      </div>

      <ClientForm action={createNutritionClient} submitLabel="Crear cliente" />
    </>
  );
}
