"use client";

import { User, Paperclip, Tag, Camera } from "lucide-react";
import { Plus } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useToast } from "../ui/ToastProvider";
import { useRouter } from "next/navigation";
import type { Customer, Attachment, CustomerTag } from "../../lib/types";
import { apiClient, API_BASE_URL, ApiError, customerTagsApi } from "../../lib/apiClient";
import { cachedGet, invalidateCachedGet } from "../../lib/apiCache";

interface CustomerDetailSidebarProps {
  customer: Customer | null;
  onProfilePictureChange?: (imageUrl: string) => void;
}

export default function CustomerDetailSidebar({ customer, onProfilePictureChange }: CustomerDetailSidebarProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [availableTags, setAvailableTags] = useState<CustomerTag[]>([]);
  const [assignedTags, setAssignedTags] = useState<CustomerTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Load available tags
  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        const response = await customerTagsApi.getTags({ per_page: 100 });
        setAvailableTags(response.data);
      } catch (error) {
        console.error("Failed to load available tags:", error);
      }
    };
    void loadAvailableTags();
  }, []);

  // Load customer tags when customer changes
  useEffect(() => {
    if (!customer?.id) return;
    
    const loadCustomerTags = async () => {
      try {
        setLoadingTags(true);
        const response = await customerTagsApi.getCustomerTags(customer.id);
        setAssignedTags(response.data);
      } catch (error) {
        console.error("Failed to load customer tags:", error);
        setAssignedTags([]);
      } finally {
        setLoadingTags(false);
      }
    };
    
    void loadCustomerTags();
  }, [customer?.id]);

  // Load attachments when customer changes
  useEffect(() => {
    if (!customer?.id) return;

    let cancelled = false;

    const loadAttachments = async () => {
      setLoadingAttachments(true);
      try {
        const res = await cachedGet<{ data: Attachment[] }>(
          `/customers/${customer.id}/attachments`,
          () => apiClient.get<{ data: Attachment[] }>(`/customers/${customer.id}/attachments`)
        );
        if (!cancelled) {
          setAttachments(res.data ?? []);
        }
      } catch (e) {
        console.error("Failed to load attachments", e);
        if (!cancelled) {
          // Don't show error if endpoint doesn't exist yet (404)
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
  }, [customer?.id, addToast]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
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

  const handleAttachmentsChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !customer?.id) return;

    setUploadingAttachments(true);
    try {
      const uploads: Promise<void>[] = [];

      Array.from(files).forEach((file) => {
        const formData = new FormData();
        formData.append("file", file);

        const uploadPromise = apiClient
          .post<{ attachment: Attachment }>(`/customers/${customer.id}/attachments`, formData)
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
      invalidateCachedGet(`/customers/${customer.id}/attachments`);
    } catch (error) {
      console.error("Failed to upload attachments", error);
      addToast("Failed to upload attachments.", "error");
    } finally {
      setUploadingAttachments(false);
      // clear value so same file can be re-selected
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  const handleDownloadAttachment = async (attachmentId: string | number) => {
    if (!customer?.id) return;

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
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download attachment", error);
      addToast("Failed to download attachment.", "error");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    if (!customer?.id) return;

    if (!confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    try {
      await apiClient.delete(`/customers/${customer.id}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      invalidateCachedGet(`/customers/${customer.id}/attachments`);
      addToast("Attachment deleted.", "success");
    } catch (error) {
      console.error("Failed to delete attachment", error);
      addToast("Failed to delete attachment.", "error");
    }
  };

  const handleToggleTag = async (tagId: number) => {
    if (!customer?.id) return;
    
    const isAssigned = assignedTags.some(t => t.id === tagId);
    
    try {
      if (isAssigned) {
        await customerTagsApi.removeTagFromCustomer(tagId, customer.id);
        setAssignedTags(assignedTags.filter((t) => t.id !== tagId));
        addToast("Tag removed.", "success");
      } else {
        await customerTagsApi.assignTagToCustomer(tagId, customer.id);
        const tag = availableTags.find(t => t.id === tagId);
        if (tag) {
          setAssignedTags([...assignedTags, tag]);
        }
        addToast("Tag assigned.", "success");
      }
    } catch (error: unknown) {
      console.error("Failed to toggle tag:", error);
      let errorMessage = "Failed to update tag.";
      if (error && typeof error === "object" && "data" in error) {
        const errorData = (error as { data?: { message?: string } }).data;
        errorMessage = errorData?.message || errorMessage;
      }
      addToast(errorMessage, "error");
    }
  };


  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="relative w-32 h-32 mx-auto">
        <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden">
          {customer?.picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customer.picture_url}
              alt={customer.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-3xl font-semibold text-white">
                {customer ? getInitials(customer.name) : "?"}
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
      <div className="space-y-2">
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
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => attachmentInputRef.current?.click()}
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
                attachmentInputRef.current?.click();
              }}
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
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-600 hover:text-red-800 ml-2"
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
          {loadingTags ? (
            <p className="mt-1 ml-6 text-xs text-gray-500">Loading tags...</p>
          ) : assignedTags.length > 0 ? (
            <div className="mt-1 ml-6 flex flex-wrap gap-1">
              {assignedTags.map((tag) => (
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
          ) : (
            <p className="mt-1 ml-6 text-xs text-gray-400">No tags assigned yet.</p>
          )}
          {showTagMenu && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
              {availableTags.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No tags yet. <button
                    type="button"
                    onClick={() => router.push("/customer/tags")}
                    className="text-blue-600 hover:underline"
                  >
                    Create them from Customer → Tag Manager
                  </button>.
                </div>
              ) : (
                availableTags.map((tag) => {
                  const isAssigned = assignedTags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        void handleToggleTag(tag.id);
                      }}
                      className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <span>{tag.name}</span>
                      {isAssigned && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Last edited · {customer ? new Date(customer.updated_at).toLocaleDateString() : "—"}</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Created · {customer ? new Date(customer.created_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </div>
  );
}
