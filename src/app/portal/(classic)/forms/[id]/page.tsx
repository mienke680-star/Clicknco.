import { FormDetailClient } from "./form-detail-client";

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormDetailClient formId={id} />;
}
