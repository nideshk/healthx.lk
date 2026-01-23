"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { Coupon, CouponTable } from "@/components/atom/coupons/CouponTable";
import { CreateCouponModal } from "@/components/atom/coupons/CreateCouponModal";
import { toast } from "react-toastify";

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        authFetch("/api/coupons")
            .then(res => res.json())
            .then(data => {
                setCoupons(data);
                setLoading(false);
            });
    }, []);

    const handleCreated = (coupon: Coupon) => {
        toast.success("Coupon created successfully");
        setCoupons(prev => [coupon, ...prev]);
    };

    const handleStatusUpdate = (updated: Coupon) => {
        toast.success("Coupon updated successfully");
        setCoupons(prev =>
            prev.map(c => (c.id === updated.id ? updated : c))
        );
    };

    return (
        <>
            <div className="p-8 max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold">
                            Coupons
                        </h1>
                        <p className="text-slate-500">
                            Manage platform-wide and practitioner discounts.
                        </p>
                    </div>

                    <button
                        onClick={() => setOpen(true)}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-sm"
                    >
                        + Create Coupon
                    </button>
                </div>

                {loading ? (
                    <div className="grid place-items-center h-64 border-2 border-dashed rounded-2xl">
                        <p className="animate-pulse text-slate-400">
                            Fetching coupons…
                        </p>
                    </div>
                ) : (
                    <CouponTable
                        coupons={coupons}
                        onStatusChange={handleStatusUpdate}
                    />
                )}
            </div>

            <CreateCouponModal
                open={open}
                onClose={() => setOpen(false)}
                onCreated={handleCreated}
            />
        </>
    );
}
