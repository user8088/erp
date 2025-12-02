"use client";

import { useEffect, useRef, useState } from "react";
import { User, Paperclip, Tag } from "lucide-react";
import { Plus } from "lucide-react";
import type { Attachment, User as BackendUser } from "../../lib/types";
import { apiClient } from "../../lib/apiClient";
import { cachedGet, invalidateCachedGet } from "../../lib/apiCache";
import { useToast } from "../ui/ToastProvider";
import { useUser } from "../User/UserContext";

interface UserDetailSidebarProps {
  userId: string;
}

interface SavedTag {
  id: string;
  name: string;
  color: string;
}

const TAG_STORAGE_KEY = "erp_tags";

export default function UserDetailSidebar({ userId }: UserDetailSidebarProps) {
  const { addToast } = useToast();
  const { user: currentUser } = useUser();

  const [assignedToId, setAssignedToId] = useState<string | number | null>(null);
  const [assignedToName, setAssignedToName] = useState<string | null>(null);
  const [possibleAssignees, setPossibleAssignees] = useState<BackendUser[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const [availableTags, setAvailableTags] = useState<SavedTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load tags from local storage (still purely frontend until tag API exists)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TAG_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setAvailableTags(
          parsed.filter(
            (t: any) =>
              t &&
              typeof t.id === "string" &&
              typeof t.name === "string" &&
              typeof t.color === "string"
          )
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // Load current user + assignment + attachments from backend
  useEffect(() => {
    let cancelled = false;

    const loadUserAndAssignees = async () => {
      setLoadingAssignees(true);
      try {
        // Load current user to get assigned_to_user_id
        const res = await cachedGet<{
          user: BackendUser & { assigned_to_user_id?: number | null };
        }>(`/users/${userId}`, () =>
          apiClient.get<{ user: BackendUser & { assigned_to_user_id?: number | null } }>(
            `/users/${userId}`
          )
        );

        if (cancelled) return;

        const currentAssignedId = (res.user as any).assigned_to_user_id ?? null;
        setAssignedToId(currentAssignedId);

        // Load potential assignees (first page of active users)
        const list = await cachedGet<{
          data: (BackendUser & { assigned_to_user_id?: number | null })[];
        }>(`/users?status=active&per_page=50`, () =>
          apiClient.get<{
            data: (BackendUser & { assigned_to_user_id?: number | null })[];
          }>(`/users?status=active&per_page=50`)
        );

        if (cancelled) return;

        setPossibleAssignees(list.data ?? []);

        if (currentAssignedId) {
          const match = list.data.find((u) => String(u.id) === String(currentAssignedId));
          if (match) {
            setAssignedToName(match.full_name);
          } else {
            // Fallback: fetch that one user
            try {
            const assignedUserRes = await cachedGet<{ user: BackendUser }>(
              `/users/${currentAssignedId}`,
              () => apiClient.get<{ user: BackendUser }>(`/users/${currentAssignedId}`)
            );
              if (!cancelled) {
                setAssignedToName(assignedUserRes.user.full_name);
              }
            } catch {
              // ignore, leave as null
            }
          }
        } else {
          setAssignedToName(null);
        }
      } catch (e) {
        console.error("Failed to load user / assignees", e);
        if (!cancelled) {
          addToast("Failed to load assignment options.", "error");
        }
      } finally {
        if (!cancelled) {
          setLoadingAssignees(false);
        }
      }
    };

    const loadAttachments = async () => {
      setLoadingAttachments(true);
      try {
        const res = await cachedGet<{ data: Attachment[] }>(
          `/users/${userId}/attachments`,
          () => apiClient.get<{ data: Attachment[] }>(`/users/${userId}/attachments`)
        );
        if (!cancelled) {
          setAttachments(res.data ?? []);
        }
      } catch (e) {
        console.error("Failed to load attachments", e);
        if (!cancelled) {
          addToast("Failed to load attachments.", "error");
        }
      } finally {
        if (!cancelled) {
          setLoadingAttachments(false);
        }
      }
    };

    void loadUserAndAssignees();
    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [userId, addToast]);

  const handleChangeAssignee = async (newId: string | number | null) => {
    // Forbid assigning a user to themselves on the frontend
    if (newId && currentUser && String(newId) === String(currentUser.id)) {
      addToast("You cannot assign a user to themselves.", "error");
      return;
    }

    setUpdatingAssignee(true);
    try {
      const body = { assigned_to_user_id: newId === null ? null : Number(newId) };
      const res = await apiClient.patch<{
        user: BackendUser & { assigned_to_user_id?: number | null };
      }>(
        `/users/${userId}/assigned-to`,
        body
      );

      const updatedAssignedId = (res.user as any).assigned_to_user_id ?? null;
      setAssignedToId(updatedAssignedId);

      if (updatedAssignedId) {
        const match = possibleAssignees.find(
          (u) => String(u.id) === String(updatedAssignedId)
        );
        if (match) {
          setAssignedToName(match.full_name);
        } else {
          // Best-effort fetch
          try {
            const assignedUserRes = await apiClient.get<{ user: BackendUser }>(
              `/users/${updatedAssignedId}`
            );
            setAssignedToName(assignedUserRes.user.full_name);
          } catch {
            setAssignedToName(null);
          }
        }
      } else {
        setAssignedToName(null);
      }

      addToast("Assignment updated.", "success");

      // Close dropdown only after a successful assignment/unassignment
      setShowAssignDropdown(false);
    } catch (e) {
      console.error("Failed to update assignment", e);
      addToast("Failed to update assignment.", "error");
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const handleAttachmentsChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAttachments(true);
    try {
      const uploads: Promise<void>[] = [];

      Array.from(files).forEach((file) => {
        const formData = new FormData();
        formData.append("file", file);

        const uploadPromise = apiClient
          .post<{ attachment: Attachment }>(`/users/${userId}/attachments`, formData)
          .then((res) => {
            const attachment = (res as any).attachment as Attachment | undefined;
            if (attachment) {
              setAttachments((prev) => [...prev, attachment]);
            }
          })
          .catch((err) => {
            console.error("Failed to upload attachment", err);
            addToast("Failed to upload one of the attachments.", "error");
          });

        uploads.push(uploadPromise);
      });

      await Promise.all(uploads);
      addToast("Attachment(s) uploaded.", "success");
    } finally {
      setUploadingAttachments(false);
      // clear value so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center mx-auto">
        <span className="text-3xl font-semibold text-gray-600">AM</span>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {/* Assigned To (backed by PATCH /api/users/{id}/assigned-to) */}
        <div
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setShowAssignDropdown((open) => !open)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Assigned To</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssignDropdown((open) => !open);
              }}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {assignedToName && (
            <p className="mt-1 ml-6 text-xs text-gray-500">
              Assigned to {assignedToName}
            </p>
          )}
          {showAssignDropdown && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm">
              <button
                type="button"
                disabled={updatingAssignee}
                onClick={() => {
                  void handleChangeAssignee(null);
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Unassigned
              </button>
              <div className="border-t border-gray-100" />
              {loadingAssignees && (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Loading users...
                </div>
              )}
              {!loadingAssignees &&
                possibleAssignees.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={updatingAssignee}
                    onClick={() => {
                      void handleChangeAssignee(u.id);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {u.full_name}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Attachments */}
        <div
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Attachments</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {loadingAttachments ? (
            <p className="mt-1 ml-6 text-xs text-gray-500">Loading attachments...</p>
          ) : attachments.length > 0 ? (
            <p className="mt-1 ml-6 text-xs text-gray-500">
              {attachments.length} document{attachments.length > 1 ? "s" : ""} attached
            </p>
          ) : (
            <p className="mt-1 ml-6 text-xs text-gray-400">No documents attached yet.</p>
          )}
          {uploadingAttachments && (
            <p className="mt-1 ml-6 text-[11px] text-gray-500">Uploading...</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachmentsChange}
          />
        </div>

        {/* Tags */}
        <div
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setShowTagMenu((open) => !open)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Tags</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTagMenu((open) => !open);
              }}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {selectedTags.length > 0 && (
            <div className="mt-1 ml-6 flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: `${tag.color}1A`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {showTagMenu && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
              {availableTags.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No tags yet. Create them from Staff → Tag Manager.
                </div>
              ) : (
                availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <span>{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Administrator last edited this · 17 hours ago</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Administrator created this · 17 hours ago</p>
        </div>
      </div>
    </div>
  );
}

