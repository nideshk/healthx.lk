'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, Check, X } from 'lucide-react'; // Icons

// --- Data for Dropdowns and Validation ---
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const ALLERGY_OPTIONS = [
  'Pollen', 'Dust Mites', 'Peanuts', 'Penicillin', 'Latex', 'Bee Venom', 
  'Shellfish', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Cats', 'Dogs'
];
const US_STATES = ['California', 'Texas', 'New York', 'Florida', 'Illinois']; // Mock states
const CITIES = ['Los Angeles', 'Houston', 'New York City', 'Miami', 'Chicago']; // Mock cities

// --- Reusable Component for Input Fields ---
type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
  children?: React.ReactNode;
  isOptional?: boolean;
};

const FormField = ({ label, name, value, onChange, placeholder, type = 'text', children, isOptional = false }: FormFieldProps) => (
  <div className="relative">
    <label className="text-gray-600 text-sm font-semibold mb-1 block">
      {label}
      {!isOptional && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children ? children : (
      <input 
        type={type} 
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || `Enter ${label}`}
        className="w-full h-10 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-base transition-all shadow-sm text-gray-800"
      />
    )}
  </div>
);

// --- Custom Multi-Select Dropdown Component for Allergies ---
type MultiSelectProps = {
  label: string;
  name: string;
  selectedItems: string[];
  options: string[];
  onSelectChange: (name: string, items: string[]) => void;
  isOptional?: boolean;
};

const MultiSelectDropdown = ({ label, name, selectedItems, options, onSelectChange, isOptional }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItem = (item: string) => {
    const newSelection = selectedItems.includes(item)
      ? selectedItems.filter(i => i !== item)
      : [...selectedItems, item];
    onSelectChange(name, newSelection);
  };

  return (
    <div className="relative">
      <label className="text-gray-600 text-sm font-semibold mb-1 block">
        {label}
        {!isOptional && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div 
        className="w-full h-10 px-4 bg-white border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-base ${selectedItems.length > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
          {selectedItems.length > 0 ? selectedItems.join(', ') : 'Select Allergies...'}
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <input
            type="text"
            placeholder="Type to search/filter..."
            className="w-full p-2 border-b border-gray-200 sticky top-0 bg-white focus:outline-none text-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()} // Keep dropdown open when typing
          />
          {filteredOptions.map((item) => (
            <div
              key={item}
              className="px-4 py-2 hover:bg-cyan-50 flex justify-between items-center cursor-pointer text-gray-700"
              onClick={() => toggleItem(item)}
            >
              {item}
              {selectedItems.includes(item) && <Check size={16} className="text-cyan-600" />}
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div className="px-4 py-2 text-gray-500 italic">No matches found.</div>
          )}
        </div>
      )}
    </div>
  );
};


