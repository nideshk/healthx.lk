"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";

export type Coupon = {
    id: string;
    code: string;
    discount_type: "flat" | "percentage";
    discount_value: number;
    applies_scope: "platform" | "practitioner" | "both";
    is_active: boolean;
    valid_until?: string;
    max_total_uses?: number;
};

export function CouponTable({
    coupons,
    showScope = true,
    onStatusChange
}: {
    coupons: Coupon[];
    showScope?: boolean;
    onStatusChange: (updatedCoupon: Coupon) => void;
}) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    async function toggleStatus(coupon: Coupon) {
        setProcessingId(coupon.id);
        const newStatus = !coupon.is_active;

        try {
            const res = await authFetch(`/api/coupons/${coupon.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_active: !coupon.is_active
                })
            });

            if (res.ok) {
                const updated = await res.json();
                onStatusChange(updated);
            } else {
                toast.error("Failed to update status");
            }
        } catch (err) {
            console.log(err);
            toast.error("An error occurred");
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 font-semibold text-slate-700">Code</th>
                        <th className="p-4 text-center font-semibold text-slate-700">Discount</th>
                        {showScope && <th className="p-4 text-center font-semibold text-slate-700">Who Pays</th>}
                        <th className="p-4 text-center font-semibold text-slate-700">Valid Till</th>
                        <th className="p-4 text-center font-semibold text-slate-700">Status</th>
                        <th className="p-4 text-right font-semibold text-slate-700">Action</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                    {coupons.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4 font-bold text-slate-900 uppercase tracking-tight">
                                {c.code}
                            </td>

                            <td className="p-4 text-center">
                                <span className="font-medium text-slate-700">
                                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `LKR - ${c.discount_value}`}
                                </span>
                            </td>

                            {showScope && (
                                <td className="p-4 text-center">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                                        {c.applies_scope}
                                    </span>
                                </td>
                            )}

                            <td className="p-4 text-center text-slate-500 font-medium">
                                {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "—"}
                            </td>

                            <td className="p-4 text-center">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                                    {c.is_active ? "Active" : "Inactive"}
                                </div>
                            </td>

                            <td className="p-4 text-right">
                                <button
                                    onClick={() => toggleStatus(c)}
                                    disabled={processingId === c.id}
                                    className={`min-w-[100px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${c.is_active
                                        ? "text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                                        : "text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                                        }`}
                                >
                                    {processingId === c.id ? "Updating..." : c.is_active ? "Deactivate" : "Activate"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}