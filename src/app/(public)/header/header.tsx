import React, { useState, useRef, useEffect } from 'react';
import { useModalStore } from '../../../store/useModalStore';

const Header = () => {
    const { openLoginModal } = useModalStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

  // SVG for User Icon (purely static)
  const UserIcon = () => (
    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
    </svg>
  );

  return (
    // Ensured high z-index and correct sticky position
    <header className="sticky top-0 z-50 bg-white shadow-md"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Logo/App Name */}
        <div className="text-xl font-bold text-gray-800">
          <span className="text-teal-500">Clinico</span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-8">
          <a href="#" className="text-gray-600 hover:text-teal-500 transition duration-150 font-medium">Home</a>
          <a href="#" className="text-gray-600 hover:text-teal-500 transition duration-150 font-medium">Our Story</a>
          <a href="#" className="text-gray-600 hover:text-teal-500 transition duration-150 font-medium">How To</a>
          <a href="#" className="text-gray-600 hover:text-teal-500 transition duration-150 font-medium">Help</a>
        </nav>

        {/* User Dropdown (Pure CSS interaction) */}
       <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center text-gray-700 hover:text-teal-500 cursor-pointer p-2 rounded-full transition duration-150 bg-gray-100 hover:bg-gray-200"
                    >
                        <UserIcon />
                        <span className="font-medium text-sm">User</span>
                        <svg 
                            className={`w-4 h-4 ml-1 transform transition duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>

                    {/* Dropdown Content */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
        style={{ backgroundColor: 'rgba(144, 229, 255, 0.20)' }} 
    >
                            <a href="#" className="block px-4 py-3 text-sm text-black hover:bg-teal-50 transition duration-150">Profile</a>
                            <a href="#" className="block px-4 py-3 text-sm text-black hover:bg-teal-50 transition duration-150">Help</a>
                            <a 
                                href="#" 
                                className="block px-4 py-3 text-sm text-black hover:bg-teal-50 transition duration-150 border-t border-gray-100" 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsDropdownOpen(false);
                                    openLoginModal();
                                }}
                            >
                                Login
                            </a>
                        </div>
                    )}
                </div>

      </div>
    </header>
  );
};

export default Header;