// --- Main Registration Component ---
const Registration = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    address: '',
    dob: '',
    city: '',
    gender: '',
    state: '',
    allergies: [] as string[],
    medicalConditions: '',
    medications: '',
  });
  const [error, setError] = useState('');

  // Handle changes for standard input fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle changes for multi-select dropdown
  const handleMultiSelectChange = (name: string, items: string[]) => {
    setFormData({
      ...formData,
      [name]: items,
    });
  };

  // Handle DOB input click to simulate calendar opening
  const handleDOBClick = () => {
    // In a real application, you'd open a calendar component here.
    // For this mock-up, we'll alert the user.
    alert('Calendar component would open here to select the Date of Birth.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- Validation Logic ---
    const requiredFields: (keyof typeof formData)[] = [
      'address', 'dob', 'city', 'gender', 'state', 'allergies'
    ];

    for (const field of requiredFields) {
      const value = formData[field];
      if (
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
      ) {
        // Use a clearer name for the error message
        const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return setError(`${fieldName} is required.`);
      }
    }

    // --- Submission ---
    console.log('Registration complete. Data:', formData);
    router.push('/consultation');
  };

  return (
    // ⭐ SIZING CHANGE: max-w-2xl for smaller width, reduced vertical padding on main ⭐
    <main className="min-h-[calc(100vh-10rem)] flex flex-col items-center p-4 sm:p-6 bg-gray-50">
      
      <div className="w-full max-w-2xl p-6 md:p-8 rounded-[30px] shadow-2xl bg-gradient-to-br from-cyan-100 to-white">
        
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-wide text-center mb-6">
          Patient Registration
        </h2>
        
        {/* Error Message */}
        {error && (
            <p className="text-sm font-medium text-red-600 bg-red-100 p-3 rounded-lg text-center mb-4 flex items-center justify-center">
              <X size={18} className="mr-2"/> {error}
            </p>
          )}

        <form className="space-y-4" onSubmit={handleSubmit}>          
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" >
            
            {/* Address Line 1 */}
            <FormField 
              label="Address Line 1" 
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St" 
            />
            
            {/* Date of Birth with Calendar Icon */}
            <FormField label="Date of Birth" name="dob" value={formData.dob} onChange={handleChange} placeholder="DD/MM/YYYY">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  placeholder="DD/MM/YYYY"
                  className="w-full h-10 px-4 border bg-white border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-base transition-all shadow-sm pr-10 text-gray-800"
                />
                <div 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer p-1"
                  onClick={handleDOBClick} // Mock calendar click
                >
                  <Calendar size={20} className="text-cyan-600 hover:text-cyan-700"/>
                </div>
              </div>
            </FormField>

            {/* City / Town */}
            <FormField label="City / Town" name="city" placeholder="e.g., Chicago" value={formData.city} onChange={handleChange}>
                {/* Mock Select for City */}
                 <select 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    className="w-full h-10 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-base transition-all shadow-sm text-gray-800"
                  >
                    <option value="" disabled>Select City</option>
                    {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
            </FormField>


            {/* Gender - Controlled Radio Buttons */}
            <FormField label="Gender" name="gender" value={formData.gender} onChange={handleChange}>
              <div className="flex items-center space-x-6 h-10 mt-1">
                {GENDER_OPTIONS.map((gender) => (
                  <label key={gender} className="flex items-center text-gray-700 font-normal">
                    <input 
                      type="radio" 
                      name="gender" 
                      value={gender} 
                      checked={formData.gender === gender}
                      onChange={handleChange}
                      className="form-radio h-4 w-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                    />
                    <span className="ml-2 text-gray-800 text-sm">{gender}</span>
                  </label>
                ))}
              </div>
            </FormField>
            
            {/* State / Province */}
            <FormField label="State / Province" name="state" placeholder="e.g., Texas" value={formData.state} onChange={handleChange}>
                  {/* Mock Select for State */}
                 <select 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange} 
                    className="w-full h-10 px-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-base transition-all shadow-sm text-gray-800"
                  >
                    <option value="" disabled>Select State</option>
                    {US_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
            </FormField>


            {/* Allergies - Custom Multi-Select */}
            <MultiSelectDropdown 
              label="Allergies" 
              name="allergies" 
              selectedItems={formData.allergies} 
              options={ALLERGY_OPTIONS} 
              onSelectChange={handleMultiSelectChange}
            />

            {/* Existing Medical Conditions (Optional) */}
            <FormField 
              label="Existing Medical Conditions" 
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleChange}
              placeholder="e.g., Diabetes, Asthma" 
              isOptional={true}
            />

            {/* Current Medications (Optional) */}
            <FormField 
              label="Current Medications" 
              name="medications"
              value={formData.medications}
              onChange={handleChange}
              placeholder="e.g., Insulin, Advil" 
              isOptional={true}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 text-center">
            <button 
              type="submit"
              className="px-12 py-3 bg-[#00A7D8] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:bg-[#008BB4] transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]"
            >
              Submit
            </button>
          </div>
        </form>
        
      </div>
    </main>
  );
};

export default Registration;