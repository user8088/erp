"use client";

import { useState } from "react";
import UsersActionBar from "../../components/Users/UsersActionBar";
import UsersFilterBar from "../../components/Users/UsersFilterBar";
import UsersTable from "../../components/Users/UsersTable";
import UsersPagination from "../../components/Users/UsersPagination";
import UsersImageView from "../../components/Users/UsersImageView";
import { useUsersList } from "../../components/Users/useUsersList";

export default function UsersPage() {
  const [viewMode, setViewMode] = useState<"list" | "image">("list");
  const {
    users,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
  } = useUsersList();

  return (
    <div className="max-w-full mx-auto min-h-full">
      <UsersActionBar viewMode={viewMode} onChangeView={setViewMode} />
      <UsersFilterBar />
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}
      {viewMode === "list" ? (
        <UsersTable users={users} loading={loading} />
      ) : (
        <UsersImageView users={users} loading={loading} />
      )}
      <UsersPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}

