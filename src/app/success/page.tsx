"use client";
import React from "react";
import Link from "next/link";

export default function PaymentSuccessPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-10 text-center">
                <div className="flex items-center justify-center mb-6">
                    <svg
                        className="w-20 h-20"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="12" cy="12" r="12" fill="#34D399" />
                        <path
                            d="M17 8.5l-6.5 7L7 11.5"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <h1 className="text-4xl font-extrabold text-green-600 uppercase tracking-wide">
                    THANK YOU!
                </h1>
                <p className="mt-4 text-xl font-semibold text-gray-700">
                    YOUR PAYMENT WAS SUCCESSFUL
                </p>

                <div className="mt-8">
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                        Go to dashboard
                    </Link>
                </div>
            </div>
        </main>
    );
}
