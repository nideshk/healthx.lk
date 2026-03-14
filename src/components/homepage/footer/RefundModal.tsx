"use client";

import React, { useState, useRef } from "react";
import Modal from "@/components/atom/Modal/Modal";
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
        { id: "intro", label: "Introduction", icon: Info },
        { id: "scope", label: "I. Scope & Role", icon: Scale },
        { id: "pricing", label: "II. Pricing & Fees", icon: DollarSign },
        { id: "general", label: "III. General Principles", icon: BookOpen },
        { id: "patient-cancelled", label: "IV. Patient Cancellations", icon: User },
        { id: "clinician-cancelled", label: "V. Clinician Cancellations", icon: Stethoscope },
        { id: "platform-failures", label: "VI. Platform Failures", icon: Laptop },
        { id: "patient-issues", label: "VII. Patient Tech Issues", icon: Smartphone },
        { id: "late", label: "VIII. Late Arrivals", icon: Clock },
        { id: "conduct", label: "IX. Inappropriate Conduct", icon: ShieldAlert },
        { id: "attendees", label: "X. Additional Attendees", icon: Users },
        { id: "completion", label: "XI. Consultation Completion", icon: CheckCircle },
        { id: "dissatisfaction", label: "XII. Clinical Dissatisfaction", icon: Frown },
        { id: "payments", label: "XIII. Payment Issues", icon: CreditCard },
        { id: "commencement", label: "XIV. Consultation Commencement", icon: Flag },
        { id: "emergency", label: "XV. Emergency Situations", icon: AlertTriangle },
        { id: "requests", label: "XVI. Refund Requests", icon: Send },
        { id: "processing", label: "XVII. Refund Processing", icon: RotateCw },
        { id: "unforeseeable", label: "XVIII. Unforeseeable Events", icon: CloudLightning },
        { id: "fraud", label: "XIX. Fraud Prevention", icon: AlertOctagon },
        { id: "records", label: "XX. Record Keeping", icon: FileText },
        { id: "minors", label: "XXI. Minors & Guardians", icon: Baby },
        { id: "transfer", label: "XXII. Non-Transferability", icon: Lock },
        { id: "law", label: "XXIII. Governing Law", icon: Scale },
        { id: "amendments", label: "XXIV. Amendments", icon: Edit },
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
                                Effective Date: March 4, 2026
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

                            <PolicySection id="intro" title="INTRODUCTION" icon={Info}>
                                <p>1. This Refund Policy (“Policy”) pertaining to the operation and dealings of Clinecxa, is effective and in force as of 4th March 2026 (“Effective Date”).</p>
                                <p>2. Clinecxa is a telehealth and patient health information management platform owned and operated by Square Coin Pty Ltd (“Square Coin Australia”), a company duly registered and incorporated under the laws of Australia.</p>
                                <p>3. Square Coin Lanka (Pvt) Ltd. (“Square Coin Lanka”), a company duly registered and incorporated under the laws of the Democratic Socialist Republic of Sri Lanka, manages the operation of Clinecxa in Sri Lanka. Any reference to Clinecxa’s responsibilities and/or liabilities herein shall pertain solely to Square Coin Lanka, and not Square Coin Australia.</p>
                                <p>4. This Policy sets out when and how refunds may be granted for telehealth consultations booked through Clinecxa. This Policy must be read together with the Clinecxa Terms and Conditions, Consent Policy, and Privacy Policy.</p>
                                <p>5. Where this Policy contains more specific refund rules, this Policy shall apply for refund decisions.</p>
                                <p>6. In the event of any inconsistency between this Policy and the Clinecxa Terms and Conditions, Consent Policy, and Privacy Policy, this Policy shall prevail to the extent of the inconsistency.</p>
                                <p>7. In the event of any inconsistency between the English language version of the aforementioned terms and conditions and policies and those of other languages, the English language version shall prevail to the extent of the inconsistency.</p>
                            </PolicySection>

                            <PolicySection id="scope" title="I. SCOPE, PLATFORM ROLE, AND SERVICE CONTRACT" icon={Scale}>
                                <p>8. Clinecxa provides technology and administrative facilitation only. Medical services are provided by independent, licensed healthcare practitioners and not employees, agents, or representatives of Clinecxa.</p>
                                <p>9. The contract for clinical services is between the patient/user and the treating clinician, with Clinecxa acting as a platform facilitator for booking, payments, and secure access.</p>
                                <p>10. Refund assessment is a shared process between Clinecxa and the clinician depending on the nature of the issue.</p>
                                <p>11. Refund cap: Any approved refund is capped at the maximum amount actually paid by the user for the specific consultation in question.</p>
                            </PolicySection>

                            <PolicySection id="pricing" title="II. PRICING TRANSPARENCY AND FEES" icon={DollarSign}>
                                <p>12. Consultation fees are set by individual clinicians and may be changed by clinicians from time to time without any prior notice.</p>
                                <p>13. Prices may vary based on consultation type, consultation duration, and the number of attendees attending the consultation.</p>
                                <p>14. Additional attendee fee: An additional fee of LKR 500 per additional attendee may apply to support the technology required to enable multi-attendee consultations.</p>
                                <p>15. All applicable fees are displayed prior to booking confirmation and the charging of any fee. Users are solely responsible for confirmation of the accuracy of all booking details prior to the making of the booking and payment.</p>
                                <p>16. Primary currency used in the platform is Sri Lankan Rupees (LKR). A currency conversion tool may be available for convenience.</p>
                                <p>17. Taxes or processing charges may apply in the future depending on business growth or applicable laws and regulations.</p>
                            </PolicySection>

                            <PolicySection id="general" title="III. GENERAL REFUND PRINCIPLES" icon={BookOpen}>
                                <p>18. Refunds are not automatic and are subject to verification checks, confirmation where required, system logs, and applicable deductions described in this Policy.</p>
                                <p>19. Refunds are processed only back to the original payment method. No cash refunds will be provided.</p>
                                <p>20. Clinecxa reserves the right to refuse or reverse a refund where fraud, abuse, or misuse is reasonably suspected.</p>
                            </PolicySection>

                            <PolicySection id="patient-cancelled" title="IV. PATIENT-INITIATED CANCELLATIONS (SRI LANKA STANDARD TIME)" icon={User}>
                                <p>21. Cancellation windows are ascertained on the basis of Sri Lanka Standard Time (SLST).</p>
                                <p>22. For full refund eligibility, cancellation must occur at least 24 hours prior to the scheduled appointment time.</p>
                                <p>23. Subject to the clauses below, for partial refund eligibility i.e., to receive upto 50% of the total amount paid, cancellation must occur within 24 hours of the scheduled appointment time.</p>
                                <p>24. No refund shall be available if cancellation occurs within 5 hours of the appointment time.</p>
                                <p>25. No refund shall be available in the event of non-attendance (“no-show”).</p>
                            </PolicySection>

                            <PolicySection id="clinician-cancelled" title="V. CLINICIAN-INITIATED CANCELLATIONS" icon={Stethoscope}>
                                <p>26. If a clinician cancels before the appointment, the patient may receive a full refund or the option of rescheduling the appointment.</p>
                                <p>27. If a clinician fails to attend, the patient may receive a full refund after confirmation by Clinecxa.</p>
                                <p>28. If the clinician is over 15 minutes late to the scheduled appointment, the patient may either reschedule or opt for a full refund.</p>
                                <p>29. In the event of any technical difficulties arising due to default of the Clinician’s equipment and/or network connectivity, the patient/user shall be contacted for a rescheduling of the appointment to a date within the following 14 days, failing which the patient/user shall be granted a full refund.</p>
                                <p>30. If the clinician cancels or terminates an appointment due to patient misconduct, no refund shall be provided.</p>
                            </PolicySection>

                            <PolicySection id="platform-failures" title="VI. PLATFORM TECHNICAL FAILURES" icon={Laptop}>
                                <p>31. A platform fault occurs when the Clinecxa system cannot be accessed due to platform technical failure.</p>
                                <p>32. Confirmed outages may be verified using Clinecxa incident logs, internal monitoring systems, or third-party provider status pages.</p>
                                <p>33. Confirmed platform faults may result in a reschedule or full refund.</p>
                                <p>34. Island-wide network outages or verified third-party service outages may also qualify for rescheduling or refund.</p>
                                <p>35. Payment failures where no payment is completed shall not qualify for a refund.</p>
                                <p>36. Video platform performance depends on the user’s network, device capability, and granted permission.</p>
                                <p>37. Technical issues must be reported within 90 minutes of occurrence.</p>
                            </PolicySection>

                            <PolicySection id="patient-issues" title="VII. PATIENT TECHNICAL ISSUES" icon={Smartphone}>
                                <p>38. Subject to the above clauses, if the patient’s internet, device, microphone, or camera fails, refunds will not be granted.</p>
                                <p>39. The platform may attempt reconnection if the user remains present in the consultation interface.</p>
                                <p>40. In limited circumstances and at clinician discretion, a refund may be approved; however, a non-refundable platform charge of LKR 250 will apply.</p>
                            </PolicySection>

                            <PolicySection id="late" title="VIII. LATE ARRIVALS" icon={Clock}>
                                <p>41. Patients must join the consultation during the scheduled appointment time.</p>
                                <p>42. If the patient joins late, but the clinician remained available for the scheduled slot, no refund applies.</p>
                                <p>43. Subject to clause 26 above, in the event a clinician arrives late, and is unable to provide an appropriate consultation with the remaining time, the clinician may, either at the patient/user’s request or of his/her own volition, decide to reschedule or approve a partial or full refund.</p>
                            </PolicySection>

                            <PolicySection id="conduct" title="IX. INAPPROPRIATE CONDUCT" icon={ShieldAlert}>
                                <p>44. Clinecxa maintains zero tolerance for abuse, harassment, or inappropriate conduct.</p>
                                <p>45. Clinicians may terminate sessions where misconduct occurs.</p>
                            </PolicySection>

                            <PolicySection id="attendees" title="X. ADDITIONAL ATTENDEES" icon={Users}>
                                <p>46. Additional attendee fees are non-refundable.</p>
                                <p>47. Undisclosed attendees may incur a penalty for a service charge of up to LKR 1,500.</p>
                                <p>48. Repeated breaches may result in suspension or banning from the platform.</p>
                            </PolicySection>

                            <PolicySection id="completion" title="XI. CONSULTATION COMPLETION" icon={CheckCircle}>
                                <p>49. If a patient terminates the consultation prematurely, no refund shall be granted.</p>
                                <p>50. In the event a consultation runs for a shorter duration than that of the standard booked appointment, a refund shall not be available.</p>
                            </PolicySection>

                            <PolicySection id="dissatisfaction" title="XII. CLINICAL DISSATISFACTION" icon={Frown}>
                                <p>51. Refunds shall not be granted for disagreements with medical advice, diagnosis outcomes, prescription results, or dissatisfaction with clinical outcomes.</p>
                                <p>52. Genuine concerns regarding clinician conduct may be reviewed internally by Clinecxa, upon suitable notification of the same.</p>
                            </PolicySection>

                            <PolicySection id="payments" title="XIII. PAYMENT ISSUES AND CHARGEBACKS" icon={CreditCard}>
                                <p>53. If a user believes they were double-charged, they must provide proof of the charge so the platform can raise the issue with the payment gateway.</p>
                                <p>54. Users must contact Clinecxa before initiating a chargeback.</p>
                                <p>55. Accounts may be temporarily restricted during chargeback investigations.</p>
                            </PolicySection>

                            <PolicySection id="commencement" title="XIV. CONSULTATION COMMENCEMENT" icon={Flag}>
                                <p>56. A consultation is deemed to commence when the clinician joins the session at or following the appointment start time.</p>
                                <p>57. Meeting access is typically provided via email immediately after payment confirmation. Users must check spam or junk folders.</p>
                            </PolicySection>

                            <PolicySection id="emergency" title="XV. EMERGENCY SITUATIONS" icon={AlertTriangle}>
                                <p>58. Telehealth services are not intended as a replacement for emergency medical care.</p>
                                <p>59. During such emergencies, users must contact appropriate emergency services.</p>
                                <p>60. If booked appointment is termindated for the sole reason that the patient requires emergency care at a physical hospital or clinic with telehealth being unsuitable, a refund may not be granted.</p>
                            </PolicySection>

                            <PolicySection id="requests" title="XVI. REFUND REQUESTS" icon={Send}>
                                <p>61. Refund requests must be submitted through the Contact page on the platform.</p>
                                <p>62. Requests must be lodged within 48 hours of the appointment.</p>
                                <p>63. Evidence such as screenshots or error messages may be required.</p>
                            </PolicySection>

                            <PolicySection id="processing" title="XVII. REFUND PROCESSING" icon={RotateCw}>
                                <p>64. Processing times may take between 7 and 20 business days.</p>
                                <p>65. Clinecxa relies on third party contractors for payment processing, such as WebXPay. Any delays on the part of such third party contractors and banks are not attributable to Clinecxa.</p>
                            </PolicySection>

                            <PolicySection id="unforeseeable" title="XVIII. UNFORESEEABLE EVENTS" icon={CloudLightning}>
                                <p>66. In cases of confirmed internet outages, civil unrest, or natural disasters preventing consultations, refunds may be granted.</p>
                                <p>67. Evidence may be required to confirm the impact of such events.</p>
                            </PolicySection>

                            <PolicySection id="fraud" title="XIX. FRAUD AND ABUSE PREVENTION" icon={AlertOctagon}>
                                <p>68. Clinecxa may refuse refunds where abuse or fraud is suspected.</p>
                                <p>69. Accounts may be suspended for repeated refund abuse.</p>
                            </PolicySection>

                            <PolicySection id="records" title="XX. RECORD KEEPING" icon={FileText}>
                                <p>70. Consultation logs, login timestamps, and connection data may be used to assess disputes.</p>
                            </PolicySection>

                            <PolicySection id="minors" title="XXI. MINORS AND GUARDIANS" icon={Baby}>
                                <p>71. Guardian cancellations and refund requests follow the same cancellation windows.</p>
                                <p>72. The guardian is responsible for submitting the refund request.</p>
                            </PolicySection>

                            <PolicySection id="transfer" title="XXII. NON-TRANSFERABILITY" icon={Lock}>
                                <p>73. Appointments cannot be transferred to another person.</p>
                                <p>74. Each appointment is limited to one patient.</p>
                            </PolicySection>

                            <PolicySection id="law" title="XXIII. GOVERNING LAW" icon={Scale}>
                                <p>75. This Policy is governed by the laws of the Democratic Socialist Republic of Sri Lanka.</p>
                            </PolicySection>

                            <PolicySection id="amendments" title="XXIV. AMENDMENTS" icon={Edit}>
                                <p>76. Clinecxa reserves the right to update this Refund Policy.</p>
                            </PolicySection>

                            {/* Final Consent Footer */}
                            <div className={`mt-16 p-10 rounded-[2.5rem] transition-all duration-700 border-4 ${scrolledToEnd ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-300/40 translate-y-0' : 'bg-slate-50 dark:bg-slate-800 border-dashed border-slate-200 dark:border-slate-700 translate-y-2'}`}>
                                <h2 className="text-3xl font-black mb-4">Agreement</h2>
                                <p className="text-base opacity-95 mb-8 leading-relaxed">
                                    To proceed, please confirm you have reviewed the complete Refund Policy above.
                                </p>
                                <button
                                    onClick={onClose}
                                    className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 ${scrolledToEnd ? 'bg-white text-blue-600 hover:shadow-xl hover:-translate-y-1' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'}`}
                                    disabled={!scrolledToEnd}
                                >
                                    {scrolledToEnd ? "I AGREE & ACCEPT" : "SCROLL TO READ FULL POLICY"}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default RefundModal;
