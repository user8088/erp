"use client";

import { User, Paperclip, Tag, Camera } from "lucide-react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "../ui/ToastProvider";
import type { Supplier, Attachment } from "../../lib/types";
import { apiClient, API_BASE_URL, ApiError } from "../../lib/apiClient";
import { cachedGet, invalidateCachedGet } from "../../lib/apiCache";

interface SupplierDetailSidebarProps {
  supplier: Supplier | null;
  onProfilePictureChange?: (imageUrl: string) => void;
}

export default function SupplierDetailSidebar({ supplier, onProfilePictureChange }: SupplierDetailSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Load attachments when supplier changes
  useEffect(() => {
    if (!supplier?.id) return;

    let cancelled = false;

    const loadAttachments = async () => {
      setLoadingAttachments(true);
      try {
        const res = await cachedGet<{ data: Attachment[] }>(
          `/suppliers/${supplier.id}/attachments`,
          () => apiClient.get<{ data: Attachment[] }>(`/suppliers/${supplier.id}/attachments`)
        );
        if (!cancelled) {
          setAttachments(res.data ?? []);
        }
      } catch (e) {
        console.error("Failed to load attachments", e);
        if (!cancelled) {
          if (e instanceof ApiError && e.status !== 404) {
            addToast("Failed to load attachments.", "error");
          }
          setAttachments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAttachments(false);
        }
      }
    };

    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [supplier?.id, addToast]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast("Please select an image file.", "error");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        onProfilePictureChange?.(imageUrl);
        addToast("Profile picture updated successfully.", "success");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      addToast("Failed to upload profile picture.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !supplier?.id) return;

    setUploadingAttachments(true);
    try {
      const uploads: Promise<void>[] = [];

      Array.from(files).forEach((file) => {
        const formData = new FormData();
        formData.append("file", file);

        const uploadPromise = apiClient
          .post<{ attachment: Attachment }>(`/suppliers/${supplier.id}/attachments`, formData)
          .then((res) => {
            const attachment = res.attachment;
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
      // Invalidate cache
      invalidateCachedGet(`/suppliers/${supplier.id}/attachments`);
    } catch (error) {
      console.error("Failed to upload attachments", error);
      addToast("Failed to upload attachments.", "error");
    } finally {
      setUploadingAttachments(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  const handleDownloadAttachment = async (attachmentId: string | number) => {
    if (!supplier?.id) return;

    try {
      const url = `${API_BASE_URL.replace(/\/api\/?$/, "")}/api/attachments/${attachmentId}/download`;
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to download attachment");
      }

      const blob = await response.blob();
      const attachment = attachments.find((a) => a.id === attachmentId);
      const fileName = attachment?.file_name || `attachment-${attachmentId}`;

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download attachment", error);
      addToast("Failed to download attachment.", "error");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    if (!supplier?.id) return;

    if (!confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    try {
      await apiClient.delete(`/suppliers/${supplier.id}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      invalidateCachedGet(`/suppliers/${supplier.id}/attachments`);
      addToast("Attachment deleted.", "success");
    } catch (error) {
      console.error("Failed to delete attachment", error);
      addToast("Failed to delete attachment.", "error");
    }
  };

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="relative w-32 h-32 mx-auto">
        <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden">
          {supplier?.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={supplier.picture_url}
              alt={supplier.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-3xl font-semibold text-white">
                {supplier ? getInitials(supplier.name) : "?"}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-60"
          title="Change profile picture"
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* Sections */}
      <div className=" space-y-2">
        {/* Assigned To */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Assigned To</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p className="mt-1 ml-6 text-xs text-gray-400">Not assigned</p>
        </div>

        {/* Attachments */}
        <div
          className="p-2 rounded hover-bg-gray-50 transition-colors cursor-pointer"
          onClick={() => attachmentוןinputRef.current?.click()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Attachments</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {loadingAttachments ? (
            <p className="mt-1 ml-6 text-xs text-gray-500">Loading attachments...</p>
          ) : attachments.length > 0 ? (
            <div className="mt-1 ml-6 space-y-1">
              <p className="text-xs text-gray-500">
                {attachments.length} document{attachments.length > 1 ? "s" : ""} attached
              </p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between group hover:bg-gray-100 rounded px-1 py-0.5"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownloadAttachment(attachment.id);
                      }}
                      className="text-xs text-gray-600 hover:text-gray-900 truncate flex-1 text-left"
                      title={attachment.file_name}
                    >
                      {attachment.file_name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteAttachment(attachment.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-600 hover:text-red-600 ml-2"
                      title="Delete attachment"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-1 ml-6 text-xs text-gray-400">No documents attached yet.</p>
          )}
          {uploadingAttachments && (
            <p className="mt-1 ml-6 text-[11px] text-gray-500">Uploading...</p>
          )}
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachmentsChange}
          />
        </div>

        {/* Tags */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Tags</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Last edited · {supplier ? new Date(supplier.updated_at).toLocaleDateString() : "—"}</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Created · {supplier ? new Date(supplier.created_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </div>
  );
}


