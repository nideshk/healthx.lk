"use client";
import React, { useState } from "react";
import { Calendar, Filter } from "lucide-react";

const clinicians = [
  { name: "Dr. Michael Chen", specialty: "Psychiatrist", total: 2, completed: 2, revenue: 9000 },
  { name: "Dr. Sarah Wilson", specialty: "Cardiologist", total: 2, completed: 1, revenue: 5000 },
  { name: "Dr. Emily Davis", specialty: "General Physician", total: 2, completed: 1, revenue: 3000 },
  { name: "Dr. David Kumar", specialty: "Pediatrician", total: 1, completed: 0, revenue: 0 },
  { name: "Dr. Lisa Anderson", specialty: "Dermatologist", total: 1, completed: 0, revenue: 0 },
];

export default function BookingsTracking() {
  const [specialty, setSpecialty] = useState("All");
  const total = clinicians.length * 2;
  const completed = clinicians.reduce((acc, c) => acc + c.completed, 0);
  const revenue = clinicians.reduce((acc, c) => acc + c.revenue, 0);

  return (
    <div className="text-sm">
      <div className="rounded-t-lg bg-blue-600 text-white p-4">
        <h1 className="text-lg font-semibold">Bookings Tracking</h1>
        <p className="text-xs text-blue-100">Track appointments and filter by date or specialty</p>
      </div>

      <div className="bg-white border rounded-b-lg p-4 space-y-4">
        {/* Filters */}
        <div className="border rounded-md p-3 bg-blue-50">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Filter size={14} /> Filters
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <input type="date" className="border rounded-md px-2 py-1" placeholder="From" />
            <input type="date" className="border rounded-md px-2 py-1" placeholder="To" />
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="border rounded-md px-2 py-1"
            >
              <option>All Specialties</option>
              <option>Psychiatrist</option>
              <option>Cardiologist</option>
              <option>General Physician</option>
              <option>Pediatrician</option>
              <option>Dermatologist</option>
            </select>
          </div>
          <button className="text-xs mt-2 border px-3 py-1 rounded-md hover:bg-white">Clear Filters</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 text-white font-semibold text-center">
          <div className="bg-blue-600 rounded-md py-2">Total Bookings<br />{total}</div>
          <div className="bg-green-600 rounded-md py-2">Completed<br />{completed}</div>
          <div className="bg-orange-500 rounded-md py-2">Upcoming<br />{total - completed}</div>
          <div className="bg-purple-600 rounded-md py-2">Total Revenue<br />LKR {revenue}</div>
        </div>

        {/* Clinician performance */}
        <div className="border-t pt-2">
          <h3 className="font-semibold mb-2">Clinician Performance</h3>
          {clinicians.map((c, i) => (
            <div key={i} className="border rounded-md p-3 flex justify-between items-center mb-2">
              <div>
                <h4 className="font-medium">{c.name}</h4>
                <p className="text-xs text-gray-500">{c.specialty}</p>
                <p className="text-xs mt-1">
                  Total Appointments: {c.total} | Completed: {c.completed} | Revenue: LKR {c.revenue}
                </p>
              </div>
              <button className="text-xs border px-3 py-1 rounded-md hover:bg-gray-50">View Details</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
