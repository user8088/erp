"use client";

import { useState } from "react";
import { Upload, X, FileImage } from "lucide-react";
import type { StaffMember } from "../../lib/types";

interface StaffMoreInformationProps {
  staff: StaffMember;
}

export default function StaffMoreInformation({ staff }: StaffMoreInformationProps) {
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === "front") setCnicFront(file);
    if (type === "back") setCnicBack(file);
    // For UI parity, also reflect in attachments list
    const row: AttachmentRow = {
      id: `${Date.now()}`,
      label: type === "front" ? "CNIC Front" : "CNIC Back",
      fileName: file.name,
    };
    setAttachments((prev) => [...prev, row]);
  };

  const removeFile = (type: "front" | "back") => {
    if (type === "front") setCnicFront(null);
    if (type === "back") setCnicBack(null);
  };

  const documents = attachments;

  const handleDownload = (id: string) => {
    console.log("Download attachment", id);
  };

  const handleDeleteAttachment = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      setDeletingId(null);
    }, 300);
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
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
                documents.map((doc) => (
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

