"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileText,
  FolderOpen,
  Settings2,
  Calendar,
  Search,
  ChevronRight,
  ChevronDown,
  Download,
  Trash2,
  Filter,
  Plus,
  X,
  FileIcon,
  Clock,
  Loader2
} from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { storeDocumentsApi } from "../lib/apiClient";
import { StoreDocument } from "../lib/types";

export default function StoreSettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<StoreDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // New document form state
  const [newDoc, setNewDoc] = useState<{
    name: string;
    type: string;
    category: string;
    file: File | null;
  }>({
    name: "",
    type: "Agreement",
    category: "General",
    file: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await storeDocumentsApi.list();
      setDocuments(response.data);

      // Auto-expand the most recent year
      if (response.data.length > 0) {
        const latestYear = new Date(response.data[0].upload_date).getFullYear().toString();
        setExpandedGroups(prev => ({ ...prev, [latestYear]: true }));
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      addToast("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  // Organize documents by Year > Month
  const organizedDocs = useMemo(() => {
    const groups: Record<string, Record<string, StoreDocument[]>> = {};

    filteredDocuments.forEach(doc => {
      const date = new Date(doc.upload_date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('default', { month: 'long' });

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];

      groups[year][month].push(doc);
    });

    return groups;
  }, [filteredDocuments]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDoc(prev => ({ ...prev, file, name: prev.name || file.name.split('.')[0] }));
    }
  };

  const saveDocument = async () => {
    if (!newDoc.file || !newDoc.name) {
      addToast("Please provide a name and select a file", "error");
      return;
    }

    setActionLoading(true);
    try {
      await storeDocumentsApi.upload({
        file: newDoc.file,
        name: newDoc.name,
        type: newDoc.type,
        category: newDoc.category
      });

      addToast("Document uploaded successfully", "success");
      setIsUploadModalOpen(false);
      setNewDoc({ name: "", type: "Agreement", category: "General", file: null });
      fetchDocuments();
    } catch (error) {
      console.error("Upload failed:", error);
      addToast("Failed to upload document", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteDocument = async (id: number | string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await storeDocumentsApi.delete(id);
        addToast("Document deleted", "success");
        fetchDocuments();
      } catch (error) {
        console.error("Delete failed:", error);
        addToast("Failed to delete document", "error");
      }
    }
  };

  const downloadDocument = async (id: number | string, fileName: string) => {
    try {
      const blob = await storeDocumentsApi.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      addToast("Failed to download document", "error");
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <Settings2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage store documents, agreements and configuration</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all shadow-sm active:scale-95"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents by name, type or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDocuments()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Clock className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Document List (Hierarchical) */}
        <div className="divide-y divide-gray-100 min-h-[400px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10 text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm font-medium">Loading documents...</p>
              </div>
            </div>
          ) : Object.entries(organizedDocs).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FolderOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No documents found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                {searchQuery ? "Try adjusting your search terms" : "Get started by uploading your first store document"}
              </p>
            </div>
          ) : (
            Object.entries(organizedDocs).sort((a, b) => b[0].localeCompare(a[0])).map(([year, months]) => (
              <div key={year} className="group/year">
                <button
                  onClick={() => toggleGroup(year)}
                  className="w-full flex items-center justify-between px-6 py-3 bg-gray-50/80 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-bold text-gray-900">{year}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                      {Object.values(months).flat().length} files
                    </span>
                  </div>
                  {expandedGroups[year] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {expandedGroups[year] && (
                  <div className="bg-white">
                    {Object.entries(months).sort((a, b) => {
                      const monthsOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                      return monthsOrder.indexOf(b[0]) - monthsOrder.indexOf(a[0]);
                    }).map(([month, docs]) => (
                      <div key={month} className="border-t border-gray-50 first:border-0">
                        <div className="px-8 py-2 bg-white flex items-center gap-2 text-sm font-semibold text-orange-600">
                          <Clock className="w-3.5 h-3.5" />
                          {month}
                        </div>
                        <div className="px-6 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {docs.map(doc => (
                              <div
                                key={doc.id}
                                className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-200 hover:shadow-md transition-all cursor-default"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                    <FileIcon className="w-6 h-6" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 truncate mb-0.5" title={doc.name}>
                                      {doc.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                      <span>{doc.type}</span>
                                      <span>•</span>
                                      <span>{doc.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                                      <span>{formatFileSize(doc.file_size)}</span>
                                      <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => downloadDocument(doc.id, doc.file_name)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 bg-white rounded-md shadow-sm border border-gray-100"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteDocument(doc.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-gray-100"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !actionLoading && setIsUploadModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Upload Store Document</h3>
              <button onClick={() => !actionLoading && setIsUploadModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Document Name *</label>
                <input
                  type="text"
                  disabled={actionLoading}
                  value={newDoc.name}
                  onChange={(e) => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Shop Agreement 2026"
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    disabled={actionLoading}
                    value={newDoc.type}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="e.g. Agreement"
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    disabled={actionLoading}
                    value={newDoc.category}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">File Attachment *</label>
                <div
                  onClick={() => !actionLoading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${actionLoading ? "opacity-50 cursor-not-allowed" : ""
                    } ${newDoc.file
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-400 hover:bg-orange-50/30"
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={actionLoading}
                    accept=".pdf,.doc,.docx,.jpg,.png"
                  />
                  {newDoc.file ? (
                    <div className="flex flex-col items-center">
                      <FileText className="w-10 h-10 text-orange-500 mb-2" />
                      <p className="text-sm font-bold text-gray-900">{newDoc.file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatFileSize(newDoc.file.size)}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-gray-100 rounded-full mb-3 text-gray-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-gray-700">Click to browse or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG or DOC (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                disabled={actionLoading}
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveDocument}
                disabled={!newDoc.file || !newDoc.name || actionLoading}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-all shadow-sm shadow-orange-200 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionLoading ? "Uploading..." : "Save Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
