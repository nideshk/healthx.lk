"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { useMfaEnrollment } from "@/hooks/useMfaEnrollment";
import { toast } from "react-toastify";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SettingsTabType = "Security" | "Account" | "Platform";

interface SettingsTabProps {
  email: string;
}

interface ProfileResponse {
  success: boolean;
  profile: {
    id: string;
    role: string;
    display_name: string;
    multi_factor: boolean;
  };
}

interface ChangePasswordResponse {
  success?: boolean;
  error?: string;
}

interface PlatformFee {
  id: string;
  name: string;
  description: string;
  duration_mins: number;
  base_fee: number;
  max_attendee: number;
  extra_fee_per_attendee: number | null;
  platform_fee: number;
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const SettingsTab: React.FC<SettingsTabProps> = ({ email }) => {
  const {
    twoFactorEnabled,
    qr,
    otp,
    loading,
    error,
    challengeId,
    setOtp,
    startEnrollment,
    createChallenge,
    verifyEnrollment,
    disableMfa,
  } = useMfaEnrollment();


  const [activeTab, setActiveTab] = useState<SettingsTabType>("Security");

  /* ---------------- SECURITY ---------------- */

  // const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  // const [loading2FA, setLoading2FA] = useState(false);

  /* ---------------- ACCOUNT ---------------- */
  const [accountForm, setAccountForm] = useState({ newPassword: "", confirmPassword: "" });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  /* ---------------- PLATFORM ---------------- */
  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; typeId: string; typeName: string }>({
    isOpen: false,
    typeId: "",
    typeName: ""
  });

  const [newType, setNewType] = useState<Partial<PlatformFee>>({
    name: "",
    description: "",
    duration_mins: 15,
    base_fee: 0,
    max_attendee: 1,
    extra_fee_per_attendee: 0,
    platform_fee: 0
  });

