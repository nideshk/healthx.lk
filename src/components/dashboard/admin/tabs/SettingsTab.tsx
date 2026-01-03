"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
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
/* MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const SettingsTab: React.FC<SettingsTabProps> = ({ email }) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>("Security");

  /* ---------------- SECURITY ---------------- */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);

  /* ---------------- ACCOUNT ---------------- */
  const [accountForm, setAccountForm] = useState({ newPassword: "", confirmPassword: "" });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  /* ---------------- PLATFORM ---------------- */
  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newType, setNewType] = useState<Partial<PlatformFee>>({
    name: "",
    description: "",
    duration_mins: 0,
    base_fee: 0,
    max_attendee: 0,
    extra_fee_per_attendee: 0,
    // platform_fee: 0
  });

  /* -------------------------------------------------------------------------- */
  /* API HELPERS                                  */
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

  const update2FA = async (enabled: boolean) => {
    const res = await fetch("/api/profiles", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error("Failed to update 2FA");
    const json: ProfileResponse = await res.json();
    return json.profile.multi_factor;
  };

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
  /* HANDLERS                                    */
  /* -------------------------------------------------------------------------- */

  const handleToggle2FA = async () => {
    const nextValue = !twoFactorEnabled;
    setTwoFactorEnabled(nextValue);
    setLoading2FA(true);
    try {
      const confirmedValue = await update2FA(nextValue);
      setTwoFactorEnabled(confirmedValue);
    } catch {
      setTwoFactorEnabled(!nextValue);
      alert("Failed to update 2FA.");
    } finally {
      setLoading2FA(false);
    }
  };

  const handleSaveAccount = async () => {
    setAccountError(null);
    setAccountSuccess(null);
    if (accountForm.newPassword !== accountForm.confirmPassword) {
      setAccountError("Passwords do not match.");
      return;
    }
    try {
      setAccountLoading(true);
      await changePassword(accountForm.newPassword);
      setAccountSuccess("Password updated successfully.");
      setAccountForm({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setAccountError(err.message);
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
      if (res.ok) alert("Charges updated!");
    } catch (err) {
      alert("Save failed.");
    } finally {
      setPlatformLoading(false);
    }
  };

  const handleCreateNewType = async () => {
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
        setNewType({ name: "", description: "", duration_mins: 15, base_fee: 0, max_attendee: 1, extra_fee_per_attendee: 0, platform_fee: fees[0]?.platform_fee ?? 950 });
        fetchFees();
      }
    } catch (err) {
      alert("Failed to create type.");
    }
  };

  /* -------------------------------------------------------------------------- */
  /* RENDER                                    */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-4">
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

      {activeTab === "Security" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white">
          <div className="text-sm font-semibold text-slate-900 mb-1">Security</div>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Two-Factor Authentication (2FA)</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={twoFactorEnabled} disabled={loading2FA} onChange={handleToggle2FA} />
              <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
            </label>
          </div>
        </div>
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

      {/* ===================== PLATFORM CHARGES (TABULAR) ======================= */}
   {activeTab === "Platform" && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
          <div className="text-sm font-semibold text-slate-900">Appointment Fees Configuration</div>
          
          <div className="overflow-x-auto border border-slate-100 rounded-lg max-h-[400px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="p-3 font-medium text-slate-600 border-b">Type Name</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Base Fee (LKR)</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Extra Fee/Attend.</th>
                  <th className="p-3 font-medium text-slate-600 border-b">Max Attendees</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 border-b font-medium text-slate-700">{fee.name}</td>
                    <td className="p-3 border-b">
                      <input type="number" className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none p-1" value={fee.base_fee} onChange={(e) => updateFeeField(fee.id, "base_fee", Number(e.target.value))} />
                    </td>
                    <td className="p-3 border-b">
                      <input type="number" className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none p-1" value={fee.extra_fee_per_attendee ?? 0} onChange={(e) => updateFeeField(fee.id, "extra_fee_per_attendee", Number(e.target.value))} />
                    </td>
                    <td className="p-3 border-b">
                      <input type="number" className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none p-1" value={fee.max_attendee} onChange={(e) => updateFeeField(fee.id, "max_attendee", Number(e.target.value))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-100">
             <Button variant="secondary" onClick={() => setIsAddingNew(!isAddingNew)} className="mb-4">
               {isAddingNew ? "Cancel" : "+ Add Appointment Type"}
             </Button>

             {isAddingNew && (
               <div className="bg-slate-50 p-6 rounded-lg space-y-4 mb-4 border border-slate-200 shadow-sm">
                 <div className="grid grid-cols-3 gap-4">
                   <Input label="Name" placeholder="e.g. Test Consultation" value={newType.name} onChange={(e) => setNewType({...newType, name: e.target.value})} />
                   <Input label="Base Fee" type="number" value={newType.base_fee?.toString()} onChange={(e) => setNewType({...newType, base_fee: Number(e.target.value)})} />
                   <Input label="Extra Fee / Attendee" type="number" value={newType.extra_fee_per_attendee?.toString()} onChange={(e) => setNewType({...newType, extra_fee_per_attendee: Number(e.target.value)})} />
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                   <Input label="Max Attendees" type="number" value={newType.max_attendee?.toString()} onChange={(e) => setNewType({...newType, max_attendee: Number(e.target.value)})} />
                   <Input label="Duration (mins)" type="number" value={newType.duration_mins?.toString()} onChange={(e) => setNewType({...newType, duration_mins: Number(e.target.value)})} />
                   <Input label="Description" placeholder="e.g. 15 min consultation" value={newType.description} onChange={(e) => setNewType({...newType, description: e.target.value})} />
                 </div>
                 <div className="flex justify-end">
                   <Button onClick={handleCreateNewType} className="px-8">Create</Button>
                 </div>
               </div>
             )}
          </div>

          <Section title="Global Platform Settings">
            <Input 
              label="System Platform Fee (LKR)" 
              type="number" 
              value={(fees[0]?.platform_fee ?? 0).toString()} 
              onChange={(e) => {
                const val = Number(e.target.value);
                setFees(fees.map(f => ({ ...f, platform_fee: val })));
                setNewType(prev => ({ ...prev, platform_fee: val }));
              }} 
            />
          </Section>

          <Button onClick={savePlatformCharges} disabled={platformLoading}>
            {platformLoading ? "Saving..." : "Save All Service Charges"}
          </Button>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-sm font-medium text-slate-800 mb-3">{title}</div>
    {children}
  </div>
);

export default SettingsTab;