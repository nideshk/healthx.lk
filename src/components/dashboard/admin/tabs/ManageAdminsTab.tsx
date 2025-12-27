"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";

/* -------------------------------------------------------------------------- */
/*                               MOCK DATA (API READY)                         */
/* -------------------------------------------------------------------------- */

const CURRENT_ADMIN = {
  id: "a1",
  username: "nidesh",
  role: "super_admin", // admin | super_admin
};

const MOCK_ADMINS = [
  {
    id: "a1",
    username: "nidesh",
    role: "super_admin",
    createdAt: "2024-01-01",
  },
  {
    id: "a2",
    username: "clinician",
    role: "admin",
    createdAt: "2024-01-01",
  },
];

/* -------------------------------------------------------------------------- */
/*                             POLICY CHECK (REPLACE WITH API)                 */
/* -------------------------------------------------------------------------- */

const canRemoveAdmin = (
  currentRole: string,
  targetRole: string
) => {
  if (currentRole === "super_admin") return true;
  if (currentRole === "admin" && targetRole === "admin") return false;
  return false;
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const ManageAdminsTab: React.FC = () => {
  const [admins] = useState(MOCK_ADMINS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<any>(null);

  /* ---------------- ADD ADMIN FORM STATE ---------------- */
  const [addForm, setAddForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
  });

  /* ---------------- HANDLERS ---------------- */

  const handleAddAdmin = () => {
    /**
     * FUTURE API:
     * POST /api/admin/admins
     * body: addForm
     */
    console.log("Add admin payload:", addForm);
    setShowAddModal(false);
  };

  const handleRemoveAdmin = () => {
    /**
     * FUTURE API:
     * DELETE /api/admin/admins/{id}
     */
    console.log("Removing admin:", removeTarget.id);
    setRemoveTarget(null);
  };

  return (
    <>
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

          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Add Administrator
          </Button>
        </CardHeader>

        <CardBody className="space-y-3">
          {admins.map((admin) => {
            const canRemove = canRemoveAdmin(
              CURRENT_ADMIN.role,
              admin.role
            );

            return (
              <div
                key={admin.id}
                className="flex justify-between items-center border border-slate-200 rounded-lg p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {admin.username}
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {admin.role === "super_admin"
                        ? "Super Admin"
                        : "Admin"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Created: {admin.createdAt}
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setRemoveTarget({
                      ...admin,
                      canRemove,
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------------------- */}
      {/*                            ADD ADMIN MODAL                              */}
      {/* ---------------------------------------------------------------------- */}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              className="absolute right-4 top-4 text-xl"
              onClick={() => setShowAddModal(false)}
            >
              ×
            </button>

            <div className="text-lg font-semibold mb-1">
              Add New Administrator
            </div>
            <div className="text-xs text-slate-500 mb-4">
              Create a new administrator account
            </div>

            <div className="space-y-3">
              <Input
                label="Username"
                value={addForm.username}
                onChange={(e) =>
                  setAddForm({ ...addForm, username: e.target.value })
                }
              />

              <Input
                label="Email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
              />

              <Input
                label="Password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm({ ...addForm, password: e.target.value })
                }
              />

              <Input
                label="Confirm Password"
                type="password"
                value={addForm.confirmPassword}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    confirmPassword: e.target.value,
                  })
                }
              />

              <div>
                <div className="text-xs text-slate-600 mb-1">
                  Admin Level
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={addForm.role === "admin"}
                    onChange={() =>
                      setAddForm({ ...addForm, role: "admin" })
                    }
                  />
                  Admin
                </label>

                <label className="flex items-center gap-2 text-sm mt-1">
                  <input
                    type="radio"
                    checked={addForm.role === "super_admin"}
                    onChange={() =>
                      setAddForm({
                        ...addForm,
                        role: "super_admin",
                      })
                    }
                  />
                  Super Admin
                </label>
              </div>

              <Button className="w-full" onClick={handleAddAdmin}>
                Add Administrator
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/*                           REMOVE ADMIN MODAL                            */}
      {/* ---------------------------------------------------------------------- */}

      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            {!removeTarget.canRemove ? (
              <>
                <div className="text-lg font-semibold mb-2">
                  Action Not Allowed
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  You do not have permission to remove this administrator.
                </div>
                <Button className="w-full" onClick={() => setRemoveTarget(null)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold mb-2">
                  Remove Administrator
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  Are you sure you want to remove{" "}
                  <b>{removeTarget.username}</b>? This action cannot be undone.
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setRemoveTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleRemoveAdmin}>
                    Confirm Remove
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ManageAdminsTab;
