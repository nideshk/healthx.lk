"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";
import { Eye, EyeOff, Edit2, Save, X, Plus } from "lucide-react";

interface Specialization {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  active: boolean;
  sin_slug: string;
  sin_description: string;
  created_at: string;
}

const SpecializationsTab: React.FC = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Specialization>>({});

  const [newSpecialization, setNewSpecialization] = useState<Partial<Specialization>>({
    name: "",
    slug: "",
    description: "",
    icon: "",
    active: true,
    sin_slug: "",
    sin_description: ""
  });

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/specialisations");
      if (!res.ok) throw new Error("Failed to fetch specializations");
      const json = await res.json();
      if (json.success) setSpecializations(json.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load specializations");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (spec: Specialization) => {
    try {
      const res = await authFetch("/api/specialisations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: spec.id, active: !spec.active }),
      });
      if (res.ok) {
        toast.success(`${spec.name} is now ${!spec.active ? "visible" : "hidden"}`);
        fetchSpecializations();
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      toast.error("Failed to toggle status");
    }
  };

  const handleCreate = async () => {
    if (!newSpecialization.name) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await authFetch("/api/specialisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSpecialization),
      });
      if (res.ok) {
        toast.success("Specialization created successfully");
        setIsAddingNew(false);
        setNewSpecialization({
          name: "",
          slug: "",
          description: "",
          icon: "",
          active: true,
          sin_slug: "",
          sin_description: ""
        });
        fetchSpecializations();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Creation failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create specialization");
    }
  };

  const handleStartEdit = (spec: Specialization) => {
    setEditingId(spec.id);
    setEditForm(spec);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await authFetch("/api/specialisations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (res.ok) {
        toast.success("Specialization updated successfully");
        setEditingId(null);
        fetchSpecializations();
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      toast.error("Failed to update specialization");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Manage Specializations</h2>
          <p className="text-sm text-slate-500">Add, edit or hide medical specializations/services</p>
        </div>
        <Button 
          variant={isAddingNew ? "outline" : "primary"}
          onClick={() => setIsAddingNew(!isAddingNew)}
          icon={isAddingNew ? <X size={18} /> : <Plus size={18} />}
        >
          {isAddingNew ? "Cancel" : "Add Specialization"}
        </Button>
      </div>

      {/* Add New Form */}
      {isAddingNew && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-medium text-slate-900 mb-4">New Specialization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Name (English)" 
              required
              value={newSpecialization.name} 
              onChange={(e) => setNewSpecialization({...newSpecialization, name: e.target.value})} 
            />
            <Input 
              label="Slug (optional)" 
              placeholder="e.g. general-physician"
              value={newSpecialization.slug} 
              onChange={(e) => setNewSpecialization({...newSpecialization, slug: e.target.value})} 
            />
            <div className="md:col-span-2">
              <Input 
                label="Description" 
                value={newSpecialization.description} 
                onChange={(e) => setNewSpecialization({...newSpecialization, description: e.target.value})} 
              />
            </div>
            <Input 
              label="Icon Name" 
              placeholder="e.g. Stethoscope"
              value={newSpecialization.icon} 
              onChange={(e) => setNewSpecialization({...newSpecialization, icon: e.target.value})} 
            />
            <div className="bg-slate-50 p-4 rounded-lg space-y-4 md:col-span-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sinhala Translation (Optional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label="Sinhala Name" 
                        value={newSpecialization.sin_slug} 
                        onChange={(e) => setNewSpecialization({...newSpecialization, sin_slug: e.target.value})} 
                    />
                    <Input 
                        label="Sinhala Description" 
                        value={newSpecialization.sin_description} 
                        onChange={(e) => setNewSpecialization({...newSpecialization, sin_description: e.target.value})} 
                    />
                </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleCreate} className="px-8">Create Specialization</Button>
          </div>
        </div>
      )}

      {/* Specializations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-4">Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">Loading specializations...</td>
                </tr>
              ) : specializations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">No specializations found.</td>
                </tr>
              ) : (
                specializations.map((spec) => (
                  <tr key={spec.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-medium text-slate-900">
                      {editingId === spec.id ? (
                        <Input 
                          value={editForm.name} 
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                        />
                      ) : spec.name}
                    </td>
                    <td className="p-4 text-slate-600">
                      {editingId === spec.id ? (
                        <Input 
                          value={editForm.slug} 
                          onChange={(e) => setEditForm({...editForm, slug: e.target.value})} 
                        />
                      ) : <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{spec.slug}</code>}
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs transition-all">
                      {editingId === spec.id ? (
                        <div className="space-y-2">
                            <Input 
                                label="Description"
                                value={editForm.description} 
                                onChange={(e) => setEditForm({...editForm, description: e.target.value})} 
                            />
                            <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Translations</p>
                                <Input 
                                    label="Sinhala Name"
                                    value={editForm.sin_slug} 
                                    onChange={(e) => setEditForm({...editForm, sin_slug: e.target.value})} 
                                />
                                <Input 
                                    label="Sinhala Description"
                                    value={editForm.sin_description} 
                                    onChange={(e) => setEditForm({...editForm, sin_description: e.target.value})} 
                                />
                            </div>
                        </div>
                      ) : (
                          <div className="space-y-1">
                              <div>{spec.description || "-"}</div>
                              {spec.sin_slug && (
                                  <div className="text-[11px] text-slate-400 italic">
                                      {spec.sin_slug}
                                  </div>
                              )}
                          </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        spec.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
                      }`}>
                        {spec.active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                        {editingId === spec.id ? (
                            <>
                                <button 
                                    onClick={handleSaveEdit}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Save"
                                >
                                    <Save size={18} />
                                </button>
                                <button 
                                    onClick={() => setEditingId(null)}
                                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition"
                                    title="Cancel"
                                >
                                    <X size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleToggleActive(spec)}
                                    className={`p-2 rounded-lg transition ${spec.active ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50' : 'text-blue-600 hover:bg-blue-50'}`}
                                    title={spec.active ? "Hide" : "Show"}
                                >
                                    {spec.active ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button 
                                    onClick={() => handleStartEdit(spec)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
                                    title="Edit"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SpecializationsTab;
