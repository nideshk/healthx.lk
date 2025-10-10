'use client';
import React, { useState } from 'react';

// --- Interfaces for Strong Typing ---

interface Rating {
  score: number;
  label: string;
}

interface DoctorProfile {
  name: string;
  specialty: string;
  registration: string;
  fee: number;
  currency: string;
  ratings: {
    overall: Rating;
    advice: Rating;
    punctuality: Rating;
  };
  about: string;
  expertise: string[];
}

// --- Component Data ---

const mockDoctor: DoctorProfile = {
  name: "Dr. Kumari Silva",
  specialty: "General Physician",
  registration: "SLMC:GP:2019-0124",
  fee: 3500,
  currency: "LKR",
  ratings: {
    overall: { score: 4.7, label: 'Overall' },
    advice: { score: 4.8, label: 'Advice' },
    punctuality: { score: 4.8, label: 'Punctuality' },
  },
  about: "Dr. Maria Silva, MD is a compassionate and highly qualified healthcare professional with over 10 years of experience in family medicine and preventive healthcare. She believes in delivering personalized care that focuses on both physical and emotional wellbeing.",
  expertise: [
    "Over 10 years of clinical experience in family and preventive medicine",
    "Former Senior Consultant Physician at CityCare Medical Center (2014 - 2022)",
    "Founder of Silva Wellness Clinic, focused on holistic and lifestyle medicine",
    "Guest lecturer at multiple health and wellness seminars across India",
    "Contributor to leading medical journals and wellness blogs",
  ],
};

// --- Shared SVG Icons ---

