'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

// Confetti celebration (simple canvas confetti)
const Confetti = () => {
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#FBBF24', '#F472B6', '#34D399', '#6366F1'],
      });
    });
  }, []);
  return null;
};

export default function OrderConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // In a real application, you might fetch order details based on an orderId passed via params or a successful payment callback.
    // For this basic confirmation, we'll just display a generic message.

    // You could also get order IDs from search parameters if passed from checkout
    const idFromParams = searchParams.get('orderId');
    if (idFromParams) {
      setOrderId(idFromParams);
    }

    // Optional: A small delay before redirecting home or to order history
    // const timer = setTimeout(() => {
    //   router.push('/account/orders');
    // }, 5000);
    // return () => clearTimeout(timer);
  }, [searchParams, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'admin-manager']}>
      <Confetti />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 px-4 py-12">
        <div className="animate-fade-in relative flex w-full max-w-md flex-col items-center rounded-3xl border border-blue-100 bg-white/90 p-10 shadow-2xl">
          {/* Decorative Gradient Icon */}
          <span className="absolute -top-12 left-1/2 inline-flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg">
            <CheckCircleIcon className="h-16 w-16 text-white drop-shadow-lg" />
          </span>
          {/* Gradient Accent Bar */}
          <div className="mx-auto mt-16 mb-8 h-2 w-24 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
          <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm md:text-5xl">
            Order Placed Successfully!
          </h1>
          <p className="mb-4 text-center text-lg font-medium text-gray-700 md:text-xl">
            Thank you for your purchase. Your order is confirmed!
          </p>
          {orderId && (
            <p className="mb-4 text-center text-base font-bold text-blue-700">
              Order ID: <span className="font-mono">{orderId}</span>
            </p>
          )}
          <div className="mt-6 w-full space-y-4">
            <Link href="/account/orders" className="block">
              <button className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 py-3 text-lg font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-pink-500">
                View Your Orders
              </button>
            </Link>
            <Link href="/products" className="block">
              <button className="w-full rounded-xl border border-blue-300 bg-white py-3 text-lg font-bold text-blue-700 shadow transition-all hover:bg-blue-50">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
