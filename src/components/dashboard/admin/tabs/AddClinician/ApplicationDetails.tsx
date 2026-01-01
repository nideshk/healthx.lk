import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { Loader2, ArrowLeft, Edit2, Save } from "lucide-react";

const ApplicationDetails = ({ applicationId, onBack }: { applicationId: string; onBack: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isEditingLicense, setIsEditingLicense] = useState(false);
  const [license, setLicense] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/practitioner-applications/${applicationId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setLicense(json.data.license_number);
        }
      } finally { setLoading(false); }
    };
    fetchDetail();
  }, [applicationId]);

  const handleAction = async (action: "approve" | "reject") => {
    const reason = action === "reject" ? prompt("Enter rejection reason (optional):") : null;
    if (!confirm(`Are you sure you want to ${action} this application?`)) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/practitioner-applications/${applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action, 
          reason: reason || undefined,
          license_number: isEditingLicense ? license : undefined 
        }),
      });
      if (res.ok) {
        alert(`Application ${action}ed successfully`);
        onBack();
      }
    } finally { setProcessing(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={onBack} className="flex items-center gap-2">
        <ArrowLeft size={16} /> Back to List
      </Button>

      <Card>
        <CardBody className="space-y-8">
          {/* Section: Basic Info */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" value={`${data.first_name} ${data.last_name}`} disabled />
              <Input label="Email" value={data.email} disabled />
            </div>
          </section>

          {/* Section: License (Editable) */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2">Registration</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input 
                  label="License Number" 
                  value={license} 
                  onChange={(e) => setLicense(e.target.value)} 
                  disabled={!isEditingLicense} 
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsEditingLicense(!isEditingLicense)}
              >
                {isEditingLicense ? <Save size={16}/> : <Edit2 size={16}/>}
              </Button>
            </div>
          </section>

          {/* Action Footer */}
          <div className="flex gap-4 pt-6 border-t">
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700" 
              onClick={() => handleAction("reject")}
              disabled={processing}
            >
              Reject Application
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700" 
              onClick={() => handleAction("approve")}
              disabled={processing}
            >
              {processing ? <Loader2 className="animate-spin mr-2"/> : null}
              Approve & Create Clinician
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ApplicationDetails;