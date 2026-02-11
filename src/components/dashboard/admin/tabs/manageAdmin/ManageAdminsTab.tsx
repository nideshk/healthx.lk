"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/atom/Button/Button";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import AddAdminModal from "./AddAdminModal";
import PolicyModal from "./PolicyModal";
import DeleteRequestsModal from "./DeleteRequestsModal";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";

const ManageAdminsTab: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteReqsModal, setShowDeleteReqsModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [removeTarget, setRemoveTarget] = useState<any>(null);

  const fetchCurrentAdmin = async () => {
    try {
      const res = await authFetch("/api/auth/me");

      if (!res.ok) {
        throw new Error(`Failed to fetch self: ${res.status}`);
      }
      const json = await res.json();

      if (json.success) setCurrentUser(json.user);
    } catch (err) {
      console.error("Failed to fetch self", err);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/manage-admin/manage-policy");
      if (!res.ok) {
        throw new Error(`Failed to fetch admins: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) setAdmins(json.data);
    } catch (err) {
      console.error("Failed to fetch admins", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentAdmin();
    fetchAdmins();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      const res = await authFetch(`/api/manage-admin/${id}/delete-admin`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Admin removed successfully");
        fetchAdmins(); // Refresh list
        setRemoveTarget(null);
      }
      else if (!res.ok) {
        throw new Error(json?.message || `Failed to delete admin: ${res.status}`);
      }
    } catch (err) {

      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Error deleting admin");
      }
    }
  };

  // Helper to check policy strings
  const hasPolicy = (policy: string) =>
    currentUser?.admin?.policies?.includes(policy);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Manage Administrators
            </div>
            <div className="text-xs text-slate-500">
              Add, edit, and manage administrator access
            </div>
          </div>

          <div className="flex gap-2">
            {/* Show Delete Requests button for Super Admins */}
            {currentUser?.admin?.role === "superadmin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteReqsModal(true)}
              >
                View Delete Requests
              </Button>
            )}

            {/* Show Add button based on policy */}
            {(hasPolicy("admin:add") || hasPolicy("super_admin:add")) && (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                + Add Administrator
              </Button>
            )}
          </div>
        </CardHeader>

        <CardBody className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            admins.map((admin) => (
              <div
                key={admin.id}
                className="flex justify-between items-center border border-slate-200 rounded-lg p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {admin.full_name}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${admin.role === "superadmin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                        }`}
                    >
                      {admin.role === "superadmin" ? "Super Admin" : "Admin"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {admin.email}
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Manage Policy Button (Only for Super Admins with policy) */}
                  {hasPolicy("super_admin:manage_policy") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAdmin(admin)}
                    >
                      Edit Permissions
                    </Button>
                  )}

                  {/* Remove Button Logic */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRemoveTarget(admin)}
                    // Disable if normal admin tries to delete super admin (as per your rules)
                    disabled={
                      currentUser?.admin?.role === "admin" &&
                      admin.role === "superadmin"
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onRefresh={fetchAdmins}
        />
      )}

      {editingAdmin && (
        <PolicyModal
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onRefresh={fetchAdmins}
        // Note: Available policies normally come from /api/auth/me but here we'll use your static list or mock
        />
      )}

      {showDeleteReqsModal && (
        <DeleteRequestsModal onClose={() => setShowDeleteReqsModal(false)} onSuccess={fetchAdmins} />
      )}
      {/* Delete Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <div className="text-lg font-semibold mb-2">
              Remove Administrator
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {currentUser?.admin?.role === "superadmin"
                ? `Confirming will permanently delete ${removeTarget.full_name}.`
                : `A deletion request for ${removeTarget.full_name} will be sent for approval.`}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRemoveTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => handleRemove(removeTarget.id)}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdminsTab;
