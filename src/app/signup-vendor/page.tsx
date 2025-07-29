'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function VendorSignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone number formatting functions
  const formatDisplayNumber = (number: string) => {
    if (number.length === 10) {
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return number;
  };

  const formatPartialNumber = (number: string) => {
    if (number.length === 0) return '';
    if (number.length <= 3) return `(${number}`;
    if (number.length <= 6) return `(${number.slice(0, 3)}) ${number.slice(3)}`;
    return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  };

  const formatPhoneForDisplay = (value: string) => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return formatDisplayNumber(cleaned);
    }
    return formatPartialNumber(cleaned);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!phone.trim() || phone.length !== 10) newErrors.phone = 'Phone number must be 10 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email, password, name, 'vendor', phone);
      toast.success('Vendor account created successfully!');
      router.push('/');
    } catch (error: any) {
      let message = 'Failed to create account';
      if (error && typeof error === 'object' && 'code' in error) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            message = 'This email is already registered. Please log in or use a different email.';
            break;
          case 'auth/invalid-email':
            message = 'The email address is invalid.';
            break;
          case 'auth/weak-password':
            message = 'Password should be at least 6 characters.';
            break;
          default:
            message = error.message || message;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.background =
      'linear-gradient(135deg, #e0e7ff 0%, #fce7f3 50%, #fef9c3 100%)';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100">
      {/* Animated Blobs */}
      <div className="animate-blob absolute -top-32 -left-32 z-0 h-96 w-96 rounded-full bg-pink-200 opacity-40 blur-3xl filter" />
      <div className="animate-blob animation-delay-2000 absolute -right-32 -bottom-32 z-0 h-96 w-96 rounded-full bg-blue-200 opacity-40 blur-3xl filter" />
      <div className="animate-blob animation-delay-4000 absolute top-1/2 left-1/2 z-0 h-72 w-72 rounded-full bg-yellow-100 opacity-30 blur-2xl filter" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          {/* Stationery SVG Illustration (placeholder) */}
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-2">
            <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6" />
            <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24" />
            <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6" />
          </svg>
          <span className="text-2xl font-extrabold tracking-tight text-gray-900">
            International Swift Marketplace
          </span>
        </div>
        <div className="rounded-3xl bg-white/70 px-8 py-10 shadow-2xl backdrop-blur-lg">
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">
            Create your vendor account
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/login"
              className="font-semibold text-blue-600 transition-all duration-200 hover:underline"
            >
              sign in to your existing account
            </Link>
          </p>
          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            {/* Name Field */}
            <div className="relative">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${errors.name ? 'border-red-400' : ''}`}
                placeholder="Name"
              />
              <label
                htmlFor="name"
                className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
              >
                Name <span className="text-red-500">*</span>
              </label>
              {errors.name && (
                <div className="animate-fade-in mt-1 text-xs text-red-500">{errors.name}</div>
              )}
            </div>
            {/* Email Field */}
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${errors.email ? 'border-red-400' : ''}`}
                placeholder="Email address"
              />
              <label
                htmlFor="email"
                className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
              >
                Email address <span className="text-red-500">*</span>
              </label>
              {errors.email && (
                <div className="animate-fade-in mt-1 text-xs text-red-500">{errors.email}</div>
              )}
            </div>
            {/* Password Field */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${errors.password ? 'border-red-400' : ''}`}
                placeholder="Password"
              />
              <label
                htmlFor="password"
                className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                tabIndex={-1}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-blue-500 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
              {errors.password && (
                <div className="animate-fade-in mt-1 text-xs text-red-500">{errors.password}</div>
              )}
            </div>
            {/* Confirm Password Field */}
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${errors.confirmPassword ? 'border-red-400' : ''}`}
                placeholder="Confirm Password"
              />
              <label
                htmlFor="confirmPassword"
                className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                tabIndex={-1}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-blue-500 focus:outline-none"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
              {errors.confirmPassword && (
                <div className="animate-fade-in mt-1 text-xs text-red-500">
                  {errors.confirmPassword}
                </div>
              )}
            </div>
            {/* Phone Field */}
            <div className="relative">
              <input
                id="phone"
                type="tel"
                value={formatPhoneForDisplay(phone)}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                }}
                className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${errors.phone ? 'border-red-400' : ''}`}
                placeholder="(123) 456-7890"
                maxLength={14}
                pattern="\(\d{3}\) \d{3}-\d{4}"
              />
              <label
                htmlFor="phone"
                className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              {errors.phone && (
                <div className="animate-fade-in mt-1 text-xs text-red-500">{errors.phone}</div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-3 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-pink-600 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none active:scale-95"
            >
              {loading ? 'Creating account...' : 'Create vendor account'}
            </button>
          </form>
        </div>
      </div>
      {/* Animate.css keyframes for blobs */}
      <style jsx global>{`
        @keyframes blob {
          0%,
          100% {
            transform: scale(1) translate(0, 0);
          }
          33% {
            transform: scale(1.1, 0.9) translate(30px, -20px);
          }
          66% {
            transform: scale(0.9, 1.1) translate(-20px, 30px);
          }
        }
        .animate-blob {
          animation: blob 8s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
