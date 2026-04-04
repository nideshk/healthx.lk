"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";

interface PlatformFee {
  id: string;
  name: string;
  description: string;
  duration_mins: number | "";
  base_fee: number | "";
  max_attendee: number | "";
  extra_fee_per_attendee: number | "" ;
  platform_fee: number | "";
}

const PlatformTab: React.FC = () => {
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

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const res = await authFetch("/api/platform_fee");
      if (!res.ok) {
          throw new Error(`Failed to fetch platform fee: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) setFees(json.data);
    } catch (err) {
      console.error("Failed to fetch fees", err);
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
        base_fee: Number(f.base_fee) || 0,
        platform_fee: Number(f.platform_fee) || 0,
        duration_mins: Number(f.duration_mins) || 0,
        max_attendee: Number(f.max_attendee) || 1,
        extra_fee_per_attendee:
            f.max_attendee === 1 ||
            f.extra_fee_per_attendee === "" ||
            f.extra_fee_per_attendee === 0
              ? null
              : Number(f.extra_fee_per_attendee),      
      }));
      const res = await authFetch("/api/platform_fee", {
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
      
      const res = await authFetch("/api/platform_fee", {
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
      const res = await authFetch("/api/platform_fee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: typeId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Successfully deleted "${typeName}"`);
        setDeleteModal({ isOpen: false, typeId: "", typeName: "" });
        fetchFees();
      } else {
        toast.error(data.error || "Failed to delete appointment type");
      }
    } catch (err) {
      toast.error("An unexpected error occurred during deletion");
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6 shadow-sm">
      {/* DELETE MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Deactivation</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to deactivate <span className="font-bold">"{deleteModal.typeName}"</span>? 
              This appointment type will no longer be available for booking.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, typeId: "", typeName: "" })}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm font-semibold text-slate-900">Appointment Fees Configuration</div>
      
      <div className="overflow-auto border border-slate-200 rounded-xl max-h-[550px] shadow-inner bg-slate-50/30">
        <table className="min-w-[1400px] w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-4 font-bold text-slate-700 border-b min-w-[200px]">Type Name</th>
              <th className="p-4 font-bold text-slate-700 border-b">Base Fee (LKR)</th>
              <th className="p-4 font-bold text-slate-700 border-b">Platform Fee (LKR)</th>
              <th className="p-4 font-bold text-slate-700 border-b">Max Attendees</th>
              <th className="p-4 font-bold text-slate-700 border-b">Duration (min)</th>
              <th className="p-4 font-bold text-slate-700 border-b min-w-[250px]">Description</th>
              <th className="p-4 font-bold text-slate-700 border-b text-center sticky right-0 bg-slate-50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="hover:bg-blue-50/30 transition even:bg-slate-50/50">
                <td className="p-4 border-b">
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={fee.name} onChange={(e) => updateFeeField(fee.id, "name", e.target.value)} />
                </td>
                <td className="p-4 border-b">
                  <input type="number" step="any" className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500" value={fee.base_fee} onChange={(e) => updateFeeField(fee.id, "base_fee", e.target.value === "" ? "" : Number(e.target.value))} />
                </td>
                <td className="p-4 border-b">
                  <input type="number" step="any" className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-blue-700 font-bold" value={fee.platform_fee} onChange={(e) => updateFeeField(fee.id, "platform_fee", e.target.value === "" ? "" : Number(e.target.value))} />
                </td>
                <td className="p-4 border-b">
                  <input type="number" className="w-20 bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500" value={fee.max_attendee} onChange={(e) => updateFeeField(fee.id, "max_attendee", e.target.value === "" ? "" : Number(e.target.value))} />
                </td>
                <td className="p-4 border-b">
                  <input type="number" className="w-20 bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500" value={fee.duration_mins} onChange={(e) => updateFeeField(fee.id, "duration_mins", e.target.value === "" ? "" : Number(e.target.value))} />
                </td>
                <td className="p-4 border-b">
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 italic" value={fee.description} onChange={(e) => updateFeeField(fee.id, "description", e.target.value)} />
                </td>
                <td className="p-4 border-b text-center sticky right-0 bg-white/95 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                  <button onClick={() => setDeleteModal({ isOpen: true, typeId: fee.id, typeName: fee.name })} className="text-red-500 hover:text-red-700 transition hover:scale-110 p-1 rounded-full hover:bg-red-50">
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
          <div className="bg-slate-50 p-6 rounded-xl space-y-4 mb-4 border border-slate-200 shadow-sm animate-in fade-in duration-300">
            <div className="grid grid-cols-3 gap-4">
              <Input label="Name" placeholder="e.g. Specialists Consultation" value={newType.name} onChange={(e) => setNewType({...newType, name: e.target.value})} />
              <Input label="Base Fee" type="number" value={newType.base_fee?.toString()} onChange={(e) => setNewType({...newType, base_fee: Number(e.target.value)})} />
              <Input label="Platform Fee" type="number" value={newType.platform_fee?.toString()} onChange={(e) => setNewType({...newType, platform_fee: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Max Attendees" type="number" value={newType.max_attendee?.toString()} onChange={(e) => setNewType({...newType, max_attendee: Number(e.target.value)})} />
              <Input label="Duration (mins)" type="number" value={newType.duration_mins?.toString()} onChange={(e) => setNewType({...newType, duration_mins: Number(e.target.value)})} />
            </div>
            <Input label="Description" placeholder="Provide a brief overview..." value={newType.description} onChange={(e) => setNewType({...newType, description: e.target.value})} />
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={handleCreateNewType} className="px-10">Create Appointment Type</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-6">
        <Button onClick={savePlatformCharges} disabled={platformLoading} className="px-8 py-3 h-auto text-base">
          {platformLoading ? "Saving Changes..." : "Save All Platform Charges"}
        </Button>
      </div>
    </div>
  );
};

export default PlatformTab;