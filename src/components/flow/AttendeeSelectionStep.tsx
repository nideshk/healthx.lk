"use client";
import React, { useState } from "react";
import { Users, User } from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";

interface AttendeeSelectionStepProps {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: {
    service_name?: string;
    maxAttendees?: number;
  };
}

const AttendeeSelectionStep = ({
  nextStep,
  prevStep,
  updateData,
  bookingData,
}: AttendeeSelectionStepProps) => {
  const [selectedOption, setSelectedOption] = useState<"single" | "group" | null>(null);
  const maxAttendee = bookingData?.maxAttendees || 1;
  const handleSelect = (type: "single" | "group") => {
    setSelectedOption(type);

    updateData({
      attendeeCount: type === "single" ? 1 : Math.min(maxAttendee, 2),
      selectedAttendees: type === "group" ? [] : undefined,
    });

    // proceed to next step
    setTimeout(() => {
      nextStep();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 font-sans flex flex-col items-center justify-between py-10 px-4">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
          How many attendees will join the appointment?
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          {maxAttendee === 1
            ? "This service supports only one attendee per booking."
            : "You can add one family member to join this consultation."}
        </p>
      </div>

      {/* Selection Cards */}
      <div
        className={`flex flex-col ${
          maxAttendee > 1 ? "md:flex-row" : ""
        } justify-center gap-6 mt-8 max-w-4xl w-full px-4`}
      >
        {/* Single Option */}
        <div
          onClick={() => handleSelect("single")}
          className={`flex flex-col items-center justify-between p-6 rounded-2xl shadow-md transition-all duration-300 cursor-pointer text-center w-full md:w-1/2 min-h-[300px]
            ${
              selectedOption === "single"
                ? "border-2 border-blue-600 shadow-blue-200 bg-white"
                : "border border-gray-200 hover:border-blue-400 hover:shadow-lg"
            }`}
        >
          <div className="flex flex-col items-center">
            <div className="p-4 bg-blue-100 rounded-full mb-4">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Only Me</h3>
            <p className="text-sm text-gray-600 mt-2 max-w-xs">
              Book a one-on-one consultation just for yourself.
            </p>
          </div>

          <button
            className={`mt-6 w-full py-2 font-semibold text-sm rounded-lg transition-all duration-200 ${
              selectedOption === "single"
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            }`}
          >
            Select
          </button>
        </div>

        {/* Group Option (only if allowed) */}
        {maxAttendee > 1 && (
          <div
            onClick={() => handleSelect("group")}
            className={`flex flex-col items-center justify-between p-6 rounded-2xl shadow-md transition-all duration-300 cursor-pointer text-center w-full md:w-1/2 min-h-[300px]
              ${
                selectedOption === "group"
                  ? "border-2 border-blue-600 shadow-blue-200 bg-white"
                  : "border border-gray-200 hover:border-blue-400 hover:shadow-lg"
              }`}
          >
            <div className="flex flex-col items-center">
              <div className="p-4 bg-blue-100 rounded-full mb-4">
                <Users className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Me + Family Member</h3>
              <p className="text-sm text-gray-600 mt-2 max-w-xs">
                Add {maxAttendee-1} family member to attend this appointment with you.
              </p>
            </div>

            <button
              className={`mt-6 w-full py-2 font-semibold text-sm rounded-lg transition-all duration-200 ${
                selectedOption === "group"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
            >
              Select
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12">
        <button
          onClick={prevStep}
          className="flex items-center text-gray-600 hover:text-blue-500 transition text-sm font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Services
        </button>
      </div>
    </div>
  );
};

export default AttendeeSelectionStep;
