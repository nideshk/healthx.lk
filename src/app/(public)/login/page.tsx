'use client';

import { useState } from 'react';
import { Mail, Eye, EyeOff, X } from 'lucide-react';
import { useModalStore } from '../../../store/useModalStore';
import { useRouter } from 'next/navigation';

const API_BASE_URL = 'http://localhost:5000/api'; // ✅ Change to production API later

const LoginModal = () => {
  const { closeLoginModal } = useModalStore();
  const router = useRouter();

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Frontend Validation
  const validateInputs = () => {
    if (!loginInput.trim()) return 'Please enter your email or username.';
    if (!password.trim()) return 'Please enter your password.';
    if (password.length < 6)
      return 'Password must be at least 6 characters long.';
    if (loginInput.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput))
      return 'Please enter a valid email address.';
    return null;
  };

  // ✅ JWT Authentication Function
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginInput: loginInput.trim(),
          password: password.trim(),
        }),
        credentials: 'include', // ✅ allows backend cookies to be used
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      // ✅ Handle JWT Token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userUsername', data.user?.username || '');
      }

      // ✅ Optional Cookie (if backend sends Set-Cookie)
      console.log('JWT Auth success — token stored or cookie set.');

      setLoading(false);
      closeLoginModal();
      router.push('/consultation');
    } catch (err) {
      console.error('Login Error:', err);
      setError('Network error — unable to connect to server.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={closeLoginModal}
    >
      <div
        className="relative w-full max-w-md p-6 bg-white/80 rounded-[2rem] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
          onClick={closeLoginModal}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm text-gray-700 font-medium">
              Email / Username
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="Enter your email or username"
              className="w-full h-12 px-4 border border-gray-200 text-gray-500 rounded-lg bg-antiquewhite focus:ring-blue-400 focus:border-blue-400"
            />
          </div>

          <div className="relative">
            <label className="text-sm text-gray-700 font-medium">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-12 px-4 border border-gray-200 text-gray-500 rounded-lg bg-antiquewhite focus:ring-blue-400 focus:border-blue-400 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded-lg text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-semibold text-white rounded-lg transition-transform ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'hover:scale-[1.02]'
            }`}
            style={{
              background: 'rgba(0, 139, 181, 0.89)',
              boxShadow: '0 4px 10px rgba(0, 113, 147, 0.4)',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-700 text-sm">
          Not an existing user?{' '}
          <a
            onClick={() => {
              closeLoginModal();
              router.push('/register');
            }}
            className="text-red-500 font-bold hover:underline cursor-pointer"
          >
            Register Now!
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
