"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import HomepageSlotPicker from "@/components/homepage/home/HomepageSlotPicker";
import Loader from "@/components/atom/Loader/Loader";

export default function DoctorPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [doctor, setDoctor] = useState<any>(null);
    useEffect(() => {
        params.then(({ slug }) => {
            axios
                .get(`/api/doctor/${slug}`)
                .then((res) => setDoctor(res.data.practitioner));
        });
    }, [params]);

    if (!doctor) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen w-full">

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