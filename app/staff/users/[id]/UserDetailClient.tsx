"use client";

import { useEffect, useState } from "react";
import UserDetailHeader from "../../../components/UserDetail/UserDetailHeader";
import UserDetailSidebar from "../../../components/UserDetail/UserDetailSidebar";
import UserDetailContent from "../../../components/UserDetail/UserDetailContent";
import { apiClient } from "../../../lib/apiClient";
import type { User, UserProfile } from "../../../lib/types";

interface UserDetailClientProps {
  id: string;
}

export default function UserDetailClient({ id }: UserDetailClientProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  // Simple per-user in-memory cache so navigating away/back doesn't refetch
  // within the same page session.
  const cacheKey = id;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      // Use a global cache on window to avoid refetching while SPA is alive
      const w = window as unknown as {
        __userDetailCache__?: Record<
          string,
          { user: User; profile: UserProfile | null }
        >;
      };
      if (!w.__userDetailCache__) {
        w.__userDetailCache__ = {};
      }
      const existing = w.__userDetailCache__[cacheKey];
      if (existing && !cancelled) {
        setUser(existing.user);
        setProfile(existing.profile);
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.get<{
          user: User;
          profile?: UserProfile | null;
        }>(`/users/${id}`);
        if (!cancelled) {
          const nextProfile = data.profile ?? null;
          setUser(data.user);
          setProfile(nextProfile);
          w.__userDetailCache__[cacheKey] = {
            user: data.user,
            profile: nextProfile,
          };
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load user.";
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, cacheKey]);

  return (
    <div className="max-w-full mx-auto min-h-full">
      <UserDetailHeader
        userId={id}
        saving={saving}
        onSave={() => setSaveVersion((v) => v + 1)}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
      />
      <div className="flex gap-6 mt-4">
        {showSidebar && <UserDetailSidebar userId={id} />}
        <div className="flex-1">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          {loading && !user ? (
            <div className="text-sm text-gray-500">Loading profile...</div>
          ) : (
            <UserDetailContent
              userId={id}
              user={user}
              profile={profile}
              onUserChange={setUser}
              onProfileChange={setProfile}
              saveSignal={saveVersion}
              onSavingChange={setSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}


