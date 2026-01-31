"use client";

import React from "react";
import Input from "@/components/atom/Input/Input";

type Availability = {
    start_time: string;
    end_time: string;
    days_unavailable: string[];
    timezone: string;
};

type Props = {
    value: Availability;
    onChange: (value: Availability) => void;
    onSave?: () => void;
    saving?: boolean;
    disabled?: boolean;
};

const WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export default function AvailabilitySelector({
    value,
    onChange,
    onSave,
    saving = false,
    disabled = false,
}: Props) {
    const toggleDay = (day: string) => {
        const updatedDays = value.days_unavailable.includes(day)
            ? value.days_unavailable.filter(d => d !== day)
            : [...value.days_unavailable, day];

        onChange({ ...value, days_unavailable: updatedDays });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="section-title">Availability</h2>

            {/* Time range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <Input
                    type="time"
                    label="Start Time"
                    value={value.start_time}
                    onChange={(e) =>
                        onChange({ ...value, start_time: e.target.value })
                    }
                    disabled={disabled}
                />

                <Input
                    type="time"
                    label="End Time"
                    value={value.end_time}
                    onChange={(e) =>
                        onChange({ ...value, end_time: e.target.value })
                    }
                    disabled={disabled}
                />
            </div>

            {/* Days unavailable */}
            <p className="font-medium text-gray-700 mt-4 mb-2">
                Days Unavailable
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {WEEKDAYS.map(day => (
                    <label key={day} className="flex gap-2 items-center">
                        <input
                            type="checkbox"
                            className="rounded accent-teal-600"
                            checked={value.days_unavailable.includes(day)}
                            onChange={() => toggleDay(day)}
                            disabled={disabled}
                        />
                        <span className="text-gray-700">{day}</span>
                    </label>
                ))}
            </div>

            {/* Save button */}
            {onSave && (
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving || disabled}
                        className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium
                       hover:bg-teal-700 transition disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Availability"}
                    </button>
                </div>
            )}
        </div>
    );
}
