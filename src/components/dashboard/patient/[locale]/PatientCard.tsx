"use client";

import React from "react";
import Button from "@/components/atom/Button/Button";
import { useTranslations } from "next-intl";

export interface PatientCardProps {
  name: string;
  email: string;
  phone: string;
  onDelete?: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({
  name,
  email,
  phone,
  onDelete,
}) => {
  const t = useTranslations("patientCard");

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
      {/* Left: patient info */}
      <div className="flex flex-col text-sm">
        <button
          type="button"
          className="text-blue-600 font-semibold text-sm text-left hover:underline"
        >
          {name}
        </button>
        <span className="text-xs text-slate-500">{email}</span>
        <span className="text-xs text-slate-500">{phone}</span>
      </div>

      {/* Right: delete button */}
      <Button
        variant="danger"
        size="sm"
        className="text-xs px-4"
        onClick={onDelete}
      >
        🗑 {t("deletePermanent")}
      </Button>
    </div>
  );
};

export default PatientCard;
