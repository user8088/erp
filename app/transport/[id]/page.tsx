import VehicleDetailClient from "./VehicleDetailClient";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetailClient id={id} />;
}

