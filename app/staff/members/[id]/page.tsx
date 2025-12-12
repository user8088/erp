import StaffDetailClient from "./StaffDetailClient";

export default async function StaffMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffDetailClient id={id} />;
}

