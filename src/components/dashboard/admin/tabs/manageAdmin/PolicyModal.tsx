import React, { useState } from "react";
import Button from "@/components/atom/Button/Button";

const AVAILABLE_POLICIES = [
  { code: "admin:add", description: "Add Admin" },
  { code: "admin:delete", description: "Delete Admin" },
  { code: "super_admin:manage_policy", description: "Manage Policies" },
  { code: "payment:refund", description: "Refund Payments" },
];

const PolicyModal = ({ admin, onClose, onRefresh }: any) => {
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(admin.policies || []);

  const togglePolicy = (code: string) => {
    setSelectedPolicies(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/manage-admin/manage-policy?id=${admin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policies: selectedPolicies }),
      });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      alert("Update failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold">Edit Policies: {admin.full_name}</h3>
        <div className="mt-4 space-y-2">
          {AVAILABLE_POLICIES.map(p => (
            <label key={p.code} className="flex items-center gap-3 p-2 border rounded hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedPolicies.includes(p.code)} 
                onChange={() => togglePolicy(p.code)}
              />
              <div className="text-sm">
                <p className="font-medium">{p.code}</p>
                <p className="text-xs text-slate-500">{p.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
          <Button className="w-full" onClick={handleUpdate}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;