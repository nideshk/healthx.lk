"use client";

import React, { useState, useRef } from "react";
import Modal from "@/components/atom/Modal/Modal";
import { useLocale } from "next-intl";
import { ShieldCheck, Lock, Globe, Clock, ChevronRight, Mail, FileText, UserCheck, AlertTriangle, Scale, RefreshCw, Smartphone, HeartPulse, UserPlus, Info } from "lucide-react";

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
    const locale = useLocale();
    const isSi = locale === "si";
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Track scroll progress for "Accept" logic
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            setScrolledToEnd(true);
        }
    };

    const PolicySection = ({ title, icon: Icon, children, id }: any) => (
        <section id={id} className="group mb-12 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white dark:bg-slate-900 py-3 z-10 md:relative md:bg-transparent">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
                    {Icon && <Icon className="w-5 h-5 text-blue-600 dark:text-inherit" />}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                    {title}
                </h2>
            </div>
            <div className="pl-0 md:pl-14 space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
                {children}
            </div>
        </section>
    );

    const sections = [
        { id: "intro", label: "I. Introduction", icon: Info },
        { id: "data", label: "II. Data Collected", icon: ShieldCheck },
        { id: "basis", label: "III. Lawful Bases", icon: Scale },
        { id: "disclosure", label: "IV. Use & Disclosure", icon: UserCheck },
        { id: "minors", label: "V. Minors", icon: Globe },
        { id: "retention", label: "VI. Retention", icon: Clock },
        { id: "transfers", label: "VII. Data Transfers", icon: Globe },
        { id: "subprocessors", label: "VIII. Sub-processors", icon: Lock },
        { id: "ai", label: "IX. AI & Automation", icon: RefreshCw },
        { id: "clinician", label: "X. Clinician Duties", icon: FileText },
        { id: "security", label: "XI. Security & Backups", icon: Lock },
        { id: "breach", label: "XII. Breach & Complaints", icon: AlertTriangle },
        { id: "responsibility", label: "XIII. Patient Duties", icon: UserCheck },
        { id: "changes", label: "XIV. Changes", icon: RefreshCw },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isSi ? "පුද්ගලිකත්ව ප්‍රතිපත්තිය" : "Privacy Policy"}
            maxHeight="92vh"
            width="5xl"
        >
            <div className="flex flex-col md:flex-row gap-10 h-full max-h-[78vh]">
                {/* 1. Interactive Sidebar */}
                {!isSi && (
                    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-6 overflow-y-auto custom-scrollbar pb-6">
                        <p className="uppercase text-[11px] tracking-[0.2em] font-black text-slate-400 mb-6 sticky top-0 bg-white dark:bg-slate-900 py-2">Policy Navigation</p>
                        <nav className="space-y-0.5">
                            {sections.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className="flex items-center justify-between group text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 px-3 py-2.5 rounded-lg transition-all"
                                >
                                    <span className="flex items-center gap-2">
                                        {item.icon && <item.icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />}
                                        {item.label}
                                    </span>
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                                </a>
                            ))}
                        </nav>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-900 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-700">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Need Clarity?</p>
                                <a href="mailto:support@squarecoin.com.au" className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline group">
                                    <Mail className="w-3.5 h-3.5 group-hover:animate-bounce" /> support@squarecoin.com.au
                                </a>
                            </div>
                        </div>
                    </aside>
                )}

                {/* 2. Content Area */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto pr-2 custom-scrollbar scroll-smooth"
                >
                    <div className="max-w-3xl py-4">
                        <header className="mb-16">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-6 border border-emerald-100 dark:border-emerald-800">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Latest Update: Jan 28, 2026
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6 tracking-tighter">
                                {isSi ? "Clinecxa පුද්ගලිකත්ව ප්‍රතිපත්තිය" : "CLINECXA PRIVACY POLICY"}
                            </h1>
                            <div className="h-1.5 w-20 bg-blue-600 rounded-full mb-6"></div>
                        </header>

                        {isSi ? (
                            <div className="space-y-12">
                                <section>
                                    <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white uppercase">I. හැඳින්වීම</h2>
                                    <div className="space-y-4 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                        <p>01. Clinecxa හි ක්‍රියාකාරිත්වයට සහ ගනුදෙනුවලට අදාළ මෙම පුද්ගලිකත්ව ප්‍රතිපත්තිය 2026 ජනවාරි 28 දින සිට බලපැවැත්වේ.</p>
                                        <p>02. Clinecxa යනු ඕස්ට්‍රේලියාවේ නීති යටතේ ලියාපදිංචි Square Coin Pty Ltd ('Square Coin Australia') සමාගම සතු ටෙලිහෙල්ත් සහ සෞඛ්‍ය තොරතුරු කළමනාකරණ වේදිකාවකි.</p>
                                        <p>03. ශ්‍රී ලංකා ප්‍රජාතාන්ත්‍රික සමාජවාදී ජනරජයේ නීති යටතේ ලියාපදිංචි Square Coin Lanka (Pvt) Ltd. ('Square Coin Lanka') සමාගම, Square Coin Australia සමඟ ඇති බලපත්‍ර ගිවිසුමක් අනුව ශ්‍රී ලංකාව තුළ Clinecxa ක්‍රියාත්මක කිරීමට අවසර ලබා ඇත.</p>
                                        <p>04. 2022 අංක 9 දරන පුද්ගලික දත්ත ආරක්ෂණ පනත (PDPA) ඇතුළු අදාළ නීති යටතේ, සෑම වෛද්‍යවරයෙකුම තම රෝගීන්ගේ සෞඛ්‍ය වාර්තාවල 'දත්ත පාලකයා' (Data Controller) වේ. Clinecxa සහ එහි අනුබද්ධ ආයතන 'දත්ත සැකසුම්කරුවන්' (Data Processors) ලෙස ක්‍රියා කරයි.</p>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white uppercase">II. රැස් කරන දත්ත</h2>
                                    <div className="space-y-4 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                        <p>06. නම, උපන් දිනය, ලිපිනය සහ අනන්‍යතා තොරතුරු නිවැරදි රෝගී වාර්තා පවත්වා ගැනීම සඳහා රැස් කරනු ලැබේ.</p>
                                        <p>07. වෛද්‍ය සටහන්, රෝග විනිශ්චය, බෙහෙත් වට්ටෝරු, පරීක්ෂණ වාර්තා සහ ටෙලිහෙල්ත් සැසි විස්තර ද රැස් කරනු ලැබේ.</p>
                                        <p>10. රෝගියා සහ වෛද්‍යවරයා අතර සිදුවන වීඩියෝ හෝ ශ්‍රව්‍ය සාකච්ඡා පටිගත කරනු නොලැබේ. රෝගියාගේ සෞඛ්‍ය දත්ත වෙත ප්‍රවේශ විය හැක්කේ ප්‍රතිකාර කරන වෛද්‍යවරයාට පමණි.</p>
                                    </div>
                                </section>

                                <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-slate-700 dark:text-slate-200 font-bold italic">සම්පූර්ණ සිංහල පරිවර්තනය සඳහා කරුණාකර අපගේ සහාය කණ්ඩායම අමතන්න: support@squarecoin.com.au</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <PolicySection id="intro" title="I. INTRODUCTION" icon={Info}>
                                    <p>01. This privacy policy pertaining to the operation and dealings of Clinecxa, is effective and in force as of 28th January 2026 (‘Effective Date’).</p>
                                    <p>02. Clinecxa is a telehealth and patient health information management platform owned and operated by <strong>Square Coin Pty Ltd (‘Square Coin Australia’)</strong>, a company duly registered and incorporated under the laws of Australia.</p>
                                    <p>03. <strong>Square Coin Lanka (Pvt) Ltd. (‘Square Coin Lanka’)</strong>, a company duly registered and incorporated under the laws of the Socialist Democratic Republic of Sri Lanka, is authorized to use Clinecxa in accordance with a licensing agreement with Square Coin Australia. Square Coin Lanka manages the operation of Clinecxa in the said republic.</p>
                                    <p>04. Under applicable data protection and health information laws, including but not limited to the <strong>Personal Data Protection Act, No. 9 of 2022 (‘PDPA’)</strong>, each treating clinician is the Data Controller of their patients’ health records. Clinecxa and its associated entities act as Data Processors, providing secure digital infrastructure, access controls, and data hosting services under written agreements with such clinicians.</p>
                                    <p>05. This policy explains how personal and health information is collected, used, stored, and protected. For questions or complaints, contact the Principal Privacy and Information Officer at <strong>support@squarecoin.com.au</strong>.</p>
                                </PolicySection>

                                <PolicySection id="data" title="II. DATA COLLECTED" icon={ShieldCheck}>
                                    <p>06. Clinecxa collects personal data such as name, date of birth, address, contact details, and other identity information for the purpose of creating and maintaining accurate patient records.</p>
                                    <p>07. Clinecxa also records health data including clinical notes, diagnoses, prescriptions, investigation results, uploaded documents, and telehealth session metadata (such as session time and participants).</p>
                                    <p>08. Clinecxa may collect a person’s name, city and contact details for the purpose of marketing. However, the same shall only be collected upon the provision of consent by the relevant person. Such consent may be withdrawn at any time through the user dashboard or by contacting customer support at <strong>support@squarecoin.com.au</strong>.</p>
                                    <p>09. Data is collected from:</p>
                                    <ul className="list-disc md:list-[lower-alpha] ml-6 space-y-2 font-medium">
                                        <li>Patient registration and intake forms;</li>
                                        <li>Telehealth consultations;</li>
                                        <li>Secure document uploads;</li>
                                        <li>Referrals and care coordination; and</li>
                                        <li>Administrative and billing processes.</li>
                                    </ul>
                                    <p>10. Video and audio consultations and conversations between patients and clinicians are not recorded. Only the treating clinician and authorized clinical staff may access health data.</p>
                                    <p>11. Patients may review and update their personal data and may share their records with other platform clinicians through explicit action in their account.</p>
                                </PolicySection>

                                <PolicySection id="basis" title="III. LAWFUL BASES FOR PROCESSING" icon={Scale}>
                                    <p>12. Personal and health data is processed for the following lawful purposes:</p>
                                    <ul className="list-disc md:list-[lower-alpha] ml-6 space-y-2 font-medium">
                                        <li>Medical diagnosis, treatment, and continuity of care;</li>
                                        <li>Professional clinical documentation and record-keeping;</li>
                                        <li>Billing, insurance, and financial administration;</li>
                                        <li>Legal and regulatory compliance; and</li>
                                        <li>Quality assurance and service improvement using de-identified data.</li>
                                    </ul>
                                    <p>13. Processing is based on patient consent, performance of a healthcare service contract, compliance with legal obligations, and protection of vital interests.</p>
                                </PolicySection>

                                <PolicySection id="disclosure" title="IV. USE AND DISCLOSURE OF DATA" icon={UserCheck}>
                                    <p>14. Health data is accessible only by the treating clinician unless the patient explicitly authorizes sharing or a lawful referral is made.</p>
                                    <p>15. Platform administrators do not access health data except where strictly required for technical support, security investigations, or legal compliance. Any such access is logged and auditable.</p>
                                    <p>16. Information and data are not sold or shared with third parties for advertising and/or marketing purposes. The same may be disclosed only:</p>
                                    <ul className="list-disc md:list-[lower-alpha] ml-6 space-y-2 font-medium">
                                        <li>With patient consent;</li>
                                        <li>For care coordination;</li>
                                        <li>To contracted service providers (sub-processors); and/or</li>
                                        <li>When required by law or court order.</li>
                                    </ul>
                                    <p>17. Patients have the right to request the current list of approved sub-processors by contacting customer support at <strong>support@squarecoin.com.au</strong>.</p>
                                </PolicySection>

                                <PolicySection id="minors" title="V. MINORS" icon={Globe}>
                                    <p>18. For patients who are minors, i.e., under the age of legal medical consent, a parent or legal guardian must create the account, provide consent, and manage appointments.</p>
                                    <p>19. Telehealth consultations for minors must be attended by a parent or guardian, except where permitted by law and professional guidelines (e.g., certain mental health services).</p>
                                    <p>20. Clinecxa does not encourage unsupervised registration and use of the platform by minors.</p>
                                </PolicySection>

                                <PolicySection id="retention" title="VI. DATA RETENTION" icon={Clock}>
                                    <p>21. Data is retained for a minimum of 12 years from the date of creation, unless the patient requests deletion or unless deletion is otherwise legally required.</p>
                                    <p>22. Audit logs, access records, and system backups are retained in accordance with security and compliance requirements.</p>
                                    <p>23. Where deletion is legally permissible and required and/or necessary for operational purposes, data will be securely erased.</p>
                                </PolicySection>

                                <PolicySection id="transfers" title="VII. INTERNATIONAL DATA TRANSFERS" icon={Globe}>
                                    <p>24. Data may be processed and stored in Australia, Sri Lanka, and secure Amazon Web Services (‘AWS’) regions. Cross-border transfers are protected by contractual safeguards, encryption, and equivalent PDPA-compliant security standards.</p>
                                </PolicySection>

                                <PolicySection id="subprocessors" title="VIII. SUB-PROCESSORS AND SERVICE PROVIDERS" icon={Lock}>
                                    <p>25. Clinecxa uses vetted third-party service providers for hosting, communications, payment processing, and system security (including AWS, Supabase, and WebXPay). All sub-processors operate under strict confidentiality and data protection agreements.</p>
                                </PolicySection>

                                <PolicySection id="ai" title="IX. AUTOMATED PROCESSING AND ARTIFICIAL INTELLIGENCE" icon={RefreshCw}>
                                    <p>26. No automated medical decision-making occurs without clinician oversight. Clinical decisions are made solely by qualified healthcare professionals.</p>
                                    <p>27. If future anonymized or identifiable data is proposed for Artificial Intelligence (‘AI’) model training or research, relevant users shall be contacted for additional consent.</p>
                                </PolicySection>

                                <PolicySection id="clinician" title="X. CLINICIAN OBLIGATIONS" icon={FileText}>
                                    <p>28. All clinicians using Clinecxa are bound by applicable medical confidentiality laws and professional ethical standards. The platform enforces access controls and audit trails but does not replace clinicians’ legal and professional responsibilities. Misuse of patient data may result in removal from the platform and reporting to relevant medical councils.</p>
                                </PolicySection>

                                <PolicySection id="security" title="XI. SECURITY, BACKUPS, AND DISASTER RECOVERY" icon={Lock}>
                                    <p>29. Clinecxa implements encryption, role-based access control, activity logging, and periodic security audits. Clinical data is hosted on secure infrastructure (AWS and Supabase). Manual encrypted backups are maintained and can be restored up to the most recent 48 hours in the event of system failure.</p>
                                </PolicySection>

                                <PolicySection id="breach" title="XII. DATA BREACHES AND COMPLAINTS" icon={AlertTriangle}>
                                    <p>30. In the event of a data breach, affected users will be notified promptly, and mitigation/remediation steps will be taken.</p>
                                    <p>31. Complaints in this regard may be directed to <strong>support@squarecoin.com.au</strong>. Unresolved matters may be escalated to the Sri Lankan Data Protection Authority.</p>
                                </PolicySection>

                                <PolicySection id="responsibility" title="XIII. PATIENT RESPONSIBILITIES" icon={UserCheck}>
                                    <p>32. Patients/users are responsible for securing their devices, protecting login credentials, using private environments for consultations, and logging out after sessions.</p>
                                </PolicySection>

                                <PolicySection id="changes" title="XIV. CHANGES TO THIS POLICY" icon={RefreshCw}>
                                    <p>33. This policy may be updated periodically. Patients/users of Clinecxa will be prompted to peruse any such updated policy upon attempted use of the platform, with the choice to either accept or reject the said updated policy.</p>
                                </PolicySection>

                                {/* Final Consent Footer */}
                                <div className={`mt-16 p-10 rounded-[2.5rem] transition-all duration-700 border-4 ${scrolledToEnd ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-300/40 translate-y-0' : 'bg-slate-50 dark:bg-slate-800 border-dashed border-slate-200 dark:border-slate-700 translate-y-2'}`}>
                                    <h2 className="text-3xl font-black mb-4">Agreement</h2>
                                    <p className="text-base opacity-95 mb-8 leading-relaxed">
                                        To proceed, please confirm you have reviewed the complete Privacy Policy above.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 ${scrolledToEnd ? 'bg-white text-blue-600 hover:shadow-xl hover:-translate-y-1' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'}`}
                                        disabled={!scrolledToEnd}
                                    >
                                        {scrolledToEnd ? "I AGREE & ACCEPT" : "SCROLL TO READ FULL POLICY"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PrivacyModal;