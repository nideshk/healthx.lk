"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import HomepageSlotPicker from "./HomepageSlotPicker";
import {
  Stethoscope,
  User,
  Clock,
  ArrowLeft,
  Star,
} from "lucide-react";
import { BadgeCheck } from "lucide-react";
import { ICON_MAP } from "@/lib/lucideIcons";

/* ---------- Types ---------- */

type Service = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string;
  sin_description: string;
};

type Doctor = {
  id: string;
  full_name: string;
  specialization: string;
  avg_rating: number;
  qualification: string | null;
  profile_bio: string | null;
  profile_picture_url: string | null;
};

/* ---------- Main Component ---------- */

export default function ServiceDoctorFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);
  const [selectedDoctor, setSelectedDoctor] =
    useState<Doctor | null>(null);

  /* ---------- Fetch services ---------- */
  useEffect(() => {
    axios.get("/api/specialisation").then((res) => {
      setServices(res.data.services || []);
    });
  }, []);

  /* ---------- Fetch doctors ---------- */
  useEffect(() => {
    if (!selectedService) return;

    setLoading(true);
    axios
      .get(`/api/specialisation/${selectedService.slug}`)
      .then((res) => {
        setDoctors(res.data.practitioners || []);
      })
      .finally(() => setLoading(false));
  }, [selectedService]);

  const goBack = () => {
    if (step === 1) return;
    setStep((step - 1) as any);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Progress */}
        <ProgressHeader step={step} />

        {/* Back */}
        {step > 1 && (
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-gray-600 mb-6 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          {loading && <LoadingState />}

          {step === 1 && !loading && (
            <ServicePicker
              services={services}
              onSelect={(s) => {
                setSelectedService(s);
                setStep(2);
              }}
            />
          )}

          {step === 2 && selectedService && !loading && (
            <DoctorPicker
              doctors={doctors}
              onSelect={(d) => {
                setSelectedDoctor(d);
                setStep(3);
              }}
            />
          )}

          {step === 3 && selectedDoctor && selectedService && (
            <HomepageSlotPicker
              practitionerId={selectedDoctor.id}
              selectedService={selectedService}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Progress Header ---------- */

const ProgressHeader = ({ step }: { step: number }) => {
  const steps = [
    { label: "Service", icon: <Stethoscope size={16} /> },
    { label: "Doctor", icon: <User size={16} /> },
    { label: "Time", icon: <Clock size={16} /> },
  ];

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center">
        {steps.map((s, i) => {
          const active = i + 1 <= step;
          return (
            <div key={s.label} className="flex-1 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-2
                  ${active
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-200 text-gray-500"
                  }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-xs font-medium ${active ? "text-cyan-600" : "text-gray-400"
                  }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-1 bg-gray-200 rounded mt-4">
        <div
          className="h-1 bg-cyan-600 rounded transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
};

/* ---------- Service Picker ---------- */

const ServicePicker = ({
  services,
  onSelect,
}: {
  services: Service[];
  onSelect: (s: Service) => void;
}) => (
  <div>
    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
      Choose a service
    </h2>
    <p className="text-gray-500 mb-6">
      Select the type of care you’re looking for
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {services.map((s) => {
        const Icon =
          ICON_MAP[s.icon as string] || Stethoscope;

        return (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="
              group relative text-left rounded-2xl border border-gray-200
              p-5 bg-white
              hover:border-cyan-500 hover:shadow-lg
              transition-all duration-200
            "
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="
                  w-12 h-12 rounded-xl flex items-center justify-center
                  bg-cyan-50 text-cyan-600
                  group-hover:bg-cyan-600 group-hover:text-white
                  transition
                "
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {s.name}
                </h3>

                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  {s.description}
                </p>
                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  {s.sin_description}
                </p>
              </div>
            </div>

            <div className="mt-4 text-sm font-medium text-cyan-600 opacity-0 group-hover:opacity-100 transition">
              View doctors →
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

/* ---------- Doctor Picker ---------- */

const DoctorPicker = ({
  doctors,
  onSelect,
}: {
  doctors: Doctor[];
  onSelect: (d: Doctor) => void;
}) => (
  <div>
    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
      Select a doctor
    </h2>
    <p className="text-gray-500 mb-6">
      Choose from verified specialists available for consultation
    </p>

    <div className="space-y-4">
      {doctors.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d)}
          className="
            group w-full text-left
            border border-gray-200 rounded-2xl p-5
            hover:border-cyan-500 hover:shadow-lg
            transition-all
          "
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {d.profile_picture_url ? (
                <img
                  src={d.profile_picture_url}
                  alt={d.full_name}
                  className="w-14 h-14 rounded-full object-cover border"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-bold text-lg">
                  {d.full_name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate">
                  {d.full_name}
                </p>

                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={12} />
                  Verified
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-0.5">
                {d.qualification || "Qualified specialist"}
              </p>

              {d.profile_bio && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {d.profile_bio}
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <Star size={14} className="text-yellow-500" />
              {d.avg_rating ? d.avg_rating.toFixed(1) : "New"}
            </div>
          </div>

          <div className="mt-4 text-sm font-medium text-cyan-600 opacity-0 group-hover:opacity-100 transition">
            View availability →
          </div>
        </button>
      ))}
    </div>
  </div>
);

/* ---------- Loading ---------- */

const LoadingState = () => (
  <div className="text-center py-16 text-gray-500">
    Loading available options…
  </div>
);
