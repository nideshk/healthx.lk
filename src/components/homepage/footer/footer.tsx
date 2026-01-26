"use client";

import React from "react";
import { useTranslations } from "next-intl";

const mainLinks = [
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
  { key: "help", href: "/help" },
  { key: "terms", href: "/terms" },
  { key: "privacy", href: "/privacy" },
];

const companyName = "Medx";
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

  return (
    <footer className="py-6 bg-gray-900 text-white border-t border-cyan-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-4 border-b border-gray-700">
          {/* LEFT LINKS */}
          <div className="flex-1 text-left w-full md:w-auto">
            <ul className="space-y-1 text-sm">
              {mainLinks.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-cyan-500 transition duration-150"
                  >
                    {t(`links.${link.key}`)}
                  </a>
                </li>
              ))}
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
    </footer>
  );
};

export default Footer;
