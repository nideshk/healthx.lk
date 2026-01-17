import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface ApplicationListProps {
  onViewDetails: (id: string) => void;
  onAddNew: () => void;
}

const ApplicationList: React.FC<ApplicationListProps> = ({ onViewDetails, onAddNew }) => {
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/practitioner-applications");
      if (!res.ok) {
          throw new Error(`Failed to fetch practitioner application list: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) setApps(json.data);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  const filteredApps = apps.filter(app => 
    `${app.first_name} ${app.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    app.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Practitioner Applications</div>
          <div className="text-xs text-slate-500">Find records and manage incoming applications</div>
        </div>
        <Button size="sm" onClick={onAddNew}>+ Add New Clinician</Button>
      </CardHeader>
      <CardBody className="space-y-4">
        <Input 
          placeholder="Search by name or email..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {filteredApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="cursor-pointer" onClick={() => onViewDetails(app.id)}>
                  <div className="text-sm font-bold text-blue-600 capitalize">{app.first_name} {app.last_name}</div>
                  <div className="text-xs text-slate-500">{app.email}</div>
                  <div className="text-xs text-slate-400 mt-1">{app.qualification} • {app.experience_years} Years Exp</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onViewDetails(app.id)}>View & Process</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ApplicationList;