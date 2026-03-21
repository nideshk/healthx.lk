"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "@/components/atom/Modal/Modal";
import { useLocale } from "next-intl";
import { ShieldCheck, Lock, Globe, Clock, ChevronRight, Mail, FileText, UserCheck, AlertTriangle, Scale, RefreshCw, Smartphone, HeartPulse, UserPlus, Info } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
    const locale = useLocale();
    const isSi = locale === "si";
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const [markdownContent, setMarkdownContent] = useState<string>("");
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch(isSi ? '/content/privacy-si.md' : '/content/privacy-en.md');
                const text = await response.text();
                setMarkdownContent(text);
            } catch (error) {
                console.error("Failed to load privacy policy:", error);
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
        { id: "intro", label: isSi ? "I. හැඳින්වීම" : "I. Introduction", icon: Info },
        { id: "data", label: isSi ? "II. රැස් කරන දත්ත" : "II. Data Collected", icon: ShieldCheck },
        { id: "basis", label: isSi ? "III. දත්ත සැකසීම සඳහා නීත්‍යානුකූල පදනම්" : "III. Lawful Bases for Processing", icon: Scale },
        { id: "disclosure", label: isSi ? "IV. දත්ත භාවිතය සහ හෙළිදරව් කිරීම" : "IV. Use and Disclosure of Data", icon: UserCheck },
        { id: "minors", label: isSi ? "V. බාල වයස්කරුවන්" : "V. Minors", icon: Globe },
        { id: "retention", label: isSi ? "VI. දත්ත රඳවා තබා ගැනීම" : "VI. Data Retention", icon: Clock },
        { id: "transfers", label: isSi ? "VII. ජාත්‍යන්තර දත්ත හුවමාරුව" : "VII. International Data Transfers", icon: Globe },
        { id: "subprocessors", label: isSi ? "VIII. අනු-සැකසුම්කරුවන් සහ සේවා සපයන්නන්" : "VIII. Sub-processors and Service Providers", icon: Lock },
        { id: "ai", label: isSi ? "IX. ස්වයංක්‍රීය සැකසුම් සහ කෘතිම බුද්ධිය" : "IX. Automated Processing and AI", icon: RefreshCw },
        { id: "clinician", label: isSi ? "X. වෛද්‍යවරයාගේ වගකීම්" : "X. Clinician Obligations", icon: FileText },
        { id: "security", label: isSi ? "XI. ආරක්ෂාව, උපස්ථ සහ යථා තත්වයට පත් කිරීම" : "XI. Security, Backups, and Recovery", icon: Lock },
        { id: "breach", label: isSi ? "XII. දත්ත කඩකිරීම් සහ පැමිණිලි" : "XII. Data Breaches and Complaints", icon: AlertTriangle },
        { id: "responsibility", label: isSi ? "XIII. රෝගියාගේ වගකීම්" : "XIII. Patient Responsibilities", icon: UserCheck },
        { id: "changes", label: isSi ? "XIV. මෙම ප්‍රතිපත්තියේ වෙනස්කම්" : "XIV. Changes to this Policy", icon: RefreshCw },
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
                                {isSi ? "නවතම යාවත්කාලීන කිරීම: 2026 ජනවාරි 28" : "Latest Update: Jan 28, 2026"}
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6 tracking-tighter">
                                {isSi ? "Clinecxa පුද්ගලිකත්ව ප්‍රතිපත්තිය" : "CLINECXA PRIVACY POLICY"}
                            </h1>
                            <div className="h-1.5 w-20 bg-blue-600 rounded-full mb-6"></div>
                        </header>

                        <div className="space-y-12">
                            {markdownContent ? (
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
                                            return (
                                                <div className="pl-0 md:pl-14 mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
                                                    {children}
                                                </div>
                                            );
                                        },
                                        ul: ({ node, children, ...props }: any) => (
                                            <ul className="pl-8 md:pl-20 py-2 list-disc mb-4 space-y-2 text-slate-600 dark:text-slate-300 font-medium text-[15px]">
                                                {children}
                                            </ul>
                                        ),
                                        strong: ({ node, children, ...props }: any) => (
                                            <strong className="font-bold text-slate-900 dark:text-slate-100">
                                                {children}
                                            </strong>
                                        )
                                    }}
                                >
                                    {markdownContent}
                                </ReactMarkdown>
                            ) : (
                                <div className="animate-pulse space-y-8">
                                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                                    <div className="space-y-3">
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-full"></div>
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-5/6"></div>
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-4/6"></div>
                                    </div>
                                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mt-8"></div>
                                    <div className="space-y-3">
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-full"></div>
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-full"></div>
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-3/4"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Final Consent Footer */}
                        <div className={`mt-16 p-10 rounded-[2.5rem] transition-all duration-700 border-4 ${scrolledToEnd ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-300/40 translate-y-0' : 'bg-slate-50 dark:bg-slate-800 border-dashed border-slate-200 dark:border-slate-700 translate-y-2'}`}>
                            <h2 className="text-3xl font-black mb-4">
                                {isSi ? "ගිවිසුම" : "Agreement"}
                            </h2>
                            <p className="text-base opacity-95 mb-8 leading-relaxed">
                                {isSi ? "ඉදිරියට යාමට, ඔබ ඉහත පුද්ගලිකත්ව ප්‍රතිපත්තිය සම්පූර්ණයෙන් කියවා ඇති බව කරුණාකර තහවුරු කරන්න." : "To proceed, please confirm you have reviewed the complete Privacy Policy above."}
                            </p>
                            <button
                                onClick={onClose}
                                className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 ${scrolledToEnd ? 'bg-white text-blue-600 hover:shadow-xl hover:-translate-y-1' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'}`}
                                disabled={!scrolledToEnd}
                            >
                                {scrolledToEnd 
                                    ? (isSi ? "මම එකඟ වෙමි" : "I AGREE & ACCEPT") 
                                    : (isSi ? "සම්පූර්ණ ප්‍රතිපත්තිය කියවීමට පහළට යන්න" : "SCROLL TO READ FULL POLICY")
                                }
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PrivacyModal;