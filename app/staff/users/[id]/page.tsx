import UserDetailHeader from "../../../components/UserDetail/UserDetailHeader";
import UserDetailSidebar from "../../../components/UserDetail/UserDetailSidebar";
import UserDetailContent from "../../../components/UserDetail/UserDetailContent";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="max-w-full mx-auto min-h-full">
      <UserDetailHeader userId={id} />
      <div className="flex gap-6 mt-4">
        <UserDetailSidebar userId={id} />
        <UserDetailContent userId={id} />
      </div>
    </div>
  );
}

