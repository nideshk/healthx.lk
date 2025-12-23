"use client";

import React, { useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

const PricingSettings: React.FC = () => {
  const [platformCharges, setPlatformCharges] = useState({
    solo: { "quick Appointment": 1500, standard: 2500, extended: 3500 },
    plusOne: { quick: 2000, standard: 3000, extended: 4000 },
    
  });

  const updateCharge = (
    section: keyof typeof platformCharges,
    key: string,
    value: number,
    min = 0,
    max?: number
  ) => {
    if (value < min || (max !== undefined && value > max)) return;

    setPlatformCharges((prev) => ({
      ...prev,
      [section]: { ...(prev as any)[section], [key]: value },
    }));
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Appointment Fees
        </div>
        <div className="text-xs text-slate-500">
          Configure pricing and platform limits
        </div>
      </div>

      <Section title="Solo Appointments">
        <ChargeRow
          values={platformCharges.solo}
          onChange={(k, v) => updateCharge("solo", k, v)}
        />
      </Section>

      <Section title="Appointments with +1 Attendee">
        <ChargeRow
          values={platformCharges.plusOne}
          onChange={(k, v) => updateCharge("plusOne", k, v)}
        />
      </Section>

      <Button
        onClick={() =>
          console.log("Saving pricing:", platformCharges)
        }
      >
        Save Service Charges
      </Button>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="text-sm font-medium text-slate-800 mb-3">
      {title}
    </div>
    {children}
  </div>
);

const ChargeRow = ({
  values,
  onChange,
}: {
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) => (
  <div className="grid grid-cols-3 gap-4">
    {Object.entries(values).map(([key, value]) => (
      <Input
        key={key}
        label={key.toUpperCase()}
        type="number"
        value={value.toString()}
        onChange={(e) => onChange(key, Number(e.target.value))}
      />
    ))}
  </div>
);

export default PricingSettings;
