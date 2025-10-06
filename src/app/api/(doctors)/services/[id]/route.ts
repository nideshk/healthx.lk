import { NextRequest, NextResponse } from "next/server";

// =====================
// Dummy services
// =====================
const dummyServices = [
  {
    id: "svc1",
    name: "General Consultation",
    description:
      "Consult with our general practitioners for any health concern.",
    duration: 30,
    price: 1200,
    cliniko_appointment_type_id: 101,
    active: true,
  },
  {
    id: "svc2",
    name: "Physical Therapy",
    description:
      "Book a session with our physiotherapists for rehab or mobility improvement.",
    duration: 45,
    price: 1500,
    cliniko_appointment_type_id: 102,
    active: true,
  },
  {
    id: "svc3",
    name: "Dermatology Consultation",
    description:
      "Skin, hair, and cosmetic consultation with expert dermatologists.",
    duration: 30,
    price: 2000,
    cliniko_appointment_type_id: 103,
    active: true,
  },
];

// =====================
// Dummy doctors
// =====================
const dummyDoctors = [
  {
    id: "doc1",
    first_name: "Alice",
    last_name: "Fernandes",
    provider_type: "General Practitioner",
    services: ["svc1", "svc2", "svc3"],
    experience: "8 years",
    rating: 4.8,
    next_available: "2025-10-07T10:00:00Z",
  },
  {
    id: "doc2",
    first_name: "Rohan",
    last_name: "Sharma",
    provider_type: "Physiotherapist",
    services: ["svc1", "svc2"],
    experience: "10 years",
    rating: 4.9,
    next_available: "2025-10-07T11:30:00Z",
  },
  {
    id: "doc3",
    first_name: "Priya",
    last_name: "Mehta",
    provider_type: "Dermatologist",
    services: ["svc1", "svc3"],
    experience: "6 years",
    rating: 4.7,
    next_available: "2025-10-08T09:00:00Z",
  },
  {
    id: "doc4",
    first_name: "Vikram",
    last_name: "Singh",
    provider_type: "Physiotherapist",
    services: ["svc2"],
    experience: "9 years",
    rating: 4.5,
    next_available: "2025-10-09T10:00:00Z",
  },
  {
    id: "doc5",
    first_name: "Anjali",
    last_name: "Desai",
    provider_type: "Dermatologist",
    services: ["svc3"],
    experience: "7 years",
    rating: 4.8,
    next_available: "2025-10-10T10:30:00Z",
  },
  {
    id: "doc6",
    first_name: "Rahul",
    last_name: "Kumar",
    provider_type: "General Practitioner",
    services: ["svc1"],
    experience: "5 years",
    rating: 4.6,
    next_available: "2025-10-07T13:00:00Z",
  },
];

// =====================
// ✅ FIXED HANDLER SIGNATURE
// =====================
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ IMPORTANT FIX — await the promise
  const { id } = await context.params;

  const serviceId = id;

  // 1️⃣ Find the service
  const service = dummyServices.find((s) => s.id === serviceId);
  if (!service) {
    return NextResponse.json(
      { status: "error", message: "Service not found" },
      { status: 404 }
    );
  }

  // 2️⃣ Find doctors that offer this service
  const doctors = dummyDoctors
    .filter((doc) => doc.services.includes(serviceId))
    .slice(0, 3);

  // 3️⃣ Return combined data
  return NextResponse.json({
    status: "success",
    data: {
      ...service,
      doctors: doctors.map((d) => ({
        id: d.id,
        name: `${d.first_name} ${d.last_name}`,
        specialization: d.provider_type,
        experience: d.experience,
        rating: d.rating,
        next_available: d.next_available,
      })),
    },
  });
}
