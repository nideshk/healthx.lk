import React from "react";

export default function ClinicianCard({ clinician }: any) {
  return (
    <div className="border border-gray-200 rounded-md p-3 flex justify-between items-center hover:shadow-sm text-sm transition">
      <div>
        <h3 className="font-semibold text-gray-800">{clinician.name}</h3>
        <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 mt-1 inline-block">
          {clinician.specialty}
        </span>
        <p className="text-gray-600 mt-1 text-xs">Reg: {clinician.registration}</p>

        <p className="mt-1 text-xs">
          Solo: <b>{clinician.soloFee}</b> | Family: <b>{clinician.familyFee}</b>
        </p>

        <div className="flex gap-1 mt-2 flex-wrap">
          {clinician.tags.map((t: string, i: number) => (
            <span key={i} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-md">
              {t}
            </span>
          ))}
        </div>
      </div>

      <button className="border text-xs px-3 py-1 rounded-md hover:bg-gray-50">
        View
      </button>
    </div>
  );
}
