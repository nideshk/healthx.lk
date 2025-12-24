"use client";

import { File, FileArchiveIcon } from "lucide-react";
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
  const [actionId, setActionId] = useState<string | null>(null); // track delete/view in progress

  /* ─────────────────────────────────────────────
     Load files
  ───────────────────────────────────────────── */
  useEffect(() => {
    async function loadFiles() {
      try {
        setLoading(true);
        const res = await fetch("/api/manage-attachment");

        if (!res.ok) {
          throw new Error("Failed to fetch files");
        }

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

  /* ─────────────────────────────────────────────
     View file
  ───────────────────────────────────────────── */
  const viewFile = async (id: string) => {
    try {
      setActionId(id);

      const res = await fetch(`/api/manage-attachment/${id}`);
      const data = await res.json();

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to open file");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error(err);
      toast.error("Unable to open file.");
    } finally {
      setActionId(null);
    }
  };

  /* ─────────────────────────────────────────────
     Delete file
  ───────────────────────────────────────────── */
  const deleteFile = async (id: string) => {
    const confirmed = confirm(
      "Are you sure you want to delete this file permanently?"
    );
    if (!confirmed) return;

    try {
      setActionId(id);

      const res = await fetch(`/api/manage-attachment/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Delete failed");
      }

      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("File deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete file.");
    } finally {
      setActionId(null);
    }
  };

  /* ─────────────────────────────────────────────
     UI STATES
  ───────────────────────────────────────────── */
  if (loading) {
    return <p className="text-gray-500">Loading files…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Files & Reports</h2>

      {files.length === 0 ? (
        <p className="text-gray-600">No files uploaded yet.</p>
      ) : (
        files.map((file) => {
          const busy = actionId === file.id;

          return (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-white/70 ring-1 ring-black/5 flex justify-between items-center"
            >
              {/* File info */}
              <div className="flex gap-2">

                <FileArchiveIcon/>
              <div>
                <p className="font-medium text-gray-900">
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.file_size / 1024).toFixed(1)} KB ·{" "}
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 text-sm">
                <button
                  onClick={() => viewFile(file.id)}
                  disabled={busy}
                  className={`${
                    busy
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-blue-600 hover:underline"
                  }`}
                >
                  {busy ? "Opening…" : "View"}
                </button>

                <button
                  onClick={() => deleteFile(file.id)}
                  disabled={busy}
                  className={`${
                    busy
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-red-600 hover:underline"
                  }`}
                >
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
