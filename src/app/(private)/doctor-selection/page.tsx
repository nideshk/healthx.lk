'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // <-- Import useRouter

// --- Interface for Doctor Object (Ensures strong type safety) ---
interface Rating {
  advice: number;
  punctuality: number;
  overall: number;
}

interface Doctor {
  name: string;
  registration: string;
  fee: number;
  currency: string;
  rating: Rating;
}

// --- Shared SVG Icons ---

// SVG for the User/Doctor Avatar Placeholder
const DoctorAvatarIcon = () => (
  <svg 
    className="w-12 h-12 text-blue-500 mx-auto mb-2" 
    fill="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
  </svg>
);

// SVG for the Star Rating Icon
const StarIcon = ({ size = 'w-4 h-4', color = 'text-blue-500' }: { size?: string, color?: string }) => (
  <svg className={`${size} ${color}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.049 2.927c.3-.921 1.691-.921 1.99 0l1.258 3.868a1 1 0 00.95.691h4.079c.969 0 1.371 1.24.588 1.83l-3.29 2.388a1 1 0 00-.364 1.118l1.258 3.868c.3.921-.755 1.688-1.54 1.118l-3.29-2.388a1 1 0 00-1.175 0l-3.29 2.388c-.784.57-1.838-.197-1.539-1.118l1.258-3.868a1 1 0 00-.364-1.118L2.012 9.316c-.783-.59-.38-1.83.588-1.83h4.079a1 1 0 00.95-.691l1.258-3.868z"></path>
  </svg>
);

// --- Doctor Card Component Props Interface ---
interface DoctorCardProps {
  doctor: Doctor;
  onClick: (doctor: Doctor) => void;
}

// --- Doctor Card Component ---
const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Helper to render stars - Type is explicitly defined as number
  const renderRating = (rating: number) => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <StarIcon key={i} color={i < Math.floor(rating) ? 'text-yellow-500' : 'text-gray-300'} />
      ))}
    </div>
  );

  return (
    <div
      className={`
        bg-white p-6 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer 
        flex flex-col h-full border border-gray-100
        ${isHovered ? 'shadow-2xl scale-[1.02] border-blue-400' : 'hover:shadow-2xl hover:scale-[1.01]'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Section: Avatar and Name */}
      <div className="flex items-start mb-4 space-x-3">
        <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
          <DoctorAvatarIcon />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {doctor.name}
          </h3>
          <p className="text-xs font-semibold text-green-500 mt-1">
            Verified
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-grow mb-4">
        
        {/* Registration */}
        <div className="font-semibold text-gray-500">Registration:</div>
        <div className="text-right text-gray-700 font-medium">{doctor.registration}</div>
        
        {/* Fee */}
        <div className="font-semibold text-gray-500">Fee:</div>
        <div className="text-right text-gray-700 font-medium">
          {doctor.currency} {doctor.fee.toLocaleString()}
        </div>

        {/* Advice Rating */}
        <div className="font-semibold text-gray-500">Advice: <span className="text-blue-500">{doctor.rating.advice}</span></div>
        <div className="text-right text-gray-700 font-medium"></div> {/* Empty cell for alignment */}

        {/* Punctuality Rating */}
        <div className="font-semibold text-gray-500">Punctuality: <span className="text-blue-500">{doctor.rating.punctuality}</span></div>
        <div className="text-right text-gray-700 font-medium"></div> {/* Empty cell for alignment */}
      </div>

      {/* Overall Rating Block */}
      <div className="border-t pt-3 mt-auto flex justify-between items-center">
        <div className="font-bold text-gray-800">Overall Rating:</div>
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1">
            {renderRating(doctor.rating.overall)}
          </div>
          <span className="text-lg font-extrabold text-blue-500 mt-1">
            {doctor.rating.overall.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Select Button */}
      <button 
        onClick={() => onClick(doctor)}
        className="w-full py-3 mt-4 bg-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-400/50 hover:bg-blue-600 transition-all duration-200"
      >
        Select Doctor →
      </button>
    </div>
  );
};


// --- Main Doctor Selection Page Component ---

export default function DoctorSelection() {
    const router = useRouter(); // <--- ADDED: Initialize router

  // Explicitly typing the handleSelectDoctor parameter
  const handleSelectDoctor = (doctor: Doctor) => {
    // This simulates navigating to the appointment scheduling page
    router.push('/book-appointment'); // <--- ROUTING IMPLEMENTED
  };
  
  // Explicitly typing the doctors array
  const doctors: Doctor[] = [
    { name: "Kumari Silva", registration: "SLMC-GP-2018-0156", fee: 3500, currency: "LKR", rating: { advice: 4.8, punctuality: 4.8, overall: 4.8 } },
    { name: "Kamal Perera", registration: "SLMC-GP-2019-0210", fee: 4000, currency: "LKR", rating: { advice: 4.9, punctuality: 4.7, overall: 4.8 } },
    { name: "Ranjith De Silva", registration: "SLMC-GP-2017-0099", fee: 3200, currency: "LKR", rating: { advice: 4.6, punctuality: 4.9, overall: 4.7 } },
    { name: "Anusha Fernando", registration: "SLMC-GP-2020-0301", fee: 3750, currency: "LKR", rating: { advice: 4.7, punctuality: 4.6, overall: 4.6 } },
    { name: "Suresh Mani", registration: "SLMC-GP-2016-0045", fee: 3600, currency: "LKR", rating: { advice: 4.9, punctuality: 4.8, overall: 4.9 } },
    { name: "Lakshmi Dias", registration: "SLMC-GP-2021-0407", fee: 3400, currency: "LKR", rating: { advice: 4.5, punctuality: 4.7, overall: 4.6 } },
  ];

  return (
    <div className="min-h-screen bg-blue-50 font-sans">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link and Main Title (Exact match of the image provided) */}
        <div className="flex flex-col items-center mb-8 pt-4">
            {/* Back Link on the far left */}
            <div className='w-full flex justify-start mb-6'>
                <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); router.back(); }} // <-- IMPROVED: Use router.back()
                    className="text-gray-600 hover:text-gray-800 transition font-medium text-lg flex items-center space-x-1"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    <span>Back</span>
                </a>
            </div>
            
            {/* Title Block centered on the page */}
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
              General Consultation
            </h1>
            <p className="mt-2 text-xl text-gray-600">
              Select a doctor for your individual appointment
            </p>
        </div>
        
        {/* Sort and Count Bar */}
        <div className="flex items-center justify-start space-x-4 mb-6 pt-4">
            <span className="text-lg font-bold text-gray-800">Sort by :</span>
            
            <select 
                className="p-2 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white pr-8 text-gray-700 font-medium"
            >
                <option>Rating</option>
                <option>Fee (Low to High)</option>
                <option>Fee (High to Low)</option>
                <option>Punctuality</option>
            </select>
            
            <span className="text-lg text-gray-600">
                {doctors.length} doctors available
            </span>
        </div>

        {/* Doctor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor, index) => (
            <DoctorCard 
              key={index}
              doctor={doctor}
              onClick={handleSelectDoctor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
