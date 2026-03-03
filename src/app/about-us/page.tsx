"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Stethoscope, Users, Linkedin } from "lucide-react";

export default function AboutUs() {
    const t = useTranslations("about");

    // Define commitment keys to map through
    const commitmentKeys = ["trust", "quality", "equality"] as const;

    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
            {/* Hero Section: The Story */}
            <section className="py-20 px-4 max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">
                        {t("hero.badge")}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold mt-4 text-slate-900 leading-tight">
                        {t("hero.title")}
                    </h1>
                </div>

                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 leading-relaxed">
                    <h2 className="text-2xl font-bold mb-6 text-blue-900">{t("story.title")}</h2>
                    <div className="space-y-4 text-slate-700">
                        <p>{t("story.para1")}</p>
                        <p>{t("story.para2")}</p>
                        <p>{t("story.para3")}</p>
                        <p>{t("story.para4")}</p>
                        <p>{t("story.para5")}</p>
                        <p>{t("story.para6")}</p>
                    </div>
                </div>
            </section>

            {/* Vision Banner */}
            <section className="bg-blue-900 py-16 px-6 text-center text-white">
                <div className="max-w-3xl mx-auto">
                    <p className="text-blue-300 font-medium uppercase tracking-widest text-sm mb-4">
                        {t("vision.label")}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-light italic leading-snug">
                        "{t("vision.text")}"
                    </h2>
                </div>
            </section>

            {/* Core Commitments */}
            <section className="py-20 px-4 max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">
                    {t("commitments.heading")}
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {commitmentKeys.map((key) => (
                        <div key={key} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="mb-4">
                                {key === "trust" && <ShieldCheck className="w-8 h-8 text-blue-600" />}
                                {key === "quality" && <Stethoscope className="w-8 h-8 text-blue-600" />}
                                {key === "equality" && <Users className="w-8 h-8 text-blue-600" />}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{t(`commitments.${key}.title`)}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {t(`commitments.${key}.description`)}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Founder's Note */}
            <section className="py-20 bg-slate-100 px-4">
                <div className="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row border border-slate-200">
                    <div className="md:w-1/3 bg-blue-700 p-10 flex flex-col justify-center items-center text-white text-center">
                        <div className="w-24 h-24 bg-blue-500 rounded-full mb-4 flex items-center justify-center text-3xl font-bold shadow-inner">
                            NK
                        </div>
                        <h3 className="text-lg font-bold">Nidesh Kulatunga</h3>
                        <p className="text-blue-200 text-xs">{t("founder.role")}</p>
                        <a
                            href="https://www.linkedin.com/in/nidesh-kulatunga/"
                            target="_blank"
                            className="mt-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                        >
                            <Linkedin className="w-5 h-5" />
                        </a>
                    </div>
                    <div className="md:w-2/3 p-8 md:p-12">
                        <h2 className="text-2xl font-bold mb-6 text-slate-900">{t("founder.noteTitle")}</h2>
                        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                            <p>{t("founder.greeting1")}</p>
                            <p>{t("founder.greeting2")}</p>
                            <p>{t("founder.para1")}</p>
                            <p>{t("founder.para2")}</p>
                            <p>{t("founder.para3")}</p>
                            <p>{t("founder.para4")}</p>
                            <p>{t("founder.para5")}</p>
                            <div className="pt-4">
                                <p className="font-bold text-slate-900 italic">
                                    ~ {t("founder.signoff")}
                                </p>
                                <a
                                    href={t("founder.linkedin")}
                                    className="text-blue-600 hover:underline text-xs mt-2 block"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    (Reach out to me: {t("founder.linkedin")})
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}