"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import PrivacyModal from "./PrivacyModal";
import RefundModal from "./RefundModal";

const mainLinks = [
  { key: "about", href: "/about-us" }, // Fixed to /about-us based on previous context
  { key: "contact", href: "/contact" },
  { key: "help", href: "/help" },
];

const companyName = "Clinecxa";
const currentYear = new Date().getFullYear();

const ClincoLogo = () => (
  <svg
    className="w-8 h-8 text-cyan-500"
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
  const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
  const [isRefundOpen, setIsRefundOpen] = React.useState(false);

  return (
    <footer className="py-6 bg-gray-900 text-white border-t border-cyan-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-4 border-b border-gray-700">
          {/* LEFT LINKS */}
          <div className="flex-1 text-left w-full md:w-auto">
            <ul className="space-y-1 text-sm">
              {mainLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-cyan-500 transition duration-150"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setIsPrivacyOpen(true)}
                  className="text-gray-400 hover:text-cyan-500 transition duration-150 text-left"
                >
                  {t("links.privacy")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsRefundOpen(true)}
                  className="text-gray-400 hover:text-cyan-500 transition duration-150 text-left"
                >
                  {t("links.refund")}
                </button>
              </li>
            </ul>
          </div>

          {/* MIDDLE: CONTACT INFO */}
          <div className="flex-1 text-left w-full md:w-auto pt-2 md:pt-0">
            <h4 className="text-gray-200 font-semibold mb-3 text-sm">{t("contactInfo.title")}</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{t("contactInfo.address")}</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+94771050867" className="hover:text-cyan-500 transition duration-150">{t("contactInfo.phone")}</a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:support@clinecxa.lk" className="hover:text-cyan-500 transition duration-150">{t("contactInfo.email")}</a>
              </li>
            </ul>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex-1 flex flex-col items-start md:items-end space-y-2 text-right w-full md:w-auto pt-2 md:pt-0">
            <div className="flex items-center space-x-3">
              <ClincoLogo />
            </div>

            <p className="text-xs text-green-400 flex items-center md:justify-end">
              <svg
                className="w-3 h-3 mr-1"
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

            <p className="text-xs text-gray-500 max-w-md text-left md:text-right">
              <span className="font-medium">{t("disclaimerTitle")}:</span>{" "}
              {t("disclaimerText")}
            </p>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="pt-3 text-center">
          <div className="text-sm font-light text-gray-400">
            &copy; {currentYear} {companyName}. {t("rights")}
          </div>
        </div>
      </div>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <RefundModal isOpen={isRefundOpen} onClose={() => setIsRefundOpen(false)} />
    </footer>
  );
};

export default Footer;