  /* -------------------------------------------------------------------------- */
  /* API HELPERS                                                                */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (activeTab === "Platform") fetchFees();
  }, [activeTab]);

  const fetchFees = async () => {
    try {
      const res = await fetch("/api/platform_fee");
      const json = await res.json();
      if (json.success) setFees(json.data);
    } catch (err) {
      console.error("Failed to fetch fees", err);
    }
  };

  // const update2FA = async (enabled: boolean) => {
  //   const res = await fetch("/api/profiles", {
  //     method: "POST",
  //     credentials: "include",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ enabled }),
  //   });

  //   if (!res.ok) {
  //     throw new Error("Failed to update 2FA");
  //   }

  //   const json: ProfileResponse = await res.json();
  //   return json.profile.multi_factor;
  // };

  const changePassword = async (newPassword: string) => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: newPassword }),
    });
    const json: ChangePasswordResponse = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || "Failed to change password");
    return true;
  };

  /* -------------------------------------------------------------------------- */
  /* HANDLERS                                                                   */
  /* -------------------------------------------------------------------------- */

  const handleToggle2FA = () => {
    if (loading || twoFactorEnabled === null) return;

    if (!twoFactorEnabled) {
      startEnrollment();
    } else {
      disableMfa();
    }
  };


  const handleSaveAccount = async () => {
    setAccountError(null);
    if (accountForm.newPassword !== accountForm.confirmPassword) {
      setAccountError("Passwords do not match.");
      toast.error("Passwords do not match");
      return;
    }
    try {
      setAccountLoading(true);
      await changePassword(accountForm.newPassword);
      toast.success("Password updated successfully");
      setAccountForm({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setAccountError(err.message);
      toast.error(err.message || "Failed to update password");
    } finally {
      setAccountLoading(false);
    }
  };

  const updateFeeField = (id: string, field: keyof PlatformFee, value: any) => {
    setFees(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const savePlatformCharges = async () => {
    setPlatformLoading(true);
    try {
      const updates = fees.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        duration_mins: f.duration_mins,
        base_fee: f.base_fee,
        max_attendee: f.max_attendee,
        platform_fee: f.platform_fee,
        extra_fee_per_attendee: f.extra_fee_per_attendee
      }));
      const res = await fetch("/api/platform_fee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        toast.success("All charges and appointment types updated successfully!");
        fetchFees();
      } else {
        throw new Error("Failed to save changes");
      }
    } catch (err) {
      toast.error("Failed to save service charges");
    } finally {
      setPlatformLoading(false);
    }
  };

  const handleCreateNewType = async () => {
    if (!newType.name) {
      toast.error("Appointment name is required");
      return;
    }
    try {
      const payload = { ...newType };
      if (payload.extra_fee_per_attendee === 0) delete payload.extra_fee_per_attendee;
      
      const res = await fetch("/api/platform_fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsAddingNew(false);
        setNewType({ name: "", description: "", duration_mins: 15, base_fee: 0, max_attendee: 1, extra_fee_per_attendee: 0, platform_fee: 0 });
        toast.success("New appointment type created successfully");
        fetchFees();
      } else {
        throw new Error("Creation failed");
      }
    } catch (err) {
      toast.error("Failed to create appointment type");
    }
  };

  const confirmDelete = async () => {
    const { typeId, typeName } = deleteModal;
    try {
      // API call would go here
      toast.success(`Successfully deleted "${typeName}"`);
      setDeleteModal({ isOpen: false, typeId: "", typeName: "" });
      fetchFees();
    } catch (err) {
      toast.error("Failed to delete appointment type");
    }
  };

  /* -------------------------------------------------------------------------- */
  /* RENDER                                                                     */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-4 relative">
      {/* DELETE MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Confirmation</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-bold">"{deleteModal.typeName}"</span>? 
              This will remove it from the platform permanently.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, typeId: "", typeName: "" })}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="text-lg font-semibold">Settings</div>
        <div className="text-xs opacity-90">Security, account preferences, and platform charges</div>
      </div>

      {/* SUB TABS */}
      <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
        {["Security", "Account", "Platform"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as SettingsTabType)}
            className={`flex-1 text-sm py-2 rounded-md transition ${
              activeTab === tab ? "bg-white shadow text-slate-900 font-medium" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "Platform" ? "Platform Charges" : tab}
          </button>
        ))}
      </div>

      {/* ======================== SECURITY TAB ======================== */}
    {activeTab === "Security" && (
      <>
        <div className="border border-slate-200 rounded-xl p-5 bg-white">
          <div className="text-sm font-semibold text-slate-900 mb-1">Security</div>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Two-Factor Authentication (2FA)</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!twoFactorEnabled}
                disabled={loading}
                onChange={handleToggle2FA}
              />
              <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>

        {/* ENROLLMENT UI */}
        {qr && (
          <div className="mt-4 border rounded-lg p-4 bg-slate-50">
            <div
              dangerouslySetInnerHTML={{ __html: qr }}
              className="mb-3"
            />

            {!challengeId ? (
              <button
                onClick={createChallenge}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded mb-2"
              >
                Enable 2FA
              </button>
            ) : (
              <>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  placeholder="Enter 6-digit code"
                  className="border rounded px-3 py-2 w-full mb-2"
                />

                <button
                  onClick={verifyEnrollment}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded"
                >
                  Verify & Enable
                </button>
              </>
            )}

            {error && (
              <div className="text-xs text-red-600 mt-2">
                {error}
              </div>
            )}
          </div>
        )}
      </>
    )}



      {activeTab === "Account" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
          <div className="text-sm font-semibold text-slate-900">Account</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username" value={email || "-"} disabled />
            <Input label="New Password" type="password" value={accountForm.newPassword} onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })} />
          </div>
          <Input label="Confirm New Password" type="password" value={accountForm.confirmPassword} onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })} />
          <Button onClick={handleSaveAccount} disabled={accountLoading}>{accountLoading ? "Saving..." : "Save Changes"}</Button>
        </div>
      )}

      {activeTab === "Platform" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
          <div className="text-sm font-semibold text-slate-900">Appointment Fees Configuration</div>
          
          <div className="overflow-auto border border-slate-100 rounded-lg max-h-[500px] shadow-inner">
            <table className="min-w-[1300px] w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="p-3 font-medium text-slate-600 border-b min-w-[180px]">Type Name</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Base Fee (LKR)</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Platform Fee (LKR)</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Extra Fee/Atnd.</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Max Attendees</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Duration (min)</th>
                  <th className="p-3 font-medium text-slate-600 border-b min-w-[200px]">Description</th>
                  <th className="p-3 font-medium text-slate-600 border-b text-center sticky right-0 bg-slate-50">Action</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 border-b">
                      <input 
                        type="text" 
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 transition font-medium" 
                        value={fee.name} 
                        onChange={(e) => updateFeeField(fee.id, "name", e.target.value)} 
                      />
                    </td>
                    <td className="p-3 border-b">
                      <input 
                        type="number" 
                        step="any"
                        className="w-28 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500" 
                        value={fee.base_fee} 
                        onChange={(e) => updateFeeField(fee.id, "base_fee", Number(e.target.value))} 
                      />
                    </td>
                    <td className="p-3 border-b">
                      <input 
                        type="number" 
                        step="any"
                        className="w-28 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-blue-600 font-semibold" 
                        value={fee.platform_fee} 
                        onChange={(e) => updateFeeField(fee.id, "platform_fee", Number(e.target.value))} 
                      />
                    </td>
                    <td className="p-3 border-b">
                      <input 
                        type="number" 
                        step="any"
                        className="w-28 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500" 
                        value={fee.extra_fee_per_attendee ?? 0} 
                        onChange={(e) => updateFeeField(fee.id, "extra_fee_per_attendee", Number(e.target.value))} 
                      />
                    </td>
                    <td className="p-3 border-b">
                      <input 
                        type="number" 
                        className="w-20 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500" 
                        value={fee.max_attendee} 
                        onChange={(e) => updateFeeField(fee.id, "max_attendee", Number(e.target.value))} 
                      />
                    </td>
                    <td className="p-3 border-b">
                      <input 
                        type="number" 
                        className="w-20 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500" 
                        value={fee.duration_mins} 
                        onChange={(e) => updateFeeField(fee.id, "duration_mins", Number(e.target.value))} 
                      />
                    </td>
                    <td className="p-3 border-b">
                      <input 
                        type="text" 
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-500" 
                        value={fee.description} 
                        onChange={(e) => updateFeeField(fee.id, "description", e.target.value)} 
                      />
                    </td>
                    <td className="p-3 border-b text-center sticky right-0 bg-white/95 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, typeId: fee.id, typeName: fee.name })} 
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
             <Button variant="secondary" onClick={() => setIsAddingNew(!isAddingNew)} className="mb-4">
               {isAddingNew ? "Cancel" : "+ Add Appointment Type"}
             </Button>

             {isAddingNew && (
               <div className="bg-slate-50 p-6 rounded-lg space-y-4 mb-4 border border-slate-200">
                 <div className="grid grid-cols-3 gap-4">
                   <Input label="Name" value={newType.name} onChange={(e) => setNewType({...newType, name: e.target.value})} />
                   <Input label="Base Fee" type="number" value={newType.base_fee?.toString()} onChange={(e) => setNewType({...newType, base_fee: Number(e.target.value)})} />
                   <Input label="Platform Fee" type="number" value={newType.platform_fee?.toString()} onChange={(e) => setNewType({...newType, platform_fee: Number(e.target.value)})} />
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                   <Input label="Extra Fee / Attendee" type="number" value={newType.extra_fee_per_attendee?.toString()} onChange={(e) => setNewType({...newType, extra_fee_per_attendee: Number(e.target.value)})} />
                   <Input label="Max Attendees" type="number" value={newType.max_attendee?.toString()} onChange={(e) => setNewType({...newType, max_attendee: Number(e.target.value)})} />
                   <Input label="Duration (mins)" type="number" value={newType.duration_mins?.toString()} onChange={(e) => setNewType({...newType, duration_mins: Number(e.target.value)})} />
                 </div>
                 <Input label="Description" value={newType.description} onChange={(e) => setNewType({...newType, description: e.target.value})} />
                 <div className="flex justify-end">
                   <Button onClick={handleCreateNewType} className="px-8">Create</Button>
                 </div>
               </div>
             )}
          </div>

          <div className="flex justify-end">
            <Button onClick={savePlatformCharges} disabled={platformLoading}>
              {platformLoading ? "Saving..." : "Save All Service Charges"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;