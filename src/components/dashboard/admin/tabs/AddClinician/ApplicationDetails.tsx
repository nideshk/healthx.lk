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
  FileText,
  X,
  ChevronDown,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

type Specialization = {
  id: string;
  name: string;
  active: boolean;
  slug: string;
};

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
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isSpecOpen, setIsSpecOpen] = useState(false);

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
    languages: string;
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
    languages: "",
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await authFetch(`/api/practitioner-applications/${applicationId}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
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
            languages: Array.isArray(json.data.languages) ? json.data.languages.join(", ") : (json.data.languages || ""),
          });
        }
      } catch (err) {
        toast.error("Failed to load details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [applicationId]);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const res = await fetch("/api/form-data/appointment-config");
        const d = await res.json();
        setSpecializations(d.services || []);
      } catch (err) { console.error(err); }
    };
    fetchSpecializations();
  }, []);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSpecialization = (slug: string) => {
    const current = Array.isArray(formData.specialization) ? formData.specialization : [];
    handleChange("specialization", current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
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
        languages: Array.isArray(data.languages) ? data.languages.join(", ") : (data.languages || ""),
      });
    }
    setIsEditing(false);
    setIsSpecOpen(false);
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      const payload = {
        action: "approve",
        ...formData,
        languages: formData.languages.split(",").map(l => l.trim()).filter(l => l !== ""),
        specialization: Array.isArray(formData.specialization) ? formData.specialization : [],
      };
      const res = await authFetch(`/api/practitioner-applications/${applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Application approved");
        onBack();
      } else {
        toast.error("Failed to approve");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
      setShowApproveModal(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4 relative">
      <div className="flex justify-between items-center">
        <Button size="sm" onClick={onBack} className="flex items-center gap-2"><ArrowLeft size={16} /> Back</Button>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit2 size={16} className="mr-1" /> Edit</Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={() => setShowApproveModal(true)} loading={processing}><Save size={16} className="mr-1" /> Save</Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={formData.first_name} onChange={(e) => handleChange("first_name", e.target.value)} disabled={!isEditing} />
              <Input label="Last Name" value={formData.last_name} onChange={(e) => handleChange("last_name", e.target.value)} disabled={!isEditing} />
              <Input label="Email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} disabled={!isEditing} />
              <Input label="Languages" value={formData.languages} onChange={(e) => handleChange("languages", e.target.value)} disabled={!isEditing} placeholder="English, Spanish..." />
              
              {!isEditing ? (
                <Input label="Specialization" value={Array.isArray(formData.specialization) ? formData.specialization.join(", ") : ""} disabled={true} />
              ) : (
                <div className="relative">
                  <label className="text-xs text-slate-600 mb-1 block font-medium">Specialization</label>
                  <div className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between cursor-pointer" onClick={() => setIsSpecOpen(!isSpecOpen)}>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(formData.specialization) && formData.specialization.length === 0 ? <span className="text-slate-400 text-sm">Select...</span> : 
                        (Array.isArray(formData.specialization) ? formData.specialization : []).map(slug => (
                          <span key={slug} className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-sm">{specializations.find(s => s.slug === slug)?.name || slug}</span>
                        ))
                      }
                    </div>
                    <ChevronDown size={18} className="text-slate-400" />
                  </div>
                  {isSpecOpen && (
                    <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                      {specializations.filter(s => s.active).map(spec => (
                        <label key={spec.id} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" className="rounded accent-teal-600" checked={Array.isArray(formData.specialization) && formData.specialization.includes(spec.slug)} onChange={() => toggleSpecialization(spec.slug)} />
                          <span className="text-slate-700">{spec.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Input label="Experience" value={formData.experience_years} onChange={(e) => handleChange("experience_years", e.target.value)} disabled={!isEditing} />
              <Input label="City" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} disabled={!isEditing} />
              <Input label="State" value={formData.state} onChange={(e) => handleChange("state", e.target.value)} disabled={!isEditing} />
              <Input label="Contact" value={formData.contact_number} onChange={(e) => handleChange("contact_number", e.target.value)} disabled={!isEditing} />
            </div>
            <div className="mt-4">
              <label className="text-xs text-slate-600 mb-1 block font-medium">Profile Bio</label>
              <textarea className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none" rows={4} value={formData.profile_bio} onChange={(e) => handleChange("profile_bio", e.target.value)} disabled={!isEditing} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">Professional & Payout Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Qualification" value={formData.qualification} onChange={(e) => handleChange("qualification", e.target.value)} disabled={!isEditing} />
              <Input label="License #" value={formData.license_number} onChange={(e) => handleChange("license_number", e.target.value)} disabled={!isEditing} />
              <Input label="Bank Name" value={formData.bank_name} onChange={(e) => handleChange("bank_name", e.target.value)} disabled={!isEditing} />
              <Input label="Account Name" value={formData.account_name} onChange={(e) => handleChange("account_name", e.target.value)} disabled={!isEditing} />
              <Input label="Account Number" value={formData.account_number} onChange={(e) => handleChange("account_number", e.target.value)} disabled={!isEditing} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-4 border-b pb-2 text-slate-900">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.documents?.map((doc: any, idx: number) => (
                <a key={doc.id || idx} href={doc.view_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                  <FileText className="text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.document_type.replace("_", " ")}</p>
                    <p className="text-xs text-slate-500">View Document</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {!isEditing && (
            <div className="flex gap-4 pt-6 border-t">
              <Button className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-none" onClick={() => setShowRejectModal(true)}>Reject Application</Button>
              <Button className="flex-1 bg-teal-600" onClick={() => setShowApproveModal(true)}>Approve Application</Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
            <h3 className="font-bold text-slate-900 mb-2">{isEditing ? "Save Changes?" : "Approve Application?"}</h3>
            <p className="text-sm text-slate-600 mb-6">Confirming will save details and update the status.</p>
            <div className="flex gap-3">
              <Button className="flex-1" variant="outline" onClick={() => setShowApproveModal(false)}>Back</Button>
              <Button className="flex-1 bg-teal-600" disabled={processing} onClick={handleSave}>
                {processing ? <Loader2 className="animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-4">Reject Application</h3>
            <textarea className="w-full p-3 border rounded-lg text-sm mb-4" placeholder="Reason for rejection..." rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            <div className="flex gap-3">
              <Button className="flex-1" variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 text-white" disabled={processing || !rejectionReason} onClick={async () => {
                setProcessing(true);
                const res = await authFetch(`/api/practitioner-applications/${applicationId}/approve`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reject", reason: rejectionReason }),
                });
                if (res.ok) { toast.success("Rejected"); onBack(); } else { toast.error("Failed"); }
                setProcessing(false);
              }}>Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetails;