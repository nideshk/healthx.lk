"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useTranslations } from "next-intl";
import HomepageSlotPicker from "@/components/homepage/home/HomepageSlotPicker";
import Loader from "@/components/atom/Loader/Loader";

export default function DoctorPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const t = useTranslations("doctorProfile");
    const [doctor, setDoctor] = useState<any>(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        params.then(({ slug }) => {
            axios
                .get(`/api/doctor/${encodeURIComponent(slug)}`)
                .then((res) => {
                    if (cancelled) return;
                    if (!res.data?.practitioner) {
                        setMissing(true);
                        return;
                    }
                    setDoctor(res.data.practitioner);
                })
                .catch(() => {
                    if (!cancelled) setMissing(true);
                });
        });
        return () => {
            cancelled = true;
        };
    }, [params]);

    if (missing) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-lg font-semibold text-cx-ink">{t("notFound")}</p>
                <Link href="/" className="text-cx-primary font-semibold underline">
                    {t("backHome")}
                </Link>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="bg-cx-bg min-h-screen w-full">
            <div className=" mx-auto px-6 py-10">
                <div className="">
                    <div className="sticky top-24">
                        <HomepageSlotPicker
                            practitionerId={doctor.id}
                            practitioner={doctor}
                            selectedService={null}
                            hideStepCounter={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
