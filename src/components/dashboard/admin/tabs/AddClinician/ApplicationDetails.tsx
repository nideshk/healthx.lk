import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import {
  Loader2,
  ArrowLeft,
  Edit2,
  Save,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

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
  const [isEditing, setIsEditing] = useState(false);

  type FormData = {
    first_name: string;
    last_name: string;
    email: string;
    specialization: string | string[];
    experience_years: string;
    city: string;
    state: string;
    contact_number: string;
    qualification: string;
    profile_bio: string;
    license_number: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    ifsc_code: string;
    swift_code: string;
  };

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    specialization: [] as string[],
    experience_years: "",
    city: "",
    state: "",
    contact_number: "",
    qualification: "",
    profile_bio: "",
    license_number: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    ifsc_code: "",
    swift_code: "",
  });

  // Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await authFetch(
          `/api/practitioner-applications/${applicationId}`,
        );
        if (!res.ok) {
          throw new Error(
            `Failed to fetch practitioner application: ${res.status}`,
          );
        }
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          // Initialize form data with fetched values
          setFormData({
            first_name: json.data.first_name || "",
            last_name: json.data.last_name || "",
            email: json.data.email || "",
            specialization: json.data.specialization || [],
            experience_years: json.data.experience_years || "",
            city: json.data.city || "",
            state: json.data.state || "",
            contact_number: json.data.contact_number || "",
            qualification: json.data.qualification || "",
            profile_bio: json.data.profile_bio || "",
            license_number: json.data.license_number || "",
            bank_name: json.data.bank_details?.bank_name || "",
            account_name: json.data.bank_details?.account_name || "",
            account_number: json.data.bank_details?.account_number || "",
            ifsc_code: json.data.bank_details?.ifsc_code || "",
            swift_code: json.data.bank_details?.swift_code || "",
          });
        }
      } catch (err) {
        toast.error("Failed to load application details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [applicationId]);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (data) {
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        specialization: data.specialization || [],
        experience_years: data.experience_years || "",
        city: data.city || "",
        state: data.state || "",
        contact_number: data.contact_number || "",
        qualification: data.qualification || "",
        profile_bio: data.profile_bio || "",
        license_number: data.license_number || "",
        bank_name: data.bank_details?.bank_name || "",
        account_name: data.bank_details?.account_name || "",
        account_number: data.bank_details?.account_number || "",
        ifsc_code: data.bank_details?.ifsc_code || "",
        swift_code: data.bank_details?.swift_code || "",
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      const res = await authFetch(
        `/api/practitioner-applications/${applicationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            ...formData,
            specialization: Array.isArray(formData.specialization)
              ? formData.specialization
              : formData.specialization.split(",").map((s) => s.trim()),
          }),
        },
      );

      const result = await res.json();

      if (res.ok) {
        toast.success("Application approved successfully");
        onBack();
      } else {
        toast.error(result.message || "Failed to approve application");
      }
    } catch (err: any) {
      toast.error("An error occurred while saving");
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const res = await authFetch(
        `/api/practitioner-applications/${applicationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            reason: rejectionReason,
          }),
        },
      );

      const result = await res.json();

      if (res.ok) {
        toast.success("Application rejected successfully");
        onBack();
      } else {
        toast.error(result.message || "Failed to reject application");
      }
    } catch (err: any) {
      toast.error("An error occurred while rejecting");
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
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
      <div className="flex justify-between items-center">
        <Button size="sm" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Back to List
        </Button>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={16} className="mr-1" /> Edit Application
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setShowApproveModal(true)}
                loading={processing}
              >
                <Save size={16} className="mr-1" /> Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="space-y-8">
          {/* Section: Basic Info */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Specialization (Comma separated)"
                value={
                  Array.isArray(formData.specialization)
                    ? formData.specialization.join(", ")
                    : formData.specialization
                }
                onChange={(e) =>
                  handleChange(
                    "specialization",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
                disabled={!isEditing}
              />
              <Input
                label="Experience Years"
                value={formData.experience_years}
                onChange={(e) =>
                  handleChange("experience_years", e.target.value)
                }
                disabled={!isEditing}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  disabled={!isEditing}
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <Input
                label="Contact"
                value={formData.contact_number}
                onChange={(e) => handleChange("contact_number", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Qualification"
                value={formData.qualification}
                onChange={(e) => handleChange("qualification", e.target.value)}
                disabled={!isEditing}
              />
              <div className="col-span-2">
                <label className="text-xs text-slate-600 mb-1 block">
                  Profile Bio
                </label>
                <textarea
                  className={`w-full border border-slate-200 rounded-lg p-2 text-sm ${!isEditing ? "bg-slate-50 text-slate-600 cursor-not-allowed" : "bg-white text-slate-900"}`}
                  rows={2}
                  value={formData.profile_bio}
                  onChange={(e) => handleChange("profile_bio", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </section>

          {/* Section: Fees & Availability (Read-only) */}
          <div className="grid grid-cols-2 gap-8">
            <section>
              <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
                Fees
              </h3>
              {Object.values(data?.fees || {}).map((f: any, i) => (
                <div
                  key={i}
                  className="text-xs p-2 bg-slate-50 rounded mb-2 border border-slate-100"
                >
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
                <p>
                  <strong>Time:</strong> {data?.availability?.start_time} -{" "}
                  {data?.availability?.end_time}
                </p>
                <p>
                  <strong>Timezone:</strong> {data?.availability?.timezone}
                </p>
                <p>
                  <strong>Unavailable:</strong>{" "}
                  {data?.availability?.days_unavailable?.join(", ") || "None"}
                </p>
              </div>
            </section>
          </div>

          {/* Section: Registration */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Registration
            </h3>
            <Input
              label="License Number"
              value={formData.license_number}
              onChange={(e) => handleChange("license_number", e.target.value)}
              disabled={!isEditing}
            />
          </section>

          {/* Section: Bank Details */}
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
              Bank Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={formData.bank_name}
                onChange={(e) => handleChange("bank_name", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Account Name"
                value={formData.account_name}
                onChange={(e) => handleChange("account_name", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Account Number"
                value={formData.account_number}
                onChange={(e) => handleChange("account_number", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="IFSC Code"
                value={formData.ifsc_code}
                onChange={(e) => handleChange("ifsc_code", e.target.value)}
                disabled={!isEditing}
              />
              <Input
                label="Swift Code"
                value={formData.swift_code}
                onChange={(e) => handleChange("swift_code", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </section>

          {/* Section: Documents */}
          {data?.documents && data.documents.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">
                Supporting Documents
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {data.documents.map((doc: any, idx: number) => (
                  <a
                    key={idx}
                    href={doc.view_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText
                        size={18}
                        className="text-slate-400 group-hover:text-blue-600"
                      />
                      <span className="text-xs font-medium uppercase">
                        {doc.document_type.replace("_", " ")}
                      </span>
                    </div>
                    <ExternalLink
                      size={14}
                      className="text-slate-300 group-hover:text-blue-600"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Footer Actions */}
          {!isEditing && (
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
          )}
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
              <strong>{formData.first_name}</strong>'s application.
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
                disabled={processing || !rejectionReason.trim()}
                onClick={handleReject}
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
              {isEditing ? "Save Changes?" : "Approve Application?"}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {isEditing
                ? "All changes will be saved and the application will be approved."
                : `This will create a practitioner account for ${formData.first_name} ${formData.last_name}. This action cannot be undone.`}
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
                onClick={handleSave}
              >
                {processing ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : isEditing ? (
                  "Save & Approve"
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
