import { NextResponse } from "next/server";

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  cliniko_appointment_type_id?: number;
  active: boolean;
}

let dummyServices: Service[] = [
  {
    id: "svc1",
    name: "General Consultation",
    description: "Consult with our general practitioners for any health concern.",
    duration: 30,
    price: 1200,
    cliniko_appointment_type_id: 101,
    active: true,
  },
  {
    id: "svc2",
    name: "Physical Therapy",
    description: "Book a session with our physiotherapists for rehab or mobility improvement.",
    duration: 45,
    price: 1500,
    cliniko_appointment_type_id: 102,
    active: true,
  },
  {
    id: "svc3",
    name: "Dermatology Consultation",
    description: "Skin, hair, and cosmetic consultation with expert dermatologists.",
    duration: 30,
    price: 2000,
    cliniko_appointment_type_id: 103,
    active: true,
  },
];

// =====================
// GET /api/services
// =====================
export async function GET() {
  return NextResponse.json({
    status: "success",
    total: dummyServices.length,
    data: dummyServices.filter((s) => s.active),
  });
}

// =====================
// POST /api/services  (Admin only)
// =====================
export async function POST(req: Request) {
  const body = await req.json();

  const newService: Service = {
    id: `svc${dummyServices.length + 1}`,
    name: body.name,
    description: body.description,
    duration: body.duration,
    price: body.price,
    cliniko_appointment_type_id: body.cliniko_appointment_type_id,
    active: true,
  };

  dummyServices.push(newService);

  return NextResponse.json({
    status: "success",
    message: "Service created successfully",
    data: newService,
  });
}