// Icon for the Rating Bar (Star/Score Indicator)
const StarIcon = ({ className = "w-5 h-5 text-yellow-500" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.049 2.927c.3-.921 1.691-.921 1.99 0l1.258 3.868a1 1 0 00.95.691h4.079c.969 0 1.371 1.24.588 1.83l-3.29 2.388a1 1 0 00-.364 1.118l1.258 3.868c.3.921-.755 1.688-1.54 1.118l-3.29-2.388a1 1 0 00-1.175 0l-3.29 2.388c-.784.57-1.838-.197-1.539-1.118l1.258-3.868a1 1 0 00-.364-1.118L2.012 9.316c-.783-.59-.38-1.83.588-1.83h4.079a1 1 0 00.95-.691l1.258-3.868z"></path>
  </svg>
);

// Icon for Calendar Edit
const EditIcon = ({ className = "w-4 h-4 text-gray-500 hover:text-blue-500" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
  </svg>
);

// Icon for Previous/Next Month
const ChevronIcon = ({ direction, onClick }: { direction: 'left' | 'right', onClick: () => void }) => (
  <button onClick={onClick} className="p-1 rounded-full hover:bg-gray-100 transition">
    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={direction === 'left' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}></path>
    </svg>
  </button>
);


// --- Calendar Component (Simplified for UI display) ---

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 7, 1)); // Aug 1, 2025
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Simplified calendar logic
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 for Sunday
  const totalDays = daysInMonth(currentMonth);
  const startingDay = firstDayOfMonth(currentMonth);

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: startingDay }, (_, i) => i);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Placeholder for month navigation (not implemented fully as per image)
  const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(newDate);
  };
  
  // Hardcoding the date from the image (Aug 17, 2025)
  const isTargetDate = (day: number) => day === 17 && currentMonth.getMonth() === 7 && currentMonth.getFullYear() === 2025;
  const isSelectedInImage = (day: number) => day === 5 && currentMonth.getMonth() === 7 && currentMonth.getFullYear() === 2025;
  
  // Array of full day names to ensure unique keys
  const dayAbbreviations = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg h-full">
      <div className="text-gray-600 font-semibold mb-4 text-sm">Select date</div>

      {/* Selected Date Header (Mon, Aug 17) */}
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-3xl font-extrabold text-gray-900">
          Mon, Aug 17
        </h2>
        <EditIcon className="w-5 h-5 text-gray-500 cursor-pointer" />
      </div>

      {/* Month Navigation */}
      <div className="flex justify-between items-center mt-4 mb-4">
        <div className="flex items-center space-x-2 text-gray-700 font-medium">
          <select className="font-bold text-sm bg-transparent outline-none">
            <option>August 2025</option>
            <option>September 2025</option>
          </select>
        </div>
        <div className="flex space-x-1">
          <ChevronIcon direction="left" onClick={handlePrevMonth} />
          <ChevronIcon direction="right" onClick={handleNextMonth} />
        </div>
      </div>

      {/* Days of the Week */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-500 mb-2 text-sm">
        {/* FIX: Use index or full name for unique keys */}
        {fullDayNames.map((dayName, index) => (
          <span key={dayName}>{dayAbbreviations[index]}</span>
        ))}
      </div>

      {/* Dates Grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyCells.map((_, i) => (
          <div key={`empty-${i}`} className="h-8"></div>
        ))}
        
        {/* Render dates */}
        {days.map(day => {
          const isCurrentSelected = isTargetDate(day); // Use 17 for the highlighted date from the image
          const isSelectedCircle = isSelectedInImage(day); // Use 5 for the circled date from the image
          
          return (
            <button
              key={day}
              className={`
                h-8 w-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition duration-150
                ${isCurrentSelected 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-400/50' 
                  : 'text-gray-800 hover:bg-blue-100'
                }
                ${isSelectedCircle && !isCurrentSelected ? 'border-2 border-blue-500 text-blue-500 bg-blue-50' : ''}
              `}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
      
      {/* Footer Buttons */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <button className="text-blue-500 font-medium hover:text-blue-700 transition">Clear</button>
        <div className="space-x-4">
          <button className="text-gray-500 font-medium hover:text-gray-700 transition">Cancel</button>
          <button className="text-blue-500 font-bold hover:text-blue-700 transition">OK</button>
        </div>
      </div>
    </div>
  );
};


// --- Main Appointment Booking Page Component ---

export default function AppointmentBooking() {
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 7, 17)); // Aug 17, 2025

  const handleConfirmBooking = () => {
    // Replaced alert with console log for demonstration purposes to follow best practices
    console.log(`Booking confirmed for Dr. ${mockDoctor.name} on ${selectedDate.toDateString()}.`);
  };

  return (
    <div className="min-h-screen bg-blue-50 font-sans">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link and Main Title Block */}
        <div className="flex flex-col items-start mb-8 pt-4">
            {/* Back Link */}
            <div className='w-full flex justify-start mb-6'>
                <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); console.log("Going back."); }}
                    className="text-gray-600 hover:text-gray-800 transition font-medium text-lg flex items-center space-x-1"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    <span>Back</span>
                </a>
            </div>
            
            {/* Title Block */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Book Appointment
            </h1>
            <p className="mt-1 text-lg text-gray-600">
              Schedule your individual appointment for general consultation
            </p>
        </div>

        {/* Main Content: Doctor Profile and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Doctor Profile & Details */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            
            {/* Header: Name and Fee */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">{mockDoctor.name}</h2>
                <p className="text-md text-gray-600">{mockDoctor.specialty}</p>
                <p className="text-sm text-gray-500">Registration: {mockDoctor.registration}</p>
              </div>
              <p className="text-xl font-bold text-blue-600">
                {mockDoctor.currency} {mockDoctor.fee.toLocaleString()}
              </p>
            </div>

            {/* Ratings Bar */}
            <div className="flex space-x-8 items-center border-b pb-4 mb-4">
              {Object.values(mockDoctor.ratings).map((rating, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-xl font-extrabold text-gray-800">{rating.score.toFixed(1)}</span>
                  {/* <span className="text-xs text-gray-500">({rating.label})</span> */}
                </div>
              ))}
            </div>

            {/* About Doctor */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>About Dr. Silva</span>
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{mockDoctor.about}</p>
            </div>

            {/* Experience & Expertise */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2 mb-2">
                <span role="img" aria-label="briefcase" className="text-xl">💼</span>
                <span>Experience & Expertise</span>
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                {mockDoctor.expertise.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            
            {/* Confirmation Buttons moved inside the content column */}
            <div className="mt-8 pt-4 border-t flex justify-between items-center">
                {/* Back Button */}
                <button
                    onClick={(e) => { e.preventDefault(); console.log("Going back to doctor selection."); }}
                    className="py-3 px-6 text-gray-600 font-bold text-lg rounded-xl hover:bg-gray-100 transition-all duration-200"
                >
                    Back
                </button>
                
                {/* Confirm Booking Button */}
                <button 
                    onClick={handleConfirmBooking}
                    className="py-3 px-6 bg-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-400/50 hover:bg-blue-600 transition-all duration-200"
                >
                    Confirm Booking
                </button>
            </div>
            
          </div>
          
          {/* Column 3: Calendar Selector */}
          <div className="lg:col-span-1">
            <Calendar 
              selectedDate={selectedDate} 
              onDateSelect={setSelectedDate} 
            />
          </div>
        </div>
        
        {/* Removed fixed footer and its padding div */}
      </div>
    </div>
  );
}
