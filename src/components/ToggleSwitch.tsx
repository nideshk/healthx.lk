"use client";
import React from "react";

export default function ToggleSwitch({ checked, onChange }: any) {
  return (
    <div
      className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition 
        ${checked ? "bg-blue-600" : "bg-gray-300"}`}
      onClick={onChange}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow transform transition 
          ${checked ? "translate-x-5" : "translate-x-0"}`}
      ></div>
    </div>
  );
}
