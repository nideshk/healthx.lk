'use client';

import { useState } from 'react';
import { Mail, Eye, EyeOff, X } from 'lucide-react';
import { useModalStore } from '../../../store/useModalStore';
import { useRouter } from 'next/dist/client/components/navigation';

// --- Reusable Input Component ---
type InputFieldProps = {
  label: string;
  placeholder: string;
  type?: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleVisibility?: () => void;
  style?: React.CSSProperties;
};
const InputField = ({
  label,
  placeholder,
  type = 'text',
  icon,
  value,
  onChange,
  toggleVisibility,
  style,
}: InputFieldProps) => (
  <div className="space-y-1">
    <label className="text-sm text-gray-600 font-medium">{label}</label>
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-12 px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-blue-400 focus:border-blue-400 text-gray-800 transition duration-150 pr-12"
        style={style}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {icon}
        {toggleVisibility && (
          <button
            type="button"
            onClick={toggleVisibility}
            className="ml-2 text-gray-400 hover:text-gray-600 transition"
            aria-label={type === 'password' ? 'Show password' : 'Hide password'}
          >
            {type === 'password' ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        )}
      </div>
    </div>
  </div>
);

// --- Login/Register Modal Component ---
const LoginModal = () => {
      const { closeLoginModal } = useModalStore();
          const router = useRouter(); // <-- NEW: Initialize router
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState(''); // NEW: State for displaying validation error


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
     setError('');

    if (isRegisterMode) {
      // ⭐ MODIFIED: Registration Validation ⭐
      if (!username || !email || !password || !confirmPassword) {
        return setError('All fields are required for registration.');
      }
      if (!email.includes('@')) {
        return setError('Please enter a valid email address with the "@" symbol.');
      }
      if (password !== confirmPassword) {
        return setError('Passwords do not match.');
      }

      // If validation passes:
      console.log('Registering:', { username, email, password });
      closeLoginModal();
      router.push('/register'); // Example route for registration success
    } else {
      // Login Validation (from previous request)
      const loginInput = username.trim();
      const loginPassword = password.trim();

      if (!loginInput || !loginPassword) {
        return setError('Both username/email and password are required.');
      }

      if (!loginInput.includes('@')) {
        return setError('The Email/Username field must contain an "@" symbol for email login.');
      }

      // If validation passes:
      console.log('Logging in:', { username: loginInput, password: loginPassword });
      closeLoginModal();
      router.push('/consultation'); // Route to /consultation on successful login
    }
  };

  const togglePasswordVisibility = () => setShowPassword(prev => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(prev => !prev);

  return (
    <div className="fixed p-4 inset-0 z-50 flex items-center justify-center bg-opacity-30 backdrop-blur-sm transition-opacity"       onClick={closeLoginModal} // Close when clicking overlay
    >
     
      <div
        className="w-full max-w-md mx-4 p-6 bg-white/70 backdrop-blur-md rounded-[2rem] shadow-2xl transition-transform transform scale-100 opacity-100"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(216, 246, 255, 0.89)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
     
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"           
          onClick={closeLoginModal}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <InputField
              label="Username"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<Mail size={20} className="text-gray-400" />}
              style={{ backgroundColor: 'antiquewhite' }}
            />
          )}

          {isRegisterMode && (
            <InputField
              label="Email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={20} className="text-gray-400" />}
              style={{ backgroundColor: 'antiquewhite', padding : '4px 4px 4px 4px' }}
            />
          )}

          {!isRegisterMode && (
            <InputField
              label="Email / Username"
              placeholder="Enter Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<Mail size={20} className="text-gray-400" />}
              style={{ backgroundColor: 'antiquewhite', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
            />
          )}

          <InputField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={null}
            toggleVisibility={togglePasswordVisibility}
            style={{ backgroundColor: 'antiquewhite' }}
          />

          {isRegisterMode && (
            <InputField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={null}
              toggleVisibility={toggleConfirmPasswordVisibility}
              style={{ backgroundColor: 'antiquewhite', padding : '4px 4px 4px 4px' }}
            />
          )}

           {error && (
            <p className="text-sm font-medium text-red-600 bg-red-100 p-2 rounded-lg text-center">{error}</p>
          )}

          <div className="flex flex-col space-y-4 pt-2">
            {!isRegisterMode && (
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 self-start">
                Forgot password ?
              </a>
            )}
            <button
              type="submit"
    className="px-6 py-3 text-white font-semibold rounded-lg shadow-lg transition duration-200 transform hover:scale-[1.02]"
              style={{
                  background: 'rgba(0, 139, 181, 0.89)',
        boxShadow: '0 4px 10px rgba(0, 113, 147, 0.4)'  // Adjusted rgba to match 018BB5's blue
    }}
            >
              {isRegisterMode ? 'Register' : 'Login'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-gray-700 text-sm">
          {isRegisterMode ? (
            <>
              Existing user?{' '}
              <a
                href="#"
                className="text-blue-500 font-bold hover:underline"
                onClick={() => { setIsRegisterMode(false); setError(''); }} // Clear error on mode switch
              >
                Login now
              </a>
            </>
          ) : (
            <>
              Not Existing User?{' '}
              <a
                href="#"
                className="text-red-500 font-bold hover:underline"
                onClick={() => { setIsRegisterMode(true); setError(''); }} // Clear error on mode switch
              >
                Register Now!
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default LoginModal;