"use client";

import React, { useState,useEffect  } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
// import toast from "react-hot-toast"; // Uncomment if using react-hot-toast

interface AddAdminModalProps {
  onClose: () => void;
  onRefresh: () => void;
}


const AddAdminModal: React.FC<AddAdminModalProps> = ({ onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);


  const [form, setForm] = useState({
    full_name: "",
    gender: "female", 
    email: "",
    password: "",
    confirm_password: "",
    role: "admin", 
  });

  useEffect(() => {
  if (isSuccess) {
    onClose();
    onRefresh();
  }
}, [isSuccess, onClose, onRefresh]);


  const handleSubmit = async () => {
    setError(null);

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    

    setLoading(true);
    try {
      const res = await fetch("/api/manage-admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

    //   const json = await res.json();
      console.log("Response:", res);
      if (res.ok) {
        // 1. Show Toast Success Message
        // toast.success("Admin created successfully!"); 
        alert("Admin created successfully!"); // Fallback if no toast library is installed
          setIsSuccess(true);

//         // 3. Auto-close the modal
//         onClose();

//         setTimeout(() => {
//     onRefresh();
//   }, 0);

      } else {
        setError(res.statusText || "Failed to create admin");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl">
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 text-2xl"
          onClick={onClose}
        >
          ×
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Add New Administrator</h2>
          <p className="text-sm text-slate-500">Create a new administrator account with specific roles.</p>
        </div>

        {/* Error is now only shown for actual failures, not success */}
        {error && (
          <div className="mb-4 p-2 text-xs bg-red-50 text-red-600 border border-red-100 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Shibangi"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Gender</label>
              <select
                className="w-full border border-slate-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="shibiadmin@mail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          />

          <div>
            <label className="text-xs font-medium text-slate-700 mb-2 block">Admin Level</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={form.role === "admin"}
                  onChange={() => setForm({ ...form, role: "admin" })}
                  className="w-4 h-4 accent-blue-600"
                />
                Admin
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={form.role === "superadmin"}
                  onChange={() => setForm({ ...form, role: "superadmin" })}
                  className="w-4 h-4 accent-blue-600"
                />
                Super Admin
              </label>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Add Administrator"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAdminModal;