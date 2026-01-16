"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";

interface DeleteRequest {
  id: string;
  full_name: string;
  email: string;
  role: string;
  delete_status: string;
  delete_requested_at: string;
  requested_by: {
    id: string;
    role: string;
    full_name: string;
  };
}

const DeleteRequestsModal = ({ onClose }: { onClose: () => void }) => {
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await authFetch("/api/manage-admin/delete-requested");

      if (!res.ok) {
        throw new Error(`Failed to fetch delete requests: ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch delete requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveDelete = async (adminId: string) => {
    // Super Admin approving a request effectively calls the same delete endpoint
    // which results in a direct soft delete (Status 200).
    try {
      const res = await authFetch(`/api/manage-admin/${adminId}/delete-admin`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete admin: ${res.status}`);
      }

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Admin deleted successfully");
        fetchRequests(); // Refresh the list
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to process deletion");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative shadow-xl">
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 text-2xl"
          onClick={onClose}
        >
          ×
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            Pending Deletion Requests
          </h2>
          <p className="text-sm text-slate-500">
            Review and approve administrator deletion requests submitted by
            other admins.
          </p>
        </div>

        <div className="max-h-[400px] overflow-y-auto pr-2">
          {loading ? (
            <p className="text-center py-10 text-slate-500">
              Loading requests...
            </p>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-lg">
              <p className="text-slate-400">No pending requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <div className="mb-3 md:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {req.full_name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        {req.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{req.email}</div>
                    <div className="mt-2 text-[11px] text-slate-600 italic">
                      Requested by:{" "}
                      <span className="font-medium text-slate-800">
                        {req.requested_by.full_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block mr-2">
                      <div className="text-[10px] text-slate-400 uppercase">
                        Requested On
                      </div>
                      <div className="text-xs font-medium text-slate-700">
                        {new Date(req.delete_requested_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleApproveDelete(req.id)}
                    >
                      Approve Deletion
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRequestsModal;