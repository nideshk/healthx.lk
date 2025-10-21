'use client';
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ConsultationStep({
  nextStep,
  updateData,
}: {
  nextStep: any;
  updateData: any;
}) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get("/api/services");
        setServices(res.data.services || []);
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleSelectService = (service: any) => {
    updateData({
      selectedServiceId: service.id,
      selectedServiceTitle: service.name,
      maxAttendees: service.max_attendees,
    });
    nextStep();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Loading services...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Select a Consultation Type
        </h2>
        <p className="text-center text-gray-500 mb-12">
          Connect with licensed practitioners for personalized care and
          treatment options.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => handleSelectService(service)}
              className="group relative bg-white rounded-3xl p-8 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent hover:border-blue-200 flex flex-col items-center text-center"
            >
              {/* Icon Circle */}
              <div className="w-16 h-16 bg-blue-100 flex items-center justify-center rounded-full mb-5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 3h3m-6-3h.01M9 15h.01M9 12h.01"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-800 uppercase mb-2">
                {service.name}
              </h3>

              {/* Description */}
              <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                {service.description ||
                  "Connect with licensed physicians for health and preventive care."}
              </p>

              {/* Badge */}
              <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full mb-3">
                {service.max_attendees > 1
                  ? `Group (max ${service.max_attendees})`
                  : "1-on-1"}
              </span>

              {/* CTA */}
              <button
                className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:text-blue-800 transition"
              >
                Select service
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* Subtle hover overlay */}
              <div className="absolute inset-0 rounded-3xl bg-blue-50 opacity-0 group-hover:opacity-30 transition-opacity"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
