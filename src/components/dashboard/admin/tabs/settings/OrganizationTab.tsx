"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";

interface Setting {
  key: string;
  value: string;
  description: string;
}

const OrganizationTab: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    org_name: "",
    org_address: "",
    org_phone: "",
    org_email: "",
    disclaimer: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await authFetch("/api/platform_settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const json = await res.json();
      if (json.success) {
        const mapped = json.data.reduce((acc: any, curr: Setting) => {
          acc[curr.key] = curr.value || "";
          return acc;
        }, {});
        setSettings(prev => ({ ...prev, ...mapped }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await authFetch("/api/platform_settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        toast.success("Organization settings updated successfully");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-6 shadow-sm animate-in fade-in duration-300">
      <div>
        <div className="text-sm font-semibold text-slate-900 mb-1">Organization Profile</div>
        <p className="text-xs text-slate-500">
          These details will be displayed on the website footer, contact pages, and generated prescription PDFs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Input
            label="Organization Name"
            value={settings.org_name}
            onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
            placeholder="e.g. CLINECXA"
          />
          <Input
            label="Contact Phone"
            value={settings.org_phone}
            onChange={(e) => setSettings({ ...settings, org_phone: e.target.value })}
            placeholder="+94 XXX XXX XXX"
          />
          <Input
            label="Support Email"
            value={settings.org_email}
            onChange={(e) => setSettings({ ...settings, org_email: e.target.value })}
            placeholder="support@example.com"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Physical Address
            </label>
            <textarea
              className="w-full min-h-[148px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              value={settings.org_address}
              onChange={(e) => setSettings({ ...settings, org_address: e.target.value })}
              placeholder="Enter the full physical address..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              PDF Disclaimer
            </label>
            <textarea
              className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              value={settings.disclaimer}
              onChange={(e) => setSettings({ ...settings, disclaimer: e.target.value })}
              placeholder="Enter the disclaimer to be displayed at the bottom of the PDF..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button onClick={saveSettings} disabled={saving} className="px-10 h-11">
          {saving ? "Saving..." : "Save Organization Details"}
        </Button>
      </div>
    </div>
  );
};

export default OrganizationTab;
