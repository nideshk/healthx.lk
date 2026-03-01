"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import {
    Mail,
    Phone as PhoneIcon,
    MessageSquare,
    ShieldCheck,
    ChevronRight,
    Send,
} from "lucide-react";

export default function ContactUs() {
    const t = useTranslations("contactUs");
    const [formData, setFormData] = useState({
        email: "",
        phone: "",
        concern: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error();

            toast.success(t("successMessage"));
            setFormData({ email: "", phone: "", concern: "" });

        } catch (err) {
            toast.error(t("errorMessage"));
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#FBFDFF] py-12 px-4 md:px-8 pb-40">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            {t("title")}
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            {t("subtitle")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm self-start">
                        <ShieldCheck className="w-4 h-4 text-teal-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {t("privacy")}
                        </span>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-50">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                        {/* Email */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <Mail className="w-4 h-4 text-teal-500" />
                                {t("emailLabel")} *
                            </label>
                            <input
                                type="email"
                                name="email"
                                placeholder={t("emailPlaceholder")}
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 bg-slate-50/50 outline-none transition-all font-medium"
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <PhoneIcon className="w-4 h-4 text-teal-500" />
                                {t("phoneLabel")}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder={t("phonePlaceholder")}
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 bg-slate-50/50 outline-none transition-all font-medium"
                            />
                        </div>

                        {/* Concern */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <MessageSquare className="w-4 h-4 text-teal-500" />
                                {t("concernLabel")} *
                            </label>
                            <textarea
                                name="concern"
                                rows={4}
                                placeholder={t("concernPlaceholder")}
                                value={formData.concern}
                                onChange={handleChange}
                                required
                                className="w-full border-2 border-slate-50 rounded-2xl p-4 text-sm focus:border-teal-500 bg-slate-50/50 outline-none transition-all font-medium resize-none"
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-10 py-4 bg-slate-900 hover:bg-teal-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {t("submitButton")}
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}