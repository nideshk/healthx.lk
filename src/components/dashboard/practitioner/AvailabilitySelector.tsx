"use client";

import React from "react";
import Input from "@/components/atom/Input/Input"; // Assuming this is your custom input
import { Calendar, Clock, Plus, Loader2, ArrowRight } from "lucide-react";

export type AvailabilityInput = {
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
};

type Props = {
    value: AvailabilityInput;
    onChange: (value: AvailabilityInput) => void;
    onSave?: () => void;
    saving?: boolean;
    disabled?: boolean;
};

export default function AvailabilitySelector({
    value,
    onChange,
    onSave,
    saving = false,
    disabled = false,
}: Props) {
    // Validation logic
    const isTimeInvalid =
        value.start_time && value.end_time && value.start_time >= value.end_time;
    const isComplete = value.date && value.start_time && value.end_time;

    return (
        <div className="bg-white w-full border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            {/* Header - Matches the card style of the list */}
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-teal-600">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">New Entry</h2>
                        <p className="text-xs text-slate-500 font-medium">Add a time slot</p>
                    </div>
                </div>
                {/* Optional: Indicator for "Draft" or "unsaved" status could go here */}
            </div>

            <div className="p-5 sm:p-6 space-y-6">
                {/* Date Selection */}
                <div>
                    <Input
                        type="date"
                        label="Date"
                        required
                        // Note: Ensure your Input component accepts className for width control
                        className="w-full"
                        icon={<Calendar size={18} className="text-slate-400" />}
                        value={value.date}
                        onChange={(e) => onChange({ ...value, date: e.target.value })}
                        disabled={disabled}
                    />
                </div>

                {/* Time Range Section */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock size={16} className="text-slate-400" />
                        Time Range
                    </label>

                    {/* Responsive Time Container: Stacks on mobile, Row on Desktop */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">

                        <div className="w-full sm:flex-1">
                            <Input
                                type="time"
                                placeholder="Start"
                                value={value.start_time}
                                onChange={(e) =>
                                    onChange({ ...value, start_time: e.target.value })
                                }
                                disabled={disabled}
                                errorStatus={isTimeInvalid ? true : false}
                                // Hide error text here to avoid layout jumping, we show it on the parent or second input
                                error=""
                                className="bg-white"
                            />
                        </div>

                        {/* Arrow: Rotates 90deg on mobile (pointing down), points right on desktop */}
                        <ArrowRight
                            className="text-slate-300 shrink-0 transform rotate-90 sm:rotate-0 transition-transform"
                            size={20}
                        />

                        <div className="w-full sm:flex-1">
                            <Input
                                type="time"
                                placeholder="End"
                                value={value.end_time}
                                onChange={(e) =>
                                    onChange({ ...value, end_time: e.target.value })
                                }
                                disabled={disabled}
                                errorStatus={isTimeInvalid ? true : false}
                                error={isTimeInvalid ? "End time must be after start" : ""}
                                className="bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                {onSave && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving || disabled || isTimeInvalid || !isComplete}
                            className={`
                w-full sm:w-auto ml-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                ${!isComplete || isTimeInvalid
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] shadow-md shadow-teal-100"
                                }
              `}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className={`w-4 h-4 ${isComplete ? "group-hover:rotate-90" : ""} transition-transform`} />
                                    <span>Add Slot</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}