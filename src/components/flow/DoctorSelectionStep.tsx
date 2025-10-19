// components/flow/DoctorSelectionStep.tsx
'use client';
import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react'; 
// import { useFormContext } from 'react-hook-form'; 
import { AppointmentFormInputs, Doctor } from './AppointmentBookingFlow'; // IMPORING DOCTOR

interface DoctorSelectionStepProps {
    nextStep: () => void;
    prevStep: () => void;
    updateData: (data: Partial<AppointmentFormInputs>) => void; // New prop
    bookingData: AppointmentFormInputs; // Current data state (optional)
}

// --- Shared SVG Icons (Unchanged) ---
const DoctorAvatarIcon = () => (
    <svg 
        className="w-10 h-10 text-blue-500 mx-auto" 
        fill="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
    </svg>
);

const StarIcon = ({ size = 'w-3 h-3', color = 'text-blue-500' }: { size?: string, color?: string }) => (
    <svg className={`${size} ${color}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.049 2.927c.3-.921 1.691-.921 1.99 0l1.258 3.868a1 1 0 00.95.691h4.079c.969 0 1.371 1.24.588 1.83l-3.29 2.388a1 1 0 00-.364 1.118l1.258 3.868c.3.921-.755 1.688-1.54 1.118l-3.29-2.388a1 1 0 00-1.175 0l-3.29 2.388c-.784.57-1.838-.197-1.539-1.118l1.258-3.868a1 1 0 00-.364-1.118L2.012 9.316c-.783-.59-.38-1.83.588-1.83h4.079a1 1 0 00.95-.691l1.258-3.868z"></path>
    </svg>
);


// --- Doctor Card Component (UI unchanged) ---
interface DoctorCardProps {
    doctor: Doctor;
    onClick: (doctor: Doctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);

    const renderRating = (rating: number) => (
        <div className="flex items-center space-x-0.5">
            {[...Array(5)].map((_, i) => (
                <StarIcon key={i} color={i < Math.floor(rating) ? 'text-yellow-500' : 'text-gray-300'} />
            ))}
        </div>
    );

    return (
        <div
            className={`
                bg-white p-4 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer 
                flex flex-col h-full border border-gray-100
                ${isHovered ? 'shadow-2xl scale-[1.02] border-blue-400' : 'hover:shadow-2xl hover:scale-[1.01]'}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-start mb-3 space-x-3">
                <div className="p-1 bg-blue-100 rounded-full flex-shrink-0">
                    <DoctorAvatarIcon />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 leading-snug">
                        {doctor.name}
                    </h3>
                    <p className="text-xs font-semibold text-green-500 mt-1">
                        Verified
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs flex-grow mb-3 border-b pb-3">
                
                <div className="font-medium text-gray-500">Registration:</div>
                <div className="text-right text-gray-700 font-medium">{doctor.registration}</div>
                
                <div className="font-medium text-gray-500">Fee:</div>
                <div className="text-right text-gray-700 font-bold">
                    {doctor.currency} {doctor.fee.toLocaleString()}
                </div>

                <div className="font-medium text-gray-500">Advice:</div>
                <div className="text-right text-blue-500 font-bold">{doctor.rating.advice.toFixed(1)}</div>

                <div className="font-medium text-gray-500">Punctuality:</div>
                <div className="text-right text-blue-500 font-bold">{doctor.rating.punctuality.toFixed(1)}</div>
            </div>

            <div className="pt-2 flex justify-between items-center">
                <div className="font-bold text-gray-800 text-sm">Overall Rating:</div>
                <div className="flex items-center space-x-1">
                    <div className="flex items-center space-x-0.5">
                        {renderRating(doctor.rating.overall)}
                    </div>
                    <span className="text-base font-extrabold text-blue-500">
                        {doctor.rating.overall.toFixed(1)}
                    </span>
                </div>
            </div>
            
            <button 
                onClick={() => onClick(doctor)} 
                className="w-full py-2 mt-4 bg-blue-500 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-400/50 hover:bg-blue-600 transition-all duration-200"
            >
                Select Doctor →
            </button>
        </div>
    );
};


// --- Refactored Main Doctor Selection Component ---

interface DoctorSelectionStepProps {
    nextStep: () => void;
    prevStep: () => void;
}

