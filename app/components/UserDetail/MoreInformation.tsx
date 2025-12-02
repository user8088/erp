"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, FileImage } from "lucide-react";
import type { Attachment, User, UserProfile } from "../../lib/types";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import { cachedGet, invalidateCachedGet } from "../../lib/apiCache";
import { useToast } from "../ui/ToastProvider";

interface MoreInformationProps {
  userId: string;
  profile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile | null) => void;
  user?: User | null;
  externalSaveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function MoreInformation({
  userId,
  profile,
  onProfileUpdated,
  user,
  externalSaveSignal,
  onSavingChange,
}: MoreInformationProps) {
  const { addToast } = useToast();
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  // Flags reserved for future UI (e.g. spinners near CNIC cards)
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    setAddress(profile?.address ?? user?.address ?? "");
  }, [profile, user]);

  // Load existing attachments from backend
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, addToast]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "front") {
        setCnicFront(file);
      } else {
        setCnicBack(file);
      }

      // Immediately upload CNIC file as an attachment
      const upload = async () => {
        try {
          if (type === "front") {
            setUploadingFront(true);
          } else {
            setUploadingBack(true);
          }
          const formData = new FormData();
          formData.append("file", file);
          const res = await apiClient.post<{ attachment: Attachment }>(
            `/users/${userId}/attachments`,
            formData
          );
          const attachment = res.attachment;
          if (attachment) {
            setAttachments((prev: Attachment[]) => [...prev, attachment]);
          }
          // Underlying data changed; clear cached list for future visits.
          invalidateCachedGet(`/users/${userId}/attachments`);
          addToast("CNIC uploaded.", "success");
        } catch (err) {
          console.error("Failed to upload CNIC", err);
          addToast("Failed to upload CNIC.", "error");
        } finally {
          if (type === "front") {
            setUploadingFront(false);
          } else {
            setUploadingBack(false);
          }
        }
      };

      void upload();
    }
  };

  const removeFile = (type: "front" | "back") => {
    if (type === "front") {
      setCnicFront(null);
    } else {
      setCnicBack(null);
    }
  };

  const documents = attachments.map((att: Attachment) => ({
    id: String(att.id),
    label: "Attachment",
    fileName: att.file_name,
  }));

  const handleDownload = async (attachmentId: string | number) => {
    try {
      // Use browser navigation to the download endpoint; cookies/headers are already attached
      const url = `${API_BASE_URL.replace(/\/api\/?$/, "")}/api/attachments/${attachmentId}/download`;
      window.open(url, "_blank");
    } catch (e) {
      console.error("Failed to start download", e);
      addToast("Failed to start download.", "error");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string | number) => {
    setDeletingId(attachmentId);
    try {
      await apiClient.delete(
        `/users/${userId}/attachments/${attachmentId}`
      );
      setAttachments((prev: Attachment[]) =>
        prev.filter((a) => a.id !== attachmentId)
      );
      addToast("Attachment deleted.", "success");
    } catch (e) {
      console.error("Failed to delete attachment", e);
      addToast("Failed to delete attachment.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to save address when global Save button is used
  const saveAddress = async () => {
    if (!address && !profile?.address) {
      // Nothing to save; skip noisy calls.
      return;
    }
    setSavingAddress(true);
    onSavingChange?.(true);
    try {
      const res = await apiClient.put<{ user: User }>(`/users/${userId}/profile`, {
        address,
      });

      const updatedProfile: UserProfile = {
        user_id: profile?.user_id ?? res.user.id,
        ...(profile ?? {}),
        address: res.user.address ?? address,
      };

      onProfileUpdated(updatedProfile);
      addToast("Profile address saved.", "success");
    } catch (e) {
      console.error(e);
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to save address.";
      addToast(message, "error");
    } finally {
      setSavingAddress(false);
      onSavingChange?.(false);
    }
  };

  // React to top Save button
  const lastSignalRef = useRef<number | null>(null);
  useEffect(() => {
    if (externalSaveSignal == null) return;

    if (lastSignalRef.current === null) {
      lastSignalRef.current = externalSaveSignal;
      return;
    }

    if (lastSignalRef.current === externalSaveSignal) return;
    lastSignalRef.current = externalSaveSignal;
    void saveAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSaveSignal]);

  return (
    <div className="space-y-6">
      {/* CNIC Front */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">CNIC Front Copy</h3>
        {!cnicFront ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, "front")}
            />
          </label>
        ) : (
          <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <FileImage className="w-16 h-16 text-gray-400" />
            </div>
            <div className="absolute top-2 right-2">
              <button
                onClick={() => removeFile("front")}
                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-xs text-gray-600 bg-white/90 px-2 py-1 rounded truncate">
                {cnicFront.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CNIC Back */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">CNIC Back Copy</h3>
        {!cnicBack ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, "back")}
            />
          </label>
        ) : (
          <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <FileImage className="w-16 h-16 text-gray-400" />
            </div>
            <div className="absolute top-2 right-2">
              <button
                onClick={() => removeFile("back")}
                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-xs text-gray-600 bg-white/90 px-2 py-1 rounded truncate">
                {cnicBack.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Address */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter full address..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
        />
        {/* Address is saved via the global Save button in the header */}
        {savingAddress && (
          <p className="mt-2 text-xs text-gray-500">Saving address...</p>
        )}
      </div>

      {/* Attached Documents Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Attached Documents
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Document
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  File Name
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-sm text-gray-500 text-center"
                  >
                    No documents attached yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc: { id: string; label: string; fileName: string }) => (
                  <tr key={doc.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-800">{doc.label}</td>
                    <td className="px-4 py-2 text-gray-600">{doc.fileName}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === doc.id}
                        onClick={() => handleDeleteAttachment(doc.id)}
                        className="text-xs text-red-600 hover:underline disabled:opacity-60"
                      >
                        {deletingId === doc.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

