"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, ChevronDown } from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface Props {
  nextStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}

const ConsentFormStep = forwardRef(
  ({ nextStep, prevStep, updateData, bookingData }: Props, ref) => {
    const t = useTranslations("consentForm");
    const router = useRouter();
    const locale = useLocale();
    const isSi = locale === "si";

    const [privacyContent, setPrivacyContent] = useState<string>("");
    const [telehealthContent, setTelehealthContent] = useState<string>("");
    const [refundContent, setRefundContent] = useState<string>("");

    useEffect(() => {
      const fetchContent = async () => {
        try {
            const [privacyRes, telehealthRes, refundRes] = await Promise.all([
                fetch(isSi ? '/content/privacy-si.md' : '/content/privacy-en.md'),
                fetch(isSi ? '/content/telehealth-si.md' : '/content/telehealth-en.md'),
                fetch(isSi ? '/content/refund-si.md' : '/content/refund-en.md')
            ]);
            const privacyText = await privacyRes.text();
            const telehealthText = await telehealthRes.text();
            const refundText = await refundRes.text();
            setPrivacyContent(privacyText);
            setTelehealthContent(telehealthText);
            setRefundContent(refundText);
        } catch (error) {
            console.error("Failed to load markdown policies:", error);
        }
      };
      fetchContent();
    }, [isSi]);

    const [consent, setConsent] = useState({
      telehealth: bookingData?.consent?.telehealth || false,
      terms: bookingData?.consent?.terms || false,
    });

    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [telehealthRead, setTelehealthRead] = useState(false);
    const [termsRead, setTermsRead] = useState(false);
    const [refundRead, setRefundRead] = useState(false);

    const telehealthRef = useRef<HTMLDivElement>(null);
    const termsRef = useRef<HTMLDivElement>(null);
    const refundRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const checkScrollable = (ref: React.RefObject<HTMLDivElement | null>, setter: (v: boolean) => void) => {
        if (ref.current && ref.current.scrollHeight <= ref.current.clientHeight) {
          setter(true);
        }
      };
      checkScrollable(telehealthRef, setTelehealthRead);
      checkScrollable(termsRef, setTermsRead);
      checkScrollable(refundRef, setRefundRead);
    }, []);

    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!consent.telehealth || !consent.terms) {
          toast.error(t("acceptBothError"));
          return false;
        }
        return true;
      },
    }));

    const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, setter: (v: boolean) => void) => {
      if (!ref.current) return;
      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setter(true);
      }
    };

    const handleContinue = () => {
      if (consent.telehealth && consent.terms) {
        updateData({ consent });
        nextStep({ override: { consent } });
      }
    };

    return (
      <>
        {/* ================= DECLINE MODAL ================= */}
        {showDeclineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
              <div className="text-center">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("declineTitle")}
                </h3>
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                  {t("declineMessage")}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-3 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors"
                >
                  {t("exitBooking")}
                </button>
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-transform active:scale-95"
                >
                  {t("goBackReview")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MAIN INTERFACE ================= */}
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {t("title")}
              </h2>
              <p className="text-slate-500 mt-2">
                {t("subtitle")}
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  id: "telehealth",
                  title: t("telehealthTitle"),
                  ref: telehealthRef,
                  read: telehealthRead,
                  setter: setTelehealthRead,
                  checked: consent.telehealth,
                  content: "",
                  noCheckbox: false,
                },
                {
                  id: "terms",
                  title: t("termsTitle"),
                  ref: termsRef,
                  read: termsRead,
                  setter: setTermsRead,
                  checked: consent.terms,
                  content: "",
                  noCheckbox: false,
                },
                {
                  id: "refund",
                  title: isSi ? "මුදල් ආපසු ගෙවීමේ ප්‍රතිපත්තිය" : "Refund Policy",
                  ref: refundRef,
                  read: refundRead,
                  setter: setRefundRead,
                  checked: false, // Visual default since there's no checkbox toggle
                  content: "",
                  noCheckbox: true,
                },
              ].map((section) => (
                <div key={section.id} className={`group bg-white border-2 rounded-2xl transition-all duration-300 ${section.checked ? 'border-blue-500 shadow-md' : 'border-slate-200'}`}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {section.read ? <CheckCircle className="w-5 h-5 text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                        {section.title}
                      </h3>
                      {!section.read && (
                        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md animate-pulse">
                          {t("scrollToRead")}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <div
                        ref={section.ref}
                        onScroll={() => handleScroll(section.ref, section.setter)}
                        className="h-80 overflow-y-auto bg-slate-50 rounded-xl p-5 text-sm leading-relaxed text-slate-600 border border-slate-100 scroll-smooth custom-scrollbar"
                      >
                        <div className={section.id !== 'terms' && section.id !== 'telehealth' && section.id !== 'refund' ? 'whitespace-pre-wrap space-y-4' : ''}>
                          {section.id === "terms" || section.id === "telehealth" || section.id === "refund" ? (
                              (section.id === "terms" ? privacyContent : section.id === "telehealth" ? telehealthContent : refundContent) ? (
                                  <ReactMarkdown
                                      rehypePlugins={[rehypeRaw]}
                                      components={{
                                          h2: ({ node, id, children, ...props }: any) => {
                                              const headingId = id || node?.properties?.id || props.id;
                                              return (
                                                  <h2 id={headingId} className="text-[15px] font-extrabold text-slate-900 mt-6 mb-3 uppercase tracking-tight">
                                                      {children}
                                                  </h2>
                                              );
                                          },
                                          p: ({ node, children, ...props }: any) => {
                                              return (
                                                  <div className="mb-4 text-slate-600 leading-relaxed text-[13px]">
                                                      {children}
                                                  </div>
                                              );
                                          },
                                          ul: ({ node, children, ...props }: any) => (
                                              <ul className="pl-6 list-disc mb-4 space-y-1.5 text-slate-600 font-medium text-[13px]">
                                                  {children}
                                              </ul>
                                          ),
                                          strong: ({ node, children, ...props }: any) => (
                                              <strong className="font-bold text-slate-900">
                                                  {children}
                                              </strong>
                                          )
                                      }}
                                  >
                                      {section.id === "terms" ? privacyContent : section.id === "telehealth" ? telehealthContent : refundContent}
                                  </ReactMarkdown>
                              ) : (
                                  <div className="animate-pulse space-y-4">
                                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                  </div>
                              )
                          ) : (
                              section.content
                          )}
                        </div>

                      </div>

                      {!section.read && (
                        <div className="absolute bottom-2 right-4 animate-bounce pointer-events-none">
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {!section.noCheckbox && (
                        <label className={`flex items-center gap-3 mt-5 p-3 rounded-lg cursor-pointer transition-colors ${!section.read ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}>
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              disabled={!section.read}
                              checked={section.checked}
                              onChange={(e) => setConsent(p => ({ ...p, [section.id]: e.target.checked }))}
                              className="w-6 h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>
                          <span className={`text-sm font-semibold ${section.checked ? 'text-blue-700' : 'text-slate-600'}`}>
                            {t("agreeText", { section: section.title })}
                          </span>
                        </label>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ACTION FOOTER */}
            <div className="mt-10 flex flex-col sm:flex-row-reverse items-center gap-4 border-t border-slate-100 pt-8">
              {/* Primary Action: Finalize */}
              <button
                onClick={handleContinue}
                disabled={!consent.telehealth || !consent.terms}
                className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 shadow-xl ${consent.telehealth && consent.terms
                  ? "bg-slate-900 text-white shadow-slate-200 hover:bg-teal-600"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
              >
                {t("finalize")}
              </button>

              {/* Secondary Actions Group */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto sm:mr-auto">
                <button
                  onClick={() => prevStep()}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  {t("back")}
                </button>

                <button
                  onClick={() => setShowDeclineModal(true)}
                  className="w-full sm:w-auto px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                >
                  {t("declineTerms")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
);

ConsentFormStep.displayName = "ConsentFormStep";
export default ConsentFormStep;
