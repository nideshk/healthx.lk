import React, { JSX } from 'react';
import { useModalStore } from '../../../store/useModalStore';
import Button from '@/components/atom/Button/Button';

// --- Icon SVGs (Matching the colors and shape from the user's design image) ---

const IconWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-5 rounded-xl text-white ${className}`}>
    {children}
  </div>
);

// Easy Appointment Booking (Checklist icon)
const CheckListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

// Secure HIPAA-Compliant Platform (Shield icon)
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M12 17V12"/>
    <path d="M12 12H8"/>
    <path d="M12 12H16"/>
  </svg>
);

// Access Prescriptions & Records Anytime (User/Accessibility icon)
const AccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/>
    <path d="M12 22v-4l-3-6-2 3M12 22v-4l3-6 2 3"/>
  </svg>
);


// --- Sections ---

const HeroSection = () => {
  const { openLoginModal } = useModalStore();

  // Use the light background from the page.tsx body. Padding adjusted for better top spacing.
  return (
    <section className="relative pt-12 pb-24 md:pt-24 md:pb-30 overflow-hidden "> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pl-[50px] pr-[40px]">
        <div className="flex flex-col md:flex-row items-center justify-between ">
        
        {/* Text Content */}
        <div className="md:w-1/2 space-y-6 text-center md:text-left">
          <h1 className="text-4xl lg:text-4xl font-extrabold text-gray-900 ">
            Clinco &mdash; Secure Healthcare Access
          </h1>
          <p className="text-lg text-gray-600 max-w-lg mx-auto md:mx-0">
            Book appointments, access your records, and connect with your provider in one HIPAA-compliant app.
          </p>
          {/* <button onClick={openLoginModal} className="px-6 py-2.5 bg-cyan-600 text-white text-base font-semibold rounded-lg shadow-lg hover:bg-cyan-700 transition duration-300 transform hover:scale-[1.02] mt-4">
            Join us now
          </button> */}
          <Button onClick={openLoginModal}>Join us now</Button>
        </div>

        {/* Image/Illustration */}
        <div className="md:w-1/2 mt-12 md:mt-0 flex justify-center relative">
          {/* Blue Background Shape - Recreated to mimic the organic shape in the mockup */}
          {/* <div className="absolute w-[500px] h-[400px] bg-cyan-500 rounded-full transform -rotate-12 blur-3xl opacity-50"></div> */}
          {/* <div className="absolute w-[450px] h-[346px] bg-cyan-500 rounded-[50%_40%_30%_50%_/_30%_60%_60%_50%] transform rotate-3 scale-110 opacity-70"></div> */}

          <div className="relative z-10 rounded-lg ">
            {/* Using a placeholder that looks like the Doctor image */}
            <img 
              src="/assets/doctor2.png" 
              alt="Doctor illustration" 
              className="w-full h-full " 
             
            />
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};

const FeatureCard = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) => (
  <div className="flex flex-col items-center p-8 w-60 max-w-full text-center rounded-2xl shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 bg-[#23A4CB] border border-cyan-500/30">
    <div className="w-full text-center mb-4">
        {/* Container for the Icon and Text (Matching the Blue Style) */}
        <div className="inline-block p-4 rounded-xl shadow-lg bg-white text-cyan-500 border border-cyan-200"> 
            {icon}
        </div>
    </div>
    <p className="text-xl font-bold text-white-900 mb-1">{title}</p>
    <p className="text-white-600 text-sm">{subtitle}</p>
  </div>
);

const FeaturesSection = () => (
  <section className="pt-0 pb-20 ">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
        What we Offer !
      </h2>
      <div className="flex flex-wrap justify-center gap-8 ">
        <FeatureCard
          icon={<CheckListIcon />}
          title="Easy"
          subtitle="Appointment Booking"
        />
        <FeatureCard
          icon={<ShieldIcon />}
          title="Secure"
          subtitle="HIPAA-Compliant Platform"
        />
        <FeatureCard
          icon={<AccessIcon />}
          title="Access"
          subtitle="Prescriptions & Records Anytime"
        />
      </div>
    </div>
  </section>
);

const DemoSection = () => (
  // Ensure this section also uses white background for contrast against the page background
  <section className="py-20 "> 
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-12">
        Welcome to Clinico &mdash; Your Secure Health Portal
      </h2>

      <div className="w-full max-w-3xl mx-auto rounded-lg shadow-2xl overflow-hidden border-8 border-gray-100 transform hover:scale-[1.01] transition duration-500 ease-in-out">
        {/* Placeholder for the App Screenshot, mimicking the look in the mockup */}
        <img 
          src="/assets/mediflex.png" 
          alt="Clinco Application Dashboard" 
          className="w-full h-auto object-cover" 
        />
      </div>
    </div>
  </section>
);


// --- Main Body Component ---

const Body = () => {
  return (
    <main> 
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
    </main>
  );
};

export default Body;
