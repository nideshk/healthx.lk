'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/authFetch';

// --- ICON ---
const StethoscopeIcon = () => (
  <svg
    className="w-12 h-12 text-blue-500 mb-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 3h3m-6-3h.01M9 15h.01M9 12h.01"
    ></path>
  </svg>
);

// --- CARD COMPONENT ---
type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: string;
};

type ConsultationCardProps = {
  service: Service;
  onCardClick: (service: Service) => void;
};

const ConsultationCard = ({ service, onCardClick }: ConsultationCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer
      flex flex-col items-center text-center border border-gray-100
      ${isHovered ? 'shadow-2xl scale-[1.02] border-blue-400' : 'hover:shadow-2xl hover:scale-[1.01]'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onCardClick(service)}
    >
      <div className="p-4 bg-blue-100 rounded-full mb-4 inline-block">
        <StethoscopeIcon />
      </div>

      <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider mb-2">
        {service.name}
      </h3>

      <p className="text-sm text-gray-500 mb-4 flex-grow">
        {service.description || 'No description provided.'}
      </p>

      <div className="text-center">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onCardClick(service);
          }}
          className="text-sm font-semibold text-blue-500 hover:text-blue-700 transition"
        >
          Select service <span className="ml-1 text-xs">→</span>
        </a>
        <div className="w-12 h-[2px] bg-blue-500 mx-auto mt-1"></div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function Consultation() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [inputTerm, setInputTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch services from your API
  useEffect(() => {
    let mounted = true;

    async function fetchServices() {
      try {
        const res = await authFetch("/api/services");

        if (!res.ok) {
          throw new Error(`Service fetch failed: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        setServices(data.services || []);
        setFilteredServices(data.services || []);
      } catch (err) {
        console.error("❌ Failed to fetch services:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchServices();

    return () => {
      mounted = false;
    };
  }, []);


  // 🔹 Filter services
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    if (!lower) {
      setFilteredServices(services);
    } else {
      setFilteredServices(
        services.filter(
          (s) =>
            s.name.toLowerCase().includes(lower) ||
            s.description.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, services]);

  // 🔹 Handle search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputTerm);
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 🔹 Handle card click
  const handleServiceSelect = (service: Service) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedConsultationService', JSON.stringify(service));
    }
    router.push(`/appointment?service_id=${service.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* HERO */}
      <div className="bg-blue-500 py-12 sm:py-16 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Healthcare at your <br />
            <span className="text-white drop-shadow-lg">Fingertips</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto">
            Connect with certified healthcare professionals from the comfort of your home.
          </p>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-lg mx-auto mt-6">
            <input
              type="text"
              placeholder="Search healthcare service"
              value={inputTerm}
              onChange={(e) => setInputTerm(e.target.value)}
              className="w-full p-3 pr-12 rounded-full text-gray-800 placeholder-gray-400 shadow-xl border-2 border-white focus:ring-4 focus:ring-blue-300 bg-white transition"
            />
            <button
              type="submit"
              className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-gray-500 hover:text-blue-600 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* SERVICES SECTION */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-extrabold text-gray-800 text-center">
          Our Healthcare Services
        </h2>
        <p className="mt-3 text-lg text-gray-600 text-center max-w-4xl mx-auto">
          Choose from our comprehensive range of medical specialties and connect with the right professional for your needs.
        </p>
      </div>

      {/* RESULTS GRID */}
      <div ref={resultsRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <p className="text-center text-gray-500 text-lg py-10">Loading services...</p>
        ) : filteredServices.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service) => (
              <ConsultationCard
                key={service.id}
                service={service}
                onCardClick={handleServiceSelect}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-xl text-gray-500 py-10">
            No services found matching "{searchTerm}".
          </p>
        )}
      </div>

      <footer className="bg-white border-t border-gray-100 p-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Clinecxa. All rights reserved.
      </footer>
    </div>
  );
}
