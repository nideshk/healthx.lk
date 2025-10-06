import { NextResponse } from "next/server";

const dummyDoctors = [
  {
    id: 101,
    first_name: "Alice",
    last_name: "Fernandes",
    provider_type: "Physiotherapist",
    email: "alice@healthcare.com",
    phone: "+91-9876543210",
    active: true,
    next_available: "2025-10-07T10:00:00Z"
  },
  {
    id: 102,
    first_name: "Rohan",
    last_name: "Sharma",
    provider_type: "General Practitioner",
    email: "rohan@healthcare.com",
    phone: "+91-9123456789",
    active: true,
    next_available: "2025-10-07T11:30:00Z"
  },
  {
    id: 103,
    first_name: "Priya",
    last_name: "Mehta",
    provider_type: "Dermatologist",
    email: "priya@healthcare.com",
    phone: "+91-9988776655",
    active: true,
    next_available: "2025-10-08T09:00:00Z"
  },
  {
    id: 104,
    first_name: "Vikram",
    last_name: "Patel",
    provider_type: "Physiotherapist",
    email: "vikrampatel@gmail.com",
    phone: "+91-8877665544",
    active: false,
    next_available: "2025-10-08T09:00:00Z"
  },
  {
    id: 105,
    first_name: "Sneha",
    last_name: "Iyer",
    provider_type: "Cardiologist",
    email: "snehaIyer@gmail.com",
    phone: "+91-7766554433",
    active: true,
    next_available: "2025-10-09T14:00:00Z"
  },
    {
    id: 106,
    first_name: "Arjun",
    last_name: "Reddy",
    provider_type: "Neurologist",
    email: "arjunReddy@gmail.com",
    phone: "+91-6655443322",
    active: true,
    next_available: "2025-10-09T15:30:00Z"
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service_id = searchParams.get("service_id");
  
  let filtered = dummyDoctors;
  if (service_id) {
    filtered = dummyDoctors.filter(doc =>
      doc.provider_type.toLowerCase().includes("physio")
    );
  }

  return NextResponse.json({
    status: "success",
    total: filtered.length,
    data: filtered
  });
}
