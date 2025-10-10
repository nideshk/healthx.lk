'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // <-- Import useRouter

// --- Shared SVG Icons ---

// Icon for "Only the patient" (Single Person)
const PatientIcon = () => (
  <svg 
    className="w-16 h-16 text-blue-500 mx-auto mb-4" 
    fill="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
  </svg>
);

// Icon for "Additional family member with patient" (Group)
const FamilyGroupIcon = () => (
  <svg 
    className="w-16 h-16 text-blue-500 mx-auto mb-4" 
    fill="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M16 17c1.42 0 2.8-.52 3.96-1.53.25-.21.49-.43.72-.66-.46-1.55-2.07-2.73-4.73-3.15.58-.29 1.05-.72 1.38-1.22l-.1-.08c-.01-.01-.02-.02-.03-.02-.13-.09-.27-.16-.4-.23.11-.26.17-.54.17-.83 0-.61-.25-1.18-.68-1.61L16 10c.83 0 1.5-.67 1.5-1.5S16.83 7 16 7c-.1 0-.2.01-.3.02C15.53 5.48 13.91 4 12 4s-3.53 1.48-3.7 3.02C8.2 7.01 8.1 7 8 7c-.83 0-1.5.67-1.5 1.5S7.17 10 8 10l.37.03c.12.44.33.84.58 1.18-.04.05-.07.1-.11.15-.36.33-.67.7-.91 1.13-.1.17-.18.35-.25.53-1.65.4-2.83 1.5-3.37 2.91.24.23.47.45.72.66C5.2 16.48 6.58 17 8 17h8zm0-2H8c-.89 0-2.19.46-3.23 1.25.68-.9 1.77-1.5 3.23-1.5h8c1.46 0 2.55.6 3.23 1.5-1.04-.79-2.34-1.25-3.23-1.25zM12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"></path>
  </svg>
);


// --- Selection Card Component ---
type AttendeeCardProps = {
  icon: React.ComponentType; // SVG Icon component
  title: string;
    onCardClick: () => void; // Using onCardClick to avoid native prop conflict
};

const AttendeeCard = ({ icon: Icon, title, onCardClick }: AttendeeCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`
        bg-white p-8 rounded-3xl shadow-xl transition-all duration-300 cursor-pointer 
        flex flex-col items-center text-center w-full
        ${isHovered ? 'shadow-2xl scale-[1.02] border-4 border-blue-400' : 'hover:shadow-2xl hover:scale-[1.01] border-4 border-transparent'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onCardClick}
    >
      <div className="p-4 bg-blue-100 rounded-full mb-6">
        <Icon />
      </div>
      
      <p className="text-base text-gray-700 font-medium mb-6">
        {title}
      </p>
      
      {/* Select Button */}
      <button 
        className="w-full py-3 bg-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-400/50 hover:bg-blue-600 transition-all duration-200"
      >
        Select
      </button>
    </div>
  );
};


// --- Main Page Component ---

export default function AttendeeSelection() {
  type AttendeeType = "Single Patient" | "Patient and Family Member";

   const router = useRouter(); // <-- Initialize router
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleCardClick = (selection: string) => {
    setSelectedOption(selection);
    console.log('Selected:', selection);

    // Flow step: After selecting an attendee option, go to the doctor selection page.
    router.push('/doctor-selection'); // <--- ROUTING IMPLEMENTED
  };
  
  const handleGoBack = (e: React.MouseEvent) => {
      e.preventDefault();
      // Go back to the consultation page
      router.push('/consultation');
  };

  return (
    // Set a very light blue background to match the image
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 to-white font-sans flex flex-col items-center pt-20 pb-16">
      
      {/* Header Text Block */}
      <div className="max-w-3xl mx-auto px-4 text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          Select the number of attendees for your appointment
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Choose whether you'll attend individually or with one family member.
        </p>
        <p className="text-sm text-gray-500 mt-1 italic">
          (Appointment costs may vary depending on the number of participants.)
        </p>
      </div>
      
      {/* Cards Grid */}
      <div className="max-w-4xl w-full px-4">
        <div className="flex flex-col sm:flex-row justify-center gap-8">
          
          {/* Card 1: Only the patient */}
          <div className="w-full sm:w-1/2">
            <AttendeeCard
              icon={PatientIcon}
              title="Only the patient"
              onCardClick={() => handleCardClick("Single Patient")} // <-- Attached handler
            />
          </div>

          {/* Card 2: Additional family member */}
          <div className="w-full sm:w-1/2">
            <AttendeeCard
              icon={FamilyGroupIcon}
              title="Additional family member with patient"
              onCardClick={() => handleCardClick("Patient and Family Member")}
            />
          </div>
        </div>
      </div>
      
      {/* Back Link */}
      <div className="mt-16">
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); alert("Going back to service selection."); }}
          className="text-gray-600 hover:text-gray-800 transition text-lg font-medium"
        >
          ← Back to service
        </a>
      </div>
    </div>
  );
}
