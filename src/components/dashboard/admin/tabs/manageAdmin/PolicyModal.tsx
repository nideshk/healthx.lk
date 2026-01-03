"use client";

import React, { useState, useMemo } from "react";
import Button from "@/components/atom/Button/Button";

interface Policy {
  code: string;
  description: string;
}

const PolicyModal = ({ admin, onClose, onRefresh }: any) => {
  /**
   * 1. Initialize state by only taking the 'assigned' array from the API response.
   * This ensures that policies already granted to "Admin Test" are auto-checked.
   */
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(
    Array.isArray(admin?.policies?.assigned) ? admin.policies.assigned : []
  );
  
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * 2. Combine assigned and available into one unique list for display.
   * We map the strings in 'assigned' to a similar object format as 'available'.
   */
  const allDisplayPolicies = useMemo(() => {
    const assigned = (admin?.policies?.assigned || []).map((code: string) => ({
      code,
      description: "Currently assigned permission", // Default text if description isn't in 'assigned'
    }));
    const available = admin?.policies?.available || [];
    
    // Combine both and remove duplicates based on code
    const combined = [...assigned, ...available];
    return combined.filter((v, i, a) => a.findIndex(t => t.code === v.code) === i);
  }, [admin]);

  const togglePolicy = (code: string) => {
    setSelectedPolicies(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // API call: PUT /api/manage-admin/manage-policy?id=<admin_id>
      const res = await fetch(`/api/manage-admin/manage-policy?id=${admin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policies: selectedPolicies }), // Sends final checked array
      });
      
      const json = await res.json();
      if (json.success) {
        onRefresh();
        onClose();
      } else {
        alert(json.message || "Failed to update policies");
      }
    } catch (err) {
      alert("An error occurred while updating policies");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Manage Policies</h3>
          <p className="text-sm text-slate-500 font-medium">Updating permissions for: {admin.full_name}</p>
        </div>

        <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {allDisplayPolicies.map((p: Policy) => (
            <label 
              key={p.code} 
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPolicies.includes(p.code) 
                  ? "border-blue-200 bg-blue-50/30" 
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input 
                type="checkbox" 
                className="mt-1 h-4 w-4 accent-blue-600"
                checked={selectedPolicies.includes(p.code)} 
                onChange={() => togglePolicy(p.code)}
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">{p.code}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Update Policies"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;