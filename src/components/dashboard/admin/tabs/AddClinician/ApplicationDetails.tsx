import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify"; // Added toast import
import {
  Loader2,
  ArrowLeft,
  Edit2,
  Save,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";

const ApplicationDetails = ({
  applicationId,
  onBack,
}: {
  applicationId: string;
  onBack: () => void;
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isEditingLicense, setIsEditingLicense] = useState(false);
  const [license, setLicense] = useState("");

  // Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(
          `/api/practitioner-applications/${applicationId}`
        );
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setLicense(json.data.license_number);
        }
      } catch (err) {
        toast.error("Failed to load application details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [applicationId]);

  const handleAction = async (action: "approve" | "reject") => {
    // Validation for rejection reason
    if (action === "reject" && !rejectionReason.trim()) {
      return toast.error("Please provide a reason for rejection");
    }

    setProcessing(true);
    try {
      const res = await fetch(
        `/api/practitioner-applications/${applicationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason: action === "reject" ? rejectionReason : undefined,
            license_number: isEditingLicense ? license : undefined,
          }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        toast.success(`Application ${action === "approve" ? "approved" : "rejected"} successfully`);
        onBack();
      } else {
        toast.error(result.message || `Failed to ${action} application`);
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
      setShowApproveModal(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4 relative">
      <Button size="sm" onClick={onBack} className="flex items-center gap-2">
        <ArrowLeft size={16} /> Back to List
      </Button>

      <Card>
        <CardBody className="space-y-8">
          {/* Section: Basic Info */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={`${data.first_name} ${data.last_name}`}
                disabled
              />
              <Input label="Email" value={data.email} disabled />
              <Input
                label="Specialization"
                value={data.specialization?.join(", ")}
                disabled
              />
              <Input
                label="Experience"
                value={`${data.experience_years} Years`}
                disabled
              />
              <Input
                label="Location"
                value={`${data.city}, ${data.state}`}
                disabled
              />
              <Input label="Contact" value={data.contact_number} disabled />
              <Input
                label="Qualification"
                value={data.qualification}
                disabled
              />
              <div className="col-span-2">
                <label className="text-xs text-slate-600 mb-1 block">Profile Bio</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 text-slate-600" 
                  rows={2} 
                  value={data.profile_bio} 
                  disabled 
                />
              </div>
            </div>
          </section>

          {/* Section: Fees & Availability */}
          <div className="grid grid-cols-2 gap-8">
            <section>
              <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
                Fees
              </h3>
              {Object.values(data.fees || {}).map((f: any, i) => (
                <div key={i} className="text-xs p-2 bg-slate-50 rounded mb-2 border border-slate-100">
                  <strong>{f.type}</strong>: LKR {f.fee} (+ LKR {f.platform_fee}{" "}
                  platform)
                </div>
              ))}
            </section>
            <section>
              <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
                Availability
              </h3>
              <div className="text-xs text-slate-600 space-y-1">
                <p><strong>Time:</strong> {data.availability?.start_time} - {data.availability?.end_time}</p>
                <p><strong>Timezone:</strong> {data.availability?.timezone}</p>
                <p><strong>Unavailable:</strong> {data.availability?.days_unavailable?.join(", ") || "None"}</p>
              </div>
            </section>
          </div>

          {/* Section: Registration */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Registration
            </h3>
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
                {isEditingLicense ? <Save size={16} /> : <Edit2 size={16} />}
              </Button>
            </div>
          </section>

          {/* Section: Bank Details */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Bank Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank" value={data.bank_details?.bank_name} disabled />
              <Input label="Account Name" value={data.bank_details?.account_name} disabled />
              <Input label="A/C Number" value={data.bank_details?.account_number} disabled />
              <Input label="IFSC Code" value={data.bank_details?.ifsc_code} disabled />
              <Input label="Swift Code" value={data.bank_details?.swift_code} disabled />
            </div>
          </section>

          {/* Section: Documents */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Supporting Documents
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {data.documents?.map((doc: any, idx: number) => (
                <a
                  key={idx}
                  href={doc.view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400 group-hover:text-blue-600" />
                    <span className="text-xs font-medium uppercase">
                      {doc.document_type.replace("_", " ")}
                    </span>
                  </div>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-600" />
                </a>
              ))}
            </div>
          </section>

          {/* Footer Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => setShowRejectModal(true)}
            >
              Reject Application
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => setShowApproveModal(true)}
            >
              Approve & Create Clinician
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* --- MODALS --- */}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Reject Application</h3>
              <button onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Please provide a reason for rejecting{" "}
              <strong>{data.first_name}</strong>'s application.
            </p>
            <textarea
              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              rows={4}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <Button
                
                className="flex-1"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600"
                disabled={processing}
                onClick={() => handleAction("reject")}
              >
                {processing ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Confirm Reject"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save size={32} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">
              Approve Application?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              This will create a practitioner account for{" "}
              <strong>
                {data.first_name} {data.last_name}
              </strong>
              . This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                
                className="flex-1"
                onClick={() => setShowApproveModal(false)}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 bg-green-600"
                disabled={processing}
                onClick={() => handleAction("approve")}
              >
                {processing ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Confirm & Approve"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetails;