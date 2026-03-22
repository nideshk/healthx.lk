"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "@/components/atom/Modal/Modal";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { useLocale } from "next-intl";
import {
    Info, DollarSign, Scale, User, Stethoscope, Laptop,
    Smartphone, Clock, ShieldAlert, Users, CheckCircle,
    Frown, CreditCard, Flag, AlertTriangle, Send,
    RotateCw, CloudLightning, AlertOctagon, FileText,
    Baby, Lock, BookOpen, Edit, ChevronRight, Mail
} from "lucide-react";

interface RefundModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose }) => {
    const locale = useLocale();
    const isSi = locale === "si";
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [markdownContent, setMarkdownContent] = useState<string>("");

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch(isSi ? '/content/refund-si.md' : '/content/refund-en.md');
                const text = await response.text();
                setMarkdownContent(text);
            } catch (error) {
                console.error("Failed to load refund policy:", error);
            }
        };
        fetchContent();
    }, [isSi]);

    // Track scroll progress for "Accept" logic
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            setScrolledToEnd(true);
        }
    };



    const sections = [
        { id: "intro", label: isSi ? "හැඳින්වීම" : "Introduction", icon: Info },
        { id: "scope", label: isSi ? "I. විෂය පථය සහ කාර්යභාරය" : "I. Scope & Role", icon: Scale },
        { id: "pricing", label: isSi ? "II. මිලකරණය සහ ගාස්තු" : "II. Pricing & Fees", icon: DollarSign },
        { id: "general", label: isSi ? "III. සාමාන්‍ය ප්‍රතිපත්ති" : "III. General Principles", icon: BookOpen },
        { id: "patient-cancelled", label: isSi ? "IV. රෝගියාගේ අවලංගු කිරීම්" : "IV. Patient Cancellations", icon: User },
        { id: "clinician-cancelled", label: isSi ? "V. වෛද්‍යවරයාගේ අවලංගු කිරීම්" : "V. Clinician Cancellations", icon: Stethoscope },
        { id: "platform-failures", label: isSi ? "VI. වේදිකාවේ දෝෂ" : "VI. Platform Failures", icon: Laptop },
        { id: "patient-issues", label: isSi ? "VII. රෝගියාගේ තාක්ෂණික ගැටලු" : "VII. Patient Tech Issues", icon: Smartphone },
        { id: "late", label: isSi ? "VIII. ප්‍රමාද වී පැමිණීම්" : "VIII. Late Arrivals", icon: Clock },
        { id: "conduct", label: isSi ? "IX. නුසුදුසු හැසිරීම්" : "IX. Inappropriate Conduct", icon: ShieldAlert },
        { id: "attendees", label: isSi ? "X. අමතර සහභාගිවන්නන්" : "X. Additional Attendees", icon: Users },
        { id: "completion", label: isSi ? "XI. උපදේශනය සම්පූර්ණ කිරීම" : "XI. Consultation Completion", icon: CheckCircle },
        { id: "dissatisfaction", label: isSi ? "XII. සායනික අතෘප්තිය" : "XII. Clinical Dissatisfaction", icon: Frown },
        { id: "payments", label: isSi ? "XIII. ගෙවීම් ගැටලු" : "XIII. Payment Issues", icon: CreditCard },
        { id: "commencement", label: isSi ? "XIV. උපදේශනය ආරම්භ කිරීම" : "XIV. Consultation Commencement", icon: Flag },
        { id: "emergency", label: isSi ? "XV. හදිසි අවස්ථා" : "XV. Emergency Situations", icon: AlertTriangle },
        { id: "requests", label: isSi ? "XVI. මුදල් ආපසු ඉල්ලීම්" : "XVI. Refund Requests", icon: Send },
        { id: "processing", label: isSi ? "XVII. මුදල් ආපසු සැකසීම" : "XVII. Refund Processing", icon: RotateCw },
        { id: "unforeseeable", label: isSi ? "XVIII. අනපේක්ෂිත සිදුවීම්" : "XVIII. Unforeseeable Events", icon: CloudLightning },
        { id: "fraud", label: isSi ? "XIX. වංචා වැළැක්වීම" : "XIX. Fraud Prevention", icon: AlertOctagon },
        { id: "records", label: isSi ? "XX. වාර්තා තබා ගැනීම" : "XX. Record Keeping", icon: FileText },
        { id: "minors", label: isSi ? "XXI. බාල වයස්කරුවන් සහ භාරකරුවන්" : "XXI. Minors & Guardians", icon: Baby },
        { id: "transfer", label: isSi ? "XXII. පැවරිය නොහැකි බව" : "XXII. Non-Transferability", icon: Lock },
        { id: "law", label: isSi ? "XXIII. පාලක නීතිය" : "XXIII. Governing Law", icon: Scale },
        { id: "amendments", label: isSi ? "XXIV. සංශෝධන" : "XXIV. Amendments", icon: Edit },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isSi ? "මුදල් ආපසු ගෙවීමේ ප්‍රතිපත්තිය" : "Refund Policy"}
            maxHeight="92vh"
            width="5xl"
        >
            <div className="flex flex-col md:flex-row gap-10 h-full max-h-[78vh]">
                {/* 1. Interactive Sidebar */}
                <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-6 overflow-y-auto custom-scrollbar pb-6">
                    <p className="uppercase text-[11px] tracking-[0.2em] font-black text-slate-400 mb-6 sticky top-0 bg-white dark:bg-slate-900 py-2">
                        {isSi ? "ප්‍රතිපත්ති සංචාලනය" : "Policy Navigation"}
                    </p>
                    <nav className="space-y-0.5">
                        {sections.map((item) => (
                            <button
                                key={item.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    const element = document.getElementById(item.id);
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="w-full flex items-center justify-between group text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 px-3 py-2.5 rounded-lg transition-all text-left"
                            >
                                <span className="flex items-center gap-2">
                                    {item.icon && <item.icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />}
                                    {item.label}
                                </span>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                            </button>
                        ))}
                    </nav>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-900 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-700">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">
                                {isSi ? "පැහැදිලි කිරීමක් අවශ්‍යද?" : "Need Clarity?"}
                            </p>
                            <a href="mailto:support@squarecoin.com.au" className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline group">
                                <Mail className="w-3.5 h-3.5 group-hover:animate-bounce" /> support@squarecoin.com.au
                            </a>
                        </div>
                    </div>
                </aside>

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
                                {isSi ? "බලාත්මක වන දිනය: 2026 මාර්තු 4" : "Effective Date: March 4, 2026"}
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6 tracking-tighter">
                                {isSi ? "Clinecxa මුදල් ආපසු ගෙවීමේ ප්‍රතිපත්තිය" : "CLINECXA REFUND POLICY"}
                            </h1>
                            <div className="h-1.5 w-20 bg-blue-600 rounded-full mb-6"></div>
                        </header>

                        <div className="space-y-12">
                            {isSi && (
                                <div className="p-8 mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-slate-700 dark:text-slate-200 font-bold italic">සම්පූර්ණ සිංහල පරිවර්තනය සඳහා කරුණාකර අපගේ සහාය කණ්ඩායම අමතන්න: support@squarecoin.com.au. මෙහි පහතින් ඉංග්‍රීසි භාෂාවෙන් ප්‍රතිපත්තිය ගෙනහැර දක්වා ඇත.</p>
                                </div>
                            )}

                            <ReactMarkdown
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                    h2: ({ node, id, children, ...props }: any) => {
                                        const headingId = id || node?.properties?.id || props.id;
                                        const sectionInfo = sections.find(s => s.id === headingId);
                                        const Icon = sectionInfo?.icon;
                                        return (
                                            <div id={headingId} className="group flex items-center gap-3 mt-12 mb-4 sticky top-0 bg-white dark:bg-slate-900 py-3 z-10 md:relative md:bg-transparent transition-all duration-300">
                                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
                                                    {Icon && <Icon className="w-5 h-5 text-blue-600 dark:text-inherit" />}
                                                </div>
                                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {children}
                                                </h2>
                                            </div>
                                        );
                                    },
                                    p: ({ node, children, ...props }: any) => {
                                        // Some text has the translation notice exactly, we skip styling or just style as normal
                                        return (
                                            <div className="pl-0 md:pl-14 mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
                                                {children}
                                            </div>
                                        );
                                    }
                                }}
                            >
                                {markdownContent}
                            </ReactMarkdown>

                       
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default RefundModal;
