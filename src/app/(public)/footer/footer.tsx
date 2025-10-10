import React from 'react';

// Define the links for the left column, starting with 'About Us'
const mainLinks = [
  { name: 'About Us', href: '/about' },
  { name: 'Contact Support', href: '/contact' },
  { name: 'Help Center & FAQs', href: '/help' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Privacy Policy (HIPAA Compliant)', href: '/privacy' },
  
];

const companyName = 'Clinco';
const currentYear = 2025; // Using the year you specified

// Placeholder SVG component for the logo
const ClincoLogo = () => (
    <svg 
        className="w-8 h-8 text-cyan-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Simple medical cross/plus for a clinical look */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
    </svg>
);


const Footer = () => {
  return (
    // Minimal vertical padding and professional dark background
    <footer className="py-6 bg-gray-900 text-white border-t border-cyan-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Row: Left (Links) and Right (Branding/Trust/Disclaimer) */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-4 border-b border-gray-700">
          
          {/* Left Column: Links (Left-aligned) */}
          <div className="flex-1 text-left w-full md:w-auto">
            {/* Added "Links" Heading */}
            <h3 className="text-lg font-semibold text-white mb-2">Links</h3> 
            <ul className="space-y-1 text-sm">
              {mainLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-cyan-500 transition duration-150"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Right Column: Branding, Emergency, Compliance, Disclaimer (Right-aligned) */}
          <div className="flex-1 flex flex-col items-start md:items-end space-y-2 text-right w-full md:w-auto pt-2 md:pt-0">
            
            {/* Logo and Emergency Notice */}
            <div className="flex items-center space-x-3">
            
                <ClincoLogo />
            </div>

            {/* Trust Signal */}
            <p className="text-xs text-green-400 flex items-center md:justify-end">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                Secure & HIPAA Compliant Platform
            </p>
            
            {/* Disclaimer */}
            <p className="text-xs text-gray-500 max-w-md text-left md:text-right">
              <span className="font-medium">Disclaimer:</span> This service is for informational/scheduling purposes only and is not a substitute for professional medical advice.
            </p>
          </div>
        </div>

        {/* Bottom Row: Copyright (Centered) */}
        <div className="pt-3 text-center">
          <div className="text-sm font-light text-gray-400">
            &copy; {currentYear} {companyName}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;