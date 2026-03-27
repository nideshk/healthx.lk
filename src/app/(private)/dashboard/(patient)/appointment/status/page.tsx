"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Calendar, Link as LinkIcon } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import Link from "next/link";

export default function PaymentStatusPage() {
    const searchParams = useSearchParams();
    const appointmentId = searchParams.get("appointmentId");
    const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
    const router = useRouter();

    useEffect(() => {
        if (!appointmentId) {
            router.push("/dashboard/appointment");
            return;
        }

        const checkStatus = async () => {
            try {
                const res = await authFetch(`/api/booking/check-status?appointmentId=${appointmentId}`);
                if (!res.ok) throw new Error("Failed to check status");
                const data = await res.json();

                if (data.status === 'confirmed' && data.payment_status === 'paid') {
                    setStatus("success");
                } else if (data.status === 'payment_failed' || data.payment_status === 'failed') {
                    setStatus("failed");
                } else {
                    setStatus("pending");
                    // Poll again in 3 seconds
                    setTimeout(checkStatus, 3000);
                }
            } catch (err) {
                console.error("Status check error:", err);
                setStatus("failed");
            }
        };

        checkStatus();
    }, [appointmentId]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center animate-in fade-in zoom-in duration-500">
                {status === "loading" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                            <Loader2 size={40} className="text-blue-600 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Checking payment status...</h1>
                        <p className="text-slate-500">Please wait while we verify your transaction.</p>
                    </div>
                )}

                {status === "pending" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
                            <Loader2 size={40} className="text-amber-600 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Payment pending</h1>
                        <p className="text-slate-500">We are waiting for confirmation from WebXPay. This might take a few seconds.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={40} className="text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
                        <p className="text-slate-500">Your appointment has been successfully booked and confirmed.</p>

                        <div className="w-full space-y-3 mt-4">
                            <Link
                                href={`/dashboard/appointment/${appointmentId}`}
                                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                <Calendar size={18} />
                                View Appointment
                            </Link>
                            <Link
                                href="/dashboard/appointment"
                                className="flex items-center justify-center gap-2 w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Back to All Appointments
                            </Link>
                        </div>
                    </div>
                )}

                {status === "failed" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                            <XCircle size={40} className="text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Payment Failed</h1>
                        <p className="text-slate-500">Something went wrong with your payment. Please try again or contact support.</p>

                        <div className="w-full space-y-3 mt-4">
                            <Link
                                href="/dashboard/appointment"
                                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                Try Again
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
