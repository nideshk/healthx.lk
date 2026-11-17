"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useFormatSpecialties } from "@/lib/specialtyLabels";
import { practitionerPublicPath } from "@/lib/practitionerPath";

type PublicDoctor = {
  id: string;
  slug?: string | null;
  full_name: string;
  specialization?: string[];
  qualification?: string | null;
  profile_picture_url?: string | null;
  has_current_availability?: boolean;
};

type ServiceRow = {
  slug?: string | null;
};

const MAX_DOCTORS = 6;

export default function MeetDoctors() {
  const tSelection = useTranslations("doctorSelection");
  const tHome = useTranslations("homeRedesign");
  const formatSpecialties = useFormatSpecialties();
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const servicesRes = await axios.get("/api/specialisation");
        const services: ServiceRow[] = servicesRes.data?.services ?? [];
        const lists = await Promise.all(
          services.map((service) => {
            const slug = (service.slug ?? "").trim().toLowerCase();
            if (!slug) return Promise.resolve([] as PublicDoctor[]);
            return axios
              .get(`/api/specialisation/${encodeURIComponent(slug)}`)
              .then((res) => (res.data?.practitioners ?? []) as PublicDoctor[])
              .catch(() => [] as PublicDoctor[]);
          })
        );

        if (cancelled) return;

        const seen = new Set<string>();
        const merged: PublicDoctor[] = [];
        for (const list of lists) {
          for (const doctor of list) {
            if (!doctor?.id || seen.has(doctor.id)) continue;
            seen.add(doctor.id);
            merged.push(doctor);
            if (merged.length >= MAX_DOCTORS) break;
          }
          if (merged.length >= MAX_DOCTORS) break;
        }
        setDoctors(merged);
      } catch {
        if (!cancelled) setDoctors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="meet-doctors-title" className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 id="meet-doctors-title" className="cx-heading">
          {tHome("doctors.title")}
        </h2>

        {loading ? (
          <div
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            aria-busy="true"
            aria-live="polite"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-cx-border bg-white p-5"
              >
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-xl bg-cx-tint animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-32 rounded bg-cx-tint animate-pulse" />
                    <div className="h-3 w-24 rounded bg-cx-tint animate-pulse" />
                    <div className="h-3 w-full rounded bg-cx-tint animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <p className="mt-6 text-base md:text-lg text-cx-ink">
            {tHome("doctors.empty")}
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor) => {
              const specialties = formatSpecialties(doctor.specialization);
              const bookable = doctor.has_current_availability !== false;
              return (
                <li
                  key={doctor.id}
                  className="rounded-2xl border border-cx-border bg-white p-5"
                >
                  <div className="flex items-start gap-4">
                    {doctor.profile_picture_url ? (
                      <img
                        src={doctor.profile_picture_url}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover border border-cx-border shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-cx-tint text-cx-primary flex items-center justify-center text-xl font-semibold shrink-0">
                        {doctor.full_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-cx-ink leading-tight">
                        <Link href={practitionerPublicPath(doctor)} className="hover:text-cx-primary">
                          {doctor.full_name}
                        </Link>
                      </h3>
                      {specialties ? (
                        <p className="mt-1 text-base text-cx-primary">
                          {specialties}
                        </p>
                      ) : null}
                      {doctor.qualification ? (
                        <p className="mt-1 text-base text-cx-ink">
                          {doctor.qualification}
                        </p>
                      ) : null}
                      {!bookable ? (
                        <p className="mt-3 inline-flex text-sm font-semibold text-cx-ink bg-cx-gold rounded-full px-3 py-1">
                          {tSelection("noCurrentAvailability")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
