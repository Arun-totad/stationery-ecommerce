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
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 flex items-center justify-center py-12 px-4">
        <div className="relative max-w-md w-full bg-white/90 p-10 rounded-3xl shadow-2xl border border-blue-100 flex flex-col items-center animate-fade-in">
          {/* Decorative Gradient Icon */}
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg border-4 border-white">
            <CheckCircleIcon className="h-16 w-16 text-white drop-shadow-lg" />
          </span>
          {/* Gradient Accent Bar */}
          <div className="w-24 h-2 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full mb-8 mt-16 mx-auto" />
          <h1 className="text-center text-4xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow-sm">
            Order Placed Successfully!
          </h1>
          <p className="text-center text-lg md:text-xl text-gray-700 mb-4 font-medium">
            Thank you for your purchase. Your order is confirmed!
          </p>
          {orderId && (
            <p className="text-center text-base text-blue-700 font-bold mb-4">
              Order ID: <span className="font-mono">{orderId}</span>
            </p>
          )}
          <div className="mt-6 w-full space-y-4">
            <Link href="/account/orders" className="block">
              <button className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-lg hover:from-blue-600 hover:to-pink-500 transition-all">
                View Your Orders
              </button>
            </Link>
            <Link href="/products" className="block">
              <button className="w-full border border-blue-300 text-blue-700 py-3 rounded-xl text-lg font-bold bg-white hover:bg-blue-50 shadow transition-all">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 