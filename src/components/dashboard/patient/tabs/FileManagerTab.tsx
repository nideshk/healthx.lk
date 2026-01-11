"use client";

import Loader from "@/components/atom/Loader/Loader";
import { FileText, Trash2, ExternalLink, HardDrive, AlertCircle, FileIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type FileItem = {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
};

export default function FileManagerTab() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFiles() {
      try {
        setLoading(true);
        const res = await fetch("/api/manage-attachment");
        if (!res.ok) throw new Error("Failed to fetch files");
        const data = await res.json();
        setFiles(data.files || []);
      } catch (err: any) {
        console.error(err);
        toast.error("Unable to load files. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, []);

  const viewFile = async (id: string) => {
    try {
      setActionId(id);
      const res = await fetch(`/api/manage-attachment/${id}`);
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Failed to open file");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error(err);
      toast.error("Unable to open file.");
    } finally {
      setActionId(null);
    }
  };

  const deleteFile = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this file permanently?");
    if (!confirmed) return;

    try {
      setActionId(id);
      const res = await fetch(`/api/manage-attachment/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Delete failed");
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("File removed from your records.");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete file.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex justify-center items-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header Section */}
      <div className="flex items-end justify-between border-b border-slate-100 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Medical Records</h2>
          <p className="text-sm text-slate-500 font-medium">Manage your lab reports, prescriptions, and health documents.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
          <HardDrive className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {files.length} {files.length === 1 ? 'File' : 'Files'} Saved
          </span>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-bold">No documents found</h3>
          <p className="text-slate-500 text-sm">Your medical attachments will appear here once uploaded.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {files.map((file) => {
            const busy = actionId === file.id;
            const sizeInMB = file.file_size / (1024 * 1024);
            const displaySize = sizeInMB < 1 
              ? `${(file.file_size / 1024).toFixed(1)} KB` 
              : `${sizeInMB.toFixed(1)} MB`;

            return (
              <div
                key={file.id}
                className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-teal-100 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 flex-shrink-0 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate pr-4">
                      {file.file_name}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                      <span>{displaySize}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>Uploaded {new Date(file.uploaded_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewFile(file.id)}
                    disabled={busy}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {busy ? "..." : <><ExternalLink className="w-3.5 h-3.5" /> View</>}
                  </button>
                  
                  <button
                    onClick={() => deleteFile(file.id)}
                    disabled={busy}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}