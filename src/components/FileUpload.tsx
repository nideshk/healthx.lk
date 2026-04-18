"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      alert("Select a file first!");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_id", "1798559871122023774"); // Cliniko patient ID
      formData.append("description", "Uploaded via Clinecxa");

      const res = await authFetch("/api/patient/attachment", {
        method: "POST",
        body: formData, // ✅ do NOT set headers
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      setMessage("✅ File uploaded successfully!");
    } catch (err: any) {
      toast.error("File upload failed: " + err.message);
      setMessage("❌ Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Upload Patient File</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 rounded"
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}
