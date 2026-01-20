"use client";

import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { Coupon } from "./CouponTable";

export function CreateCouponModal({
    open,
    onClose,
    onCreated
}: {
    open: boolean;
    onClose: () => void;
    onCreated: (coupon: Coupon) => void;
}) {
    const [form, setForm] = useState<any>({
        discount_type: "flat",
        applies_scope: "platform"
    });

    if (!open) return null;

    async function submit() {
        if (!form.code || !form.discount_value) {
            alert("Coupon code and discount value are required");
            return;
        }

        if (
            form.applies_scope === "both" &&
            (form.platform_bear_percentage === undefined ||
                form.platform_bear_percentage < 0 ||
                form.platform_bear_percentage > 100)
        ) {
            alert("Platform share must be between 0–100%");
            return;
        }

        const res = await authFetch("/api/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });

        if (!res.ok) {
            alert("Failed to create coupon");
            return;
        }

        const created = await res.json();
        onCreated(created);
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Create Coupon
                        </h2>
                        <p className="text-sm text-slate-500">
                            Configure discount rules and responsibility
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8">

                    {/* Coupon Code */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">
                            Coupon Code
                        </label>
                        <input
                            placeholder="SUMMER25"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg uppercase tracking-wider focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            onChange={e =>
                                setForm({ ...form, code: e.target.value })
                            }
                        />
                    </div>

                    {/* Discount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                Discount Type
                            </label>
                            <select
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        discount_type: e.target.value
                                    })
                                }
                            >
                                <option value="flat">Flat Amount</option>
                                <option value="percentage">Percentage</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                Discount Value
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        discount_value: Number(e.target.value)
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Who Pays */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">
                            Who Pays for the Discount?
                        </label>

                        <select
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            onChange={e =>
                                setForm({
                                    ...form,
                                    applies_scope: e.target.value
                                })
                            }
                        >
                            <option value="platform">Platform</option>
                            <option value="practitioner">Practitioner</option>
                            <option value="both">Split Between Both</option>
                        </select>

                        {form.applies_scope === "both" && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <label className="text-sm font-medium text-slate-700">
                                    Platform Share (%)
                                </label>
                                <input
                                    type="number"
                                    placeholder="50"
                                    className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    onChange={e =>
                                        setForm({
                                            ...form,
                                            platform_bear_percentage: Number(
                                                e.target.value
                                            )
                                        })
                                    }
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Remaining percentage is paid by the practitioner
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Validity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                Valid From
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        valid_from: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : null
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                Valid Till
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        valid_until: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : null
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                Max Total Uses
                            </label>
                            <input
                                type="number"
                                placeholder="Unlimited"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        max_total_uses: Number(e.target.value)
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                Max Uses per User
                            </label>
                            <input
                                type="number"
                                placeholder="1"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        max_uses_per_user: Number(e.target.value)
                                    })
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={submit}
                        className="px-6 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition shadow-sm"
                    >
                        Create Coupon
                    </button>
                </div>
            </div>
        </div>
    );
}
