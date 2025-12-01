"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "../../lib/types";

interface UsersImageViewProps {
  users: User[];
  loading?: boolean;
}

export default function UsersImageView({ users, loading }: UsersImageViewProps) {
  const router = useRouter();

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading && users.length === 0 && (
          <div className="col-span-full text-sm text-gray-500">
            Loading users...
          </div>
        )}
        {users.map((user) => {
          const initials = user.full_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase();

          return (
            <button
              key={user.id}
              onClick={() => router.push(`/staff/users/${user.id}`)}
              className="text-left bg-white border border-gray-200 rounded-lg p-6 hover:border-orange-400 transition-colors flex flex-col justify-between min-h-[220px]"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-500">
                  {initials}
                </div>
                <Heart className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {user.full_name}
                </div>
                <div className="text-xs text-gray-500">
                  {user.user_type ?? ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


