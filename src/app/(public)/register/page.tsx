'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

// --- Configuration ---
const PROFILE_UPDATE_API_URL = 'http://localhost:5000/api/profile/update';

// --- Data for Dropdowns ---
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// --- Initial Form Data ---
const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  gender: '',
  dob: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
};

// --- Reusable Input Component ---
type FormFieldProps = {
  label: string;
  name: keyof typeof initialFormData;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
  children?: React.ReactNode;
  error?: string;
};

const FormField = ({ label, name, value, onChange, placeholder, type = 'text', children, error }: FormFieldProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-[antiquewhite]"
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-[antiquewhite]"
        />
      )}
      {type === 'select' && (
        <ChevronDown
          size={20}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      )}
    </div>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

// --- Main Component ---
const DetailedRegistrationPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof initialFormData, string>>>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

  // --- Validation ---
  const validate = () => {
    const errors: typeof fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!formData.firstName.trim()) errors.firstName = 'First Name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last Name is required.';
    if (!formData.email.trim()) errors.email = 'Email is required.';
    else if (!emailRegex.test(formData.email)) errors.email = 'Invalid email format.';

    if (!formData.password.trim()) errors.password = 'Password is required.';
    else if (formData.password.length < 6)
      errors.password = 'Password must be at least 6 characters.';
    else if (!/[A-Z]/.test(formData.password))
      errors.password = 'Password must contain at least one uppercase letter.';
    else if (!/[0-9]/.test(formData.password))
      errors.password = 'Password must contain at least one number.';

    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = 'Passwords do not match.';

    if (!formData.dob.trim()) errors.dob = 'Date of Birth is required.';
    if (!formData.phone.trim()) errors.phone = 'Phone Number is required.';
    else if (!phoneRegex.test(formData.phone))
      errors.phone = 'Phone number must be 10 digits.';
    if (!formData.address.trim()) errors.address = 'Address is required.';
    if (!formData.city.trim()) errors.city = 'City is required.';
    if (!formData.state.trim()) errors.state = 'State is required.';
    if (!formData.zipCode.trim()) errors.zipCode = 'Zip Code is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Handle Submit with JWT Auth ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setIsLoading(true);

    // 1️⃣ Get JWT
    const token = localStorage.getItem('authToken');
    if (!token) {
      setApiError('Authentication token missing. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(PROFILE_UPDATE_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setApiError('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        throw new Error(data.message || 'Profile update failed.');
      }

      // ✅ Success
      console.log('Profile updated successfully:', data);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('API Error:', error);
      setApiError(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen py-16"
      style={{
        background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-4">
          Complete Your Profile
        </h1>
        <p className="text-lg text-gray-600 text-center mb-10">
          Please provide your details to continue securely.
        </p>

        {apiError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 md:p-12 rounded-3xl text-gray-500 shadow-2xl border border-gray-100 space-y-8"
        >
          {/* Section 1: Personal Details */}
          <h2 className="text-2xl font-bold text-cyan-700 border-b pb-2">
            1. Personal Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Enter first name" error={fieldErrors.firstName} />
            <FormField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Enter last name" error={fieldErrors.lastName} />
            <FormField label="Email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" type="email" error={fieldErrors.email} />
            <FormField label="Date of Birth" name="dob" value={formData.dob} onChange={handleChange} type="date" error={fieldErrors.dob} />
            <FormField label="Gender" name="gender" value={formData.gender} onChange={handleChange} type="select" error={fieldErrors.gender}>
              <option value="">Select Gender</option>
              {GENDER_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormField>
            <FormField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" type="tel" error={fieldErrors.phone} />
            <FormField label="Password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter password" type="password" error={fieldErrors.password} />
            <FormField label="Confirm Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" type="password" error={fieldErrors.confirmPassword} />
          </div>

          {/* Section 2: Address */}
          <h2 className="text-2xl font-bold text-cyan-700 border-b pb-2 pt-6">2. Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormField label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Enter address" error={fieldErrors.address} />
            </div>
            <FormField label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Enter city" error={fieldErrors.city} />
            <FormField label="State" name="state" value={formData.state} onChange={handleChange} placeholder="Enter state" error={fieldErrors.state} />
            <div className="md:col-span-2">
              <FormField label="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="Enter zip code" error={fieldErrors.zipCode} />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 text-center">
            <button
              type="submit"
              disabled={isLoading}
              className="px-10 py-3 text-white font-extrabold text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.99] w-full md:w-auto disabled:opacity-50"
              style={{ background: 'rgba(0, 139, 181, 0.89)' }}
            >
              {isLoading ? 'Saving...' : 'Complete Profile & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DetailedRegistrationPage;
