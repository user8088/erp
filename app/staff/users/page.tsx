import UsersActionBar from "../../components/Users/UsersActionBar";
import UsersFilterBar from "../../components/Users/UsersFilterBar";
import UsersTable from "../../components/Users/UsersTable";
import UsersPagination from "../../components/Users/UsersPagination";

export default function UsersPage() {
  return (
    <div className="max-w-full mx-auto min-h-full">
      <UsersActionBar />
      <UsersFilterBar />
      <UsersTable />
      <UsersPagination />
    </div>
  );
}

