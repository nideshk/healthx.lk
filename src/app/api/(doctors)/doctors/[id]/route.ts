import { NextRequest, NextResponse } from "next/server";

// Dummy doctors
const dummyDoctors = [
  {
    id: 101,
    first_name: "Alice",
    last_name: "Fernandes",
    provider_type: "Physiotherapist",
    bio: "Specialized in post-injury rehabilitation and physical therapy.",
    email: "alice@healthcare.com",
    phone: "+91-9876543210",
    active: true,
    next_available: "2025-10-07T10:00:00Z",
    qualifications: ["BPT", "MPT - Sports Medicine"],
    clinic: { name: "PhysioCare Clinic", location: "Bangalore, India" },
  },
  {
    id: 102,
    first_name: "Rohan",
    last_name: "Sharma",
    provider_type: "General Practitioner",
    bio: "Experienced in family medicine and chronic illness management.",
    email: "rohan@healthcare.com",
    phone: "+91-9123456789",
    active: true,
    next_available: "2025-10-07T11:30:00Z",
    qualifications: ["MBBS", "MD - Internal Medicine"],
    clinic: { name: "CarePoint Medical", location: "Mumbai, India" },
  },
  {
    id: 103,
    first_name: "Priya",
    last_name: "Mehta",
    provider_type: "Dermatologist",
    bio: "Expert in cosmetic dermatology and skin health consultation.",
    email: "priya@healthcare.com",
    phone: "+91-9988776655",
    active: true,
    next_available: "2025-10-08T09:00:00Z",
    qualifications: ["MBBS", "MD - Dermatology"],
    clinic: { name: "DermaGlow Clinic", location: "Delhi, India" },
  },
];

// ✅ FIX for Next.js 15
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ⬅️ `params` is now a Promise in new builds
  const { id } = await context.params;

  const doctorId = parseInt(id, 10);
  const doctor = dummyDoctors.find((doc) => doc.id === doctorId);

  if (!doctor) {
    return NextResponse.json(
      { status: "error", message: "Doctor not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    data: doctor,
  });
}