export default function DoctorSelectionStep({ nextStep, prevStep,updateData,bookingData }: DoctorSelectionStepProps) {
    // const { setValue } = useFormContext<AppointmentFormInputs>();
    
    // --- Load More State (Unchanged) ---
    const INITIAL_RECORDS = 9;
    const [visibleCount, setVisibleCount] = useState(INITIAL_RECORDS);

    // --- NEW: Function to handle doctor selection, store data, and move step ---
    const handleSelectDoctor = (doctor: Doctor) => {
       updateData({ selectedDoctor: doctor });
        
        // 2. Move to the next component (Book Appointment)
        nextStep();
    };
    
    // TEMPORARY MOCK DATA (15 records - Unchanged)
    const allDoctors: Doctor[] = useMemo(() => [
        { name: "Kumari Silva", registration: "SLMC-GP-2018-0156", fee: 3500, currency: "LKR", rating: { advice: 4.8, punctuality: 4.8, overall: 4.8 } },
        { name: "Kamal Perera", registration: "SLMC-GP-2019-0210", fee: 4000, currency: "LKR", rating: { advice: 4.9, punctuality: 4.7, overall: 4.8 } },
        { name: "Ranjith De Silva", registration: "SLMC-GP-2017-0099", fee: 3200, currency: "LKR", rating: { advice: 4.6, punctuality: 4.9, overall: 4.7 } },
        { name: "Anusha Fernando", registration: "SLMC-GP-2020-0301", fee: 3750, currency: "LKR", rating: { advice: 4.7, punctuality: 4.6, overall: 4.6 } },
        { name: "Suresh Mani", registration: "SLMC-GP-2016-0045", fee: 3600, currency: "LKR", rating: { advice: 4.9, punctuality: 4.8, overall: 4.9 } },
        { name: "Lakshmi Dias", registration: "SLMC-GP-2021-0407", fee: 3400, currency: "LKR", rating: { advice: 4.5, punctuality: 4.7, overall: 4.6 } },
        { name: "Pradeep Samara", registration: "SLMC-GP-2015-0012", fee: 4100, currency: "LKR", rating: { advice: 4.9, punctuality: 4.9, overall: 4.9 } },
        { name: "Nisha Vidanage", registration: "SLMC-GP-2022-0505", fee: 3300, currency: "LKR", rating: { advice: 4.6, punctuality: 4.8, overall: 4.7 } },
        { name: "Tharindu Bandara", registration: "SLMC-GP-2017-0088", fee: 3800, currency: "LKR", rating: { advice: 4.8, punctuality: 4.5, overall: 4.6 } },
        // Remaining records to be loaded
        { name: "Dilrukshi Kula", registration: "SLMC-GP-2019-0250", fee: 3950, currency: "LKR", rating: { advice: 4.7, punctuality: 4.7, overall: 4.7 } },
        { name: "Mohan Rajan", registration: "SLMC-GP-2018-0199", fee: 3650, currency: "LKR", rating: { advice: 4.5, punctuality: 4.6, overall: 4.5 } },
        { name: "Sajith Prema", registration: "SLMC-GP-2020-0330", fee: 4200, currency: "LKR", rating: { advice: 4.9, punctuality: 4.6, overall: 4.8 } },
        { name: "Gayathri Hettiar", registration: "SLMC-GP-2016-0060", fee: 3100, currency: "LKR", rating: { advice: 4.7, punctuality: 4.8, overall: 4.7 } },
        { name: "Isuru Liyanage", registration: "SLMC-GP-2021-0420", fee: 3700, currency: "LKR", rating: { advice: 4.8, punctuality: 4.7, overall: 4.7 } },
        { name: "Kavindi Senadeera", registration: "SLMC-GP-2015-0005", fee: 3900, currency: "LKR", rating: { advice: 4.6, punctuality: 4.9, overall: 4.7 } },
    ], []);

    const doctorsToDisplay = useMemo(() => {
        return allDoctors.slice(0, visibleCount);
    }, [allDoctors, visibleCount]);

    const hasMoreDoctors = visibleCount < allDoctors.length;

    const handleLoadMore = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setVisibleCount(allDoctors.length);
    };

    const remainingCount = allDoctors.length - visibleCount;

    return (
        <div className="min-h-screen bg-blue-50 font-sans">
            
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"> 
                
                {/* Header Section */}
                <div className="flex flex-col items-center mb-6 pt-2">
                    <div className='w-full flex justify-start mb-4'>
                        {/* Back button uses prevStep from props */}
                        <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); prevStep(); }} 
                            className="text-gray-600 hover:text-gray-800 transition font-medium text-base flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            <span>Back</span>
                        </button>
                    </div>
                    
                    <h1 className="text-3xl font-extrabold text-gray-900 leading-snug">
                        {bookingData.selectedServiceTitle} 
                    </h1>
                    <p className="mt-1 text-lg text-gray-600">
                        Select a doctor for your individual appointment
                    </p>
                </div>
                
                {/* Sort and Count Bar (Unchanged UI) */}
                <div className="flex items-center justify-start space-x-4 mb-8 pt-2">
                    <span className="text-base font-bold text-gray-800">Sort by :</span>
                    
                    <select 
                        className="p-1.5 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white pr-6 text-gray-700 text-sm font-medium"
                    >
                        <option>Rating</option>
                        <option>Fee (Low to High)</option>
                        <option>Fee (High to Low)</option>
                        <option>Punctuality</option>
                    </select>
                    
                    <span className="text-base text-gray-600">
                        {allDoctors.length} doctors available
                    </span>
                </div>

                {/* Doctor Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> 
                    {doctorsToDisplay.map((doctor) => (
                        <DoctorCard 
                            key={doctor.registration}
                            doctor={doctor}
                            onClick={handleSelectDoctor} // Calls the function to save data and go next
                        />
                    ))}
                </div>

                {/* --- Load More Link (Unchanged UI) --- */}
                {hasMoreDoctors && (
                    <div className="mt-8 flex justify-center">
                        <a
                            href="#"
                            onClick={handleLoadMore}
                            className="flex items-center space-x-2 text-lg font-semibold text-blue-600 hover:text-blue-800 transition duration-150 border-b-2 border-blue-200 hover:border-blue-500 pb-1"
                        >
                            <ChevronDown className="w-5 h-5" />
                            <span>Load {remainingCount} More Doctors</span>
                        </a>
                    </div>
                )}

                {!hasMoreDoctors && allDoctors.length > INITIAL_RECORDS && (
                    <div className="mt-8 text-center text-gray-500 font-medium text-base pb-8">
                        You've seen all {allDoctors.length} available doctors.
                    </div>
                )}
            </div>
        </div>
    );
}