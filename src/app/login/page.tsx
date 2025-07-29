'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { AtSymbolIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const { signIn, resetPassword, user } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await signIn(values.email, values.password);
        toast.success('Logged in successfully!');
        router.push('/');
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.code === 'auth/invalid-credential') {
          toast.error('Invalid email or password.');
        } else {
          toast.error(error.message || 'Failed to login');
        }
      }
    },
  });

  const handleResetPassword = async () => {
    if (!formik.values.email) {
      toast.error('Please enter your email address');
      return;
    }
    try {
      setIsResetting(true);
      await resetPassword(formik.values.email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    document.body.style.background =
      'linear-gradient(135deg, #e0e7ff 0%, #fce7f3 50%, #fef9c3 100%)';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100">
      {/* Animated Blobs */}
      <div className="absolute -top-32 -left-32 z-0 h-96 w-96 rounded-full bg-pink-200 opacity-40 blur-3xl filter" />
      <div className="absolute -right-32 -bottom-32 z-0 h-96 w-96 rounded-full bg-blue-200 opacity-40 blur-3xl filter" />
      <div className="absolute top-1/2 left-1/2 z-0 h-72 w-72 rounded-full bg-yellow-100 opacity-30 blur-2xl filter" />
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
        {/* Glassmorphism Card (no gradient border) */}
        <div className="rounded-3xl bg-white/70 px-8 py-10 shadow-2xl backdrop-blur-lg">
          <h2 className="mb-2 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/signup"
              className="font-semibold text-blue-600 transition-all duration-200 hover:underline"
            >
              create a new account
            </Link>
          </p>
          <form className="space-y-6" onSubmit={formik.handleSubmit} autoComplete="off">
            <div className="space-y-5">
              {/* Email Field */}
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...formik.getFieldProps('email')}
                  className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${formik.touched.email && formik.errors.email ? 'border-red-400' : ''}`}
                  placeholder="Email address"
                />
                <label
                  htmlFor="email"
                  className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
                >
                  Email address
                </label>
                {formik.touched.email && formik.errors.email && (
                  <div className="mt-1 text-xs text-red-500">
                    {formik.errors.email}
                  </div>
                )}
              </div>
              {/* Password Field */}
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...formik.getFieldProps('password')}
                  className={`peer block w-full rounded-xl border border-gray-300 bg-transparent px-4 pt-6 pb-2 text-gray-900 placeholder-transparent transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none ${formik.touched.password && formik.errors.password ? 'border-red-400' : ''}`}
                  placeholder="Password"
                />
                <label
                  htmlFor="password"
                  className="pointer-events-none absolute top-2 left-4 text-sm text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm"
                >
                  Password
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
                {formik.touched.password && formik.errors.password && (
                  <div className="mt-1 text-xs text-red-500">
                    {formik.errors.password}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label className="flex cursor-pointer items-center text-sm text-gray-600 select-none">
                <input
                  type="checkbox"
                  className="mr-2 rounded accent-blue-500 focus:ring-2 focus:ring-blue-400"
                  checked={rememberMe}
                  onChange={() => setRememberMe((v) => !v)}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-sm font-medium text-blue-600 transition-all duration-200 hover:underline"
                disabled={isResetting}
              >
                {isResetting ? 'Sending...' : 'Forgot your password?'}
              </button>
            </div>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-3 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-pink-600 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none active:scale-95"
            >
              {formik.isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className="mt-8">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-300" />
              <span className="mx-4 text-gray-400">or</span>
              <div className="flex-grow border-t border-gray-300" />
            </div>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
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
