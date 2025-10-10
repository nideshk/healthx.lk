
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <-- NEW: Import for routing

// --- Shared SVG Icon for the Stethoscope (Used on cards) ---

const StethoscopeIcon = () => (
  <svg 
    className="w-12 h-12 text-blue-500 mb-4" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 3h3m-6-3h.01M9 15h.01M9 12h.01"></path>
  </svg>
);

// --- Consultation Card Component (Represents the "General Consultation" boxes) ---
type ConsultationCardProps = {
  title: string;
  description: string;
    onCardClick: () => void; // <-- Added handler signature

};
const ConsultationCard = ({ title, description, onCardClick }: ConsultationCardProps) => {
  // Use a simple state to demonstrate interaction (simulates hover/click effect)
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`
        bg-white p-6 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer
        flex flex-col items-center text-center border border-gray-100
        ${isHovered ? 'shadow-2xl scale-[1.02] border-blue-400' : 'hover:shadow-2xl hover:scale-[1.01]'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // For a real app, this would use a router link or a state change to navigate
      onClick={onCardClick} // <-- ROUTING TRIGGER: Use the new handler on click
    >
      <div className="p-4 bg-blue-100 rounded-full mb-4 inline-block">
        <StethoscopeIcon />
      </div>
      
      <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-500 mb-4 flex-grow">
        {description}
      </p>
      
      {/* The "Select Service" link/button */}
      <div className="text-center">
        <a href="#"  onClick={(e) => { e.preventDefault(); onCardClick(); }} className="text-sm font-semibold text-blue-500 hover:text-blue-700 transition">
          Select service 
          <span className="ml-1 text-xs">→</span>
        </a>
        <div className="w-12 h-[2px] bg-blue-500 mx-auto mt-1"></div> {/* Blue underline */}
      </div>
    </div>
  );
};


// --- Main Consultation Page Component ---

export default function Consultation() {
      const router = useRouter(); // <-- Initialize router
          const resultsRef = useRef<HTMLDivElement>(null); // <-- 3. Ref for scrolling

          const [inputTerm, setInputTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredServices, setFilteredServices] = useState<typeof services>([]);

  const services = [
    { 
      title: "GENERAL CONSULTATION", 
      description: "Connect with licensed physicians for routine health concerns, preventive care, and medical advice." 
    },
    { 
      title: "PEDIATRICS", 
      description: "Expert advice and treatment for children's health, from newborns to adolescents." 
    },
    { 
      title: "DERMATOLOGY", 
      description: "Consultations for skin conditions, rashes, acne, and other dermatological issues." 
    },
    { 
      title: "CARDIOLOGY", 
      description: "Specialized virtual care for heart health, follow-ups, and risk assessments." 
    },
    { 
      title: "MENTAL WELLNESS", 
      description: "Confidential sessions with therapists and psychiatrists for mental health support." 
    },
    { 
      title: "NUTRITION & DIET", 
      description: "Personalized diet plans and nutritional guidance from certified dietitians." 
    },
  ];

   // Effect to filter services whenever the official searchTerm changes
    useEffect(() => {
        const lowerCaseTerm = searchTerm.toLowerCase();
        
        if (!lowerCaseTerm) {
            setFilteredServices(services);
        } else {
            const results = services.filter(service =>
                service.title.toLowerCase().includes(lowerCaseTerm) ||
                service.description.toLowerCase().includes(lowerCaseTerm)
            );
            setFilteredServices(results);
        }
    }, [searchTerm]);

    // Handler for search submission
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // Prevent page reload
        
        setSearchTerm(inputTerm); // Trigger filtering
        
        // 3. Slide down to results when we hit search
        if (resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

      const handleServiceSelect = () => {
        // Flow step: Navigate to attendee selection page.
        router.push('/attendee-selection'); // <--- ROUTING IMPLEMENTED
    };

    

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* 1. Hero Section (Blue Background) */}
      <div className="bg-blue-500 py-12 sm:py-16 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Healthcare at your <br />
            <span className="text-white drop-shadow-lg">Fingertips</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto text-blue-100">
            Connect with certified healthcare professionals from the comfort of your home. Quality care, anytime, anywhere
          </p>
          
          {/* Search Bar */}
           {/* Search Bar with functionality */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Search healthcare service"
              value={inputTerm}
              onChange={(e) => setInputTerm(e.target.value)}
              className="w-full p-3 pr-12 rounded-full text-gray-800 placeholder-gray-400 text-base shadow-xl border-2 border-white focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all bg-white" // <-- 1. Search box bg-white, 4. Smaller size
            />
            <button type="submit" className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-gray-500 hover:text-blue-600 transition">
                {/* Search Icon for visual feedback */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </form>
        </div>
      </div>

      {/* 2. Service Introduction */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center">
          Our Healthcare Services
        </h2>
        <p className="mt-3 text-lg text-gray-600 text-center max-w-4xl mx-auto"> {/* 4. Smaller Text */}
          Choose from our comprehensive range of medical specialities and connect with the right healthcare professional for your needs
        </p>
      </div>
      
      {/* 3. Consultation Cards Grid */}
     <div ref={resultsRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                {filteredServices.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredServices.map((service, index) => (
                            <ConsultationCard 
                                key={index}
                                title={service.title}
                                description={service.description}
                                onCardClick={handleServiceSelect}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-xl text-gray-500 py-10">
                        No services found matching "{searchTerm}". Try a different term.
                    </p>
                )}
            </div>
      
      {/* Optional: Simple Footer to complete the page */}
      <footer className="bg-white border-t border-gray-100 p-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Clinico. All rights reserved.
      </footer>
    </div>
  );
}
