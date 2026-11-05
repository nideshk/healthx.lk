"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram } from "lucide-react";

const PrivacyModal = dynamic(() => import("./PrivacyModal"), { ssr: false });
const RefundModal = dynamic(() => import("./RefundModal"), { ssr: false });

const mainLinks = [
  { key: "about", href: "/about-us" }, // Fixed to /about-us based on previous context
  { key: "contact", href: "/contact-us" },
  { key: "help", href: "/help" },
];

/**
 * TODO: Replace these placeholder URLs with the real Clinecxa Instagram
 * and Facebook pages. The owner will supply the URLs.
 */
const SOCIAL_PLACEHOLDER_LINKS = {
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
} as const;

const companyName = "Clinecxa";
const currentYear = new Date().getFullYear();

const ClincoLogo = () => (
  <svg
    className="w-8 h-8 text-cx-tint"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 4v16m8-8H4"
    ></path>
  </svg>
);

const Footer = () => {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const clearMobileBookBar = pathname === "/";
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [isRefundOpen, setIsRefundOpen] = React.useState(false);
  const [dynSettings, setDynSettings] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/platform_settings")
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const mapped = json.data.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});
          setDynSettings(mapped);
        }
      })
      .catch(err => console.error("Failed to fetch footer settings", err));
  }, []);

  return (
    <footer className={`bg-cx-deep text-white border-t-4 border-cx-gold${clearMobileBookBar ? " cx-mobile-book-clearance" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-8 border-b border-white/20">
          <div className="flex-1 text-left w-full md:w-auto">
            <ul className="space-y-2 text-base">
              {mainLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-12 items-center text-white hover:text-cx-tint"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="inline-flex min-h-12 items-center text-white hover:text-cx-tint text-left"
                >
                  {t("links.privacy")}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsRefundOpen(true)}
                  className="inline-flex min-h-12 items-center text-white hover:text-cx-tint text-left"
                >
                  {t("links.refund")}
                </button>
              </li>
            </ul>
          </div>

          <div className="flex-1 text-left w-full md:w-auto">
            <h2 className="text-white font-semibold mb-3 text-lg">{t("contactInfo.title")}</h2>
            <ul className="space-y-3 text-base text-white">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-cx-tint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{dynSettings?.org_address || t("contactInfo.address")}</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0 text-cx-tint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href={`tel:${dynSettings?.org_phone || "+94771050867"}`} className="hover:text-cx-tint min-h-12 inline-flex items-center">
                  {dynSettings?.org_phone || t("contactInfo.phone")}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0 text-cx-tint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${dynSettings?.org_email || "support@clinecxa.lk"}`} className="hover:text-cx-tint min-h-12 inline-flex items-center">
                  {dynSettings?.org_email || t("contactInfo.email")}
                </a>
              </li>
            </ul>
          </div>

          <div className="flex-1 flex flex-col items-start md:items-end space-y-3 w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <ClincoLogo />
              <a
                href={SOCIAL_PLACEHOLDER_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("social.instagram")}
                className="text-white hover:text-cx-tint min-h-12 min-w-12 inline-flex items-center justify-center"
              >
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a
                href={SOCIAL_PLACEHOLDER_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("social.facebook")}
                className="text-white hover:text-cx-tint min-h-12 min-w-12 inline-flex items-center justify-center"
              >
                <Facebook className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>

            <p className="text-base text-cx-tint flex items-center md:justify-end">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
              {t("secure")}
            </p>

            <p className="text-base text-white max-w-md text-left md:text-right">
              <span className="font-semibold">{t("disclaimerTitle")}:</span>{" "}
              {t("disclaimerText")}
            </p>
          </div>
        </div>

        <div className="pt-6 text-center">
          <div className="text-base text-white">
            &copy; {currentYear} {companyName}. {t("rights")}
          </div>
          <a
            href="https://squarecoin.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-12 items-center text-base text-white hover:text-cx-tint"
          >
            {t("builtBy")}
          </a>
        </div>
      </div>

      {isPrivacyOpen && (
        <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      )}
      {isRefundOpen && (
        <RefundModal isOpen={isRefundOpen} onClose={() => setIsRefundOpen(false)} />
      )}
    </footer>
  );
};

export default Footer;
