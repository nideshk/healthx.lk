import { NextResponse } from "next/server";

// same dummy data (we can later move to a shared file)
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
    clinic: { name: "PhysioCare Clinic", location: "Bangalore, India" }
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
    clinic: { name: "CarePoint Medical", location: "Mumbai, India" }
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
    clinic: { name: "DermaGlow Clinic", location: "Delhi, India" }
  },
  {
    id: 104,
    first_name: "Vikram",
    last_name: "Patel",
    provider_type: "Physiotherapist",
    bio: "Focused on sports injuries and rehabilitation therapies.",
    email: "vikram@gmail.com",
    phone: "+91-8877665544",
    active: false,
    next_available: "2025-10-08T09:00:00Z",
    qualifications: ["BPT", "Certified Sports Therapist"],
    clinic: { name: "ActiveLife Physiotherapy", location: "Chennai, India" }
  },
  {
    id: 105,
    first_name: "Sneha",
    last_name: "Iyer",
    provider_type: "Cardiologist",
    bio: "Specialist in heart health and cardiovascular disease management.",
    email: "sneha@gmail.com",
    phone: "+91-7766554433",
    active: true,
    next_available: "2025-10-09T14:00:00Z",
    qualifications: ["MBBS", "MD - Cardiology"],
    clinic: { name: "HeartCare Center", location: "Hyderabad, India" }
  },
  {
    id: 106,
    first_name: "Arjun",
    last_name: "Reddy",
    provider_type: "Neurologist",
    bio: "Experienced in treating neurological disorders and brain health.",
    email: "arjun@gmail.com",
    phone: "+91-6655443322",
    active: true,
    next_available: "2025-10-09T15:30:00Z",
    qualifications: ["MBBS", "MD - Neurology"],
    clinic: { name: "NeuroHealth Clinic", location: "Pune, India"}
  }
];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const doctorId = parseInt(params.id, 10);
  const doctor = dummyDoctors.find((doc) => doc.id === doctorId);

  if (!doctor) {
    return NextResponse.json(
      { status: "error", message: "Doctor not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "success",
    data: doctor
  });
}
