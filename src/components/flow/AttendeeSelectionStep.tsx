// components/flow/AttendeeSelectionStep.tsx
'use client';
import React, { useState } from 'react';
import { Minus, Plus, Users, User, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; 
// import { useFormContext } from 'react-hook-form'; 
import { AppointmentFormInputs } from './AppointmentBookingFlow'; 

const IconStyle = "w-8 h-8 text-blue-500";
const PatientIcon = () => (<User className={IconStyle} />);
const FamilyGroupIcon = () => (<Users className={IconStyle} />);

// --- AttendeeCardProps unchanged ---
type AttendeeCardProps = {
    icon: React.ComponentType<{ className: string }>;
    title: string;
    description:string,
    onCardClick: (count: number) => void;
};
interface AttendeeSelectionStepProps {
    nextStep: () => void;
    prevStep: () => void;
    updateData: (data: Partial<AppointmentFormInputs>) => void; // New prop
}

const PatientCard = ({ icon: Icon, title, description,onCardClick }: AttendeeCardProps) => {
    // ... (UI logic unchanged)
    const [isHovered, setIsHovered] = useState(false);

    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCardClick(1);
    }

    return (
        <div 
            className={`
                bg-white p-4 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer 
                flex flex-col items-center text-center justify-between h-full min-h-[300px] 
                ${isHovered ? 'shadow-2xl scale-[1.02] border-3 border-blue-400' : 'hover:shadow-2xl border-3 border-transparent'}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onCardClick(1)}
        >
            <div className='w-full'>
                <div className="p-3 bg-blue-100 rounded-full mx-auto w-fit mb-4">
                    <Icon className={IconStyle} />
                </div>
                
                <h3 className="text-base text-gray-800 font-medium mb-6">
                    {title}
                </h3>
                 <h4 className="text-base text-gray-800 font-small mb-6">
                    {description}
                </h4>
            </div>
            
            <button 
                className="w-full py-2 text-white font-bold text-base rounded-lg transition-all duration-200"
                style={{
                    background: 'linear-gradient(to right, #4C84F3, #3A73E6)',
                    boxShadow: '0 3px 10px 0 rgba(0, 115, 255, 0.3)'
                }}
                onClick={handleButtonClick}
            >
                Select
            </button>
        </div>
    );
};


const FamilyMemberCounterCard = ({ onSelectAttendees }: { onSelectAttendees: (count: number) => void }) => {
    // ... (UI logic unchanged)
    const [additionalMembers, setAdditionalMembers] = useState(1);
    const [isHovered, setIsHovered] = useState(false);
    const maxAdditional = 3;

    const totalAttendees = 1 + additionalMembers;

    const increment = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (additionalMembers < maxAdditional) {
            setAdditionalMembers(additionalMembers + 1);
        }
    };

    const decrement = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (additionalMembers > 1) {
            setAdditionalMembers(additionalMembers - 1);
        }
    };
    
    const resetCount = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAdditionalMembers(1);
    };

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectAttendees(totalAttendees);
    };

    return (
        <div 
            className={`
                bg-white p-4 rounded-2xl shadow-xl transition-all duration-300 h-full min-h-[300px]
                flex flex-col items-center text-center justify-between
                ${isHovered ? 'shadow-2xl scale-[1.02] border-3 border-blue-400' : 'hover:shadow-2xl border-3 border-transparent'}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className='w-full'>
                <div className="p-3 bg-blue-100 rounded-full mx-auto w-fit mb-4">
                    <FamilyGroupIcon />
                </div>
                
                <h3 className="text-base text-gray-800 font-medium mb-2">
                    Additional family member with patient
                </h3>
                
                <p className='text-xs text-gray-500 mb-4'>
                    Total Attendees: <span className='font-bold text-blue-600'>{totalAttendees}</span> (1 patient + {additionalMembers} additional)
                </p>

                <div className='flex items-center justify-center w-full max-w-[180px] mx-auto mb-6 space-x-2'>
                    
                    <button 
                        onClick={decrement}
                        disabled={additionalMembers <= 1}
                        className={`p-1 rounded-full transition duration-150 ${additionalMembers <= 1 ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-blue-500 bg-blue-50 hover:bg-blue-100'}`}
                        title='Decrease additional members'
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    
                    <span className="text-lg font-extrabold text-gray-900 px-3 py-0.5 border-2 border-blue-500 rounded-lg">
                        {additionalMembers}
                    </span>

                    <button 
                        onClick={increment}
                        disabled={additionalMembers >= maxAdditional}
                        className={`p-1 rounded-full transition duration-150 ${additionalMembers >= maxAdditional ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-blue-500 bg-blue-50 hover:bg-blue-100'}`}
                        title='Increase additional members'
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={resetCount}
                        className="p-1 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition duration-150 ml-2"
                        title="Reset additional members to 1"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <button 
                onClick={handleSelect}
                className="w-full py-2 text-white font-bold text-base rounded-lg transition-all duration-200 mt-auto"
                style={{
                    background: 'linear-gradient(to right, #4C84F3, #3A73E6)',
                    boxShadow: '0 3px 10px 0 rgba(0, 115, 255, 0.3)'
                }}
            >
                Select
            </button>
        </div>
    );
};


// --- Refactored Main Component ---


export default function AttendeeSelectionStep({ nextStep,prevStep, updateData }: AttendeeSelectionStepProps) {
    const router = useRouter(); 
    // Get RHF functions from context
    // const { setValue } = useFormContext<AppointmentFormInputs>(); 
    
    // const [selectedCount, setSelectedCount] = useState(0);
    
    const CONSULTATION_PATH = '/consultation'; // Path to exit the flow

    const handleSelectAttendees = (count: number) => {
    // 1. Store the selected attendee count
        updateData({ attendeeCount: count });
        
        // 2. Move to the next component (Doctor Selection)
        nextStep();
    };

    const handleGoBack = (e: React.MouseEvent) => {
        // e.preventDefault();
        // // Since this is the first step, going 'back' means exiting the flow to /consultation
         router.push(CONSULTATION_PATH); 
        prevStep();
    };

    return (
        <div className="h-screen bg-gradient-to-br from-cyan-50 to-blue-50 font-sans flex flex-col items-center justify-between py-8 px-4 overflow-auto"> 
            
            <div className="flex flex-col items-center w-full max-w-4xl">
                
                <div className="max-w-xl mx-auto px-2 text-center mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 ">
                        Select the number of attendees for your appointment
                    </h1>
                    <p className="mt-2 text-sm md:text-base text-gray-600">
                        Choose whether you'll attend individually or with one family member.
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                        (Appointment costs may vary depending on the number of participants.)
                    </p>
                </div>
                
                {/* {selectedCount > 0 && (
                    <div className="fixed top-0 left-0 right-0 z-50 flex items-center bg-green-50 border-b-4 border-green-500 text-green-800 p-4 justify-center shadow-lg transition-all duration-300">
                        <p className="font-medium flex items-center text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Selected: <strong className='text-green-900 ml-1'>{selectedCount} Total Attendee(s)</strong>. Moving to <strong className='text-green-900 ml-1'>Doctor Selection</strong>...
                        </p>
                    </div>
                )} */}

                <div className="w-full px-2">
                    <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-6">
                        
                        <div className="w-full md:w-1/2">
                            <PatientCard
                                icon={PatientIcon}
                                title="Only the patient"
                                description="This option is for a single consultation, focusing entirely on the patient's needs."
                                onCardClick={handleSelectAttendees}
                            />
                        </div>

                        <div className="w-full md:w-1/2">
                            <FamilyMemberCounterCard
                                onSelectAttendees={handleSelectAttendees}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-8">
                <button 
                    onClick={handleGoBack}
                    className="flex items-center text-gray-600 hover:text-blue-500 transition text-sm font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to service
                </button>
            </div>
        </div>
    );
}