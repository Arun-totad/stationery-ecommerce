'use client';

import React, { useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { MinusSmallIcon, PlusSmallIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  FaBoxOpen,
  FaDollarSign,
  FaReceipt,
  FaTrash,
  FaShoppingCart,
  FaArrowRight,
} from 'react-icons/fa';
import {
  FREE_SHIPPING_THRESHOLD,
} from '@/lib/fees';

export default function CartPage() {
  const { cartItems, loading, updateCartItemQuantity, removeFromCart, clearCart } = useCart();
  const router = useRouter();
  const { user } = useAuth();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const subtotalRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [lastChangedId, setLastChangedId] = useState<string | null>(null);

  // Animate only the changed subtotal pill
  React.useEffect(() => {
    if (lastChangedId && subtotalRefs.current[lastChangedId]) {
      const ref = subtotalRefs.current[lastChangedId];
      ref?.classList.remove('animate-scale');
      void ref?.offsetWidth;
      ref?.classList.add('animate-scale');
    }
  }, [lastChangedId]);

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please log in to proceed to checkout.');
      router.push('/login'); // Redirect to login page
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty. Add items to proceed.');
      return;
    }
    // For now, navigate to a placeholder checkout page
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <div className="container mx-auto px-4">
        <h1 className="mb-10 text-center text-4xl font-extrabold text-gray-900">
          Your Shopping Cart
          <span className="mx-auto mt-2 block h-1 w-1/2 rounded-full bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400"></span>
        </h1>
        {cartItems.length === 0 ? (
          <div className="rounded-2xl bg-white/80 p-8 text-center text-gray-600 shadow-xl backdrop-blur">
            <p className="mb-4 text-lg">Your cart is empty.</p>
            <Link href="/products">
              <button className="rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-6 py-2 font-semibold text-white shadow transition-all hover:scale-105">
                <FaShoppingCart className="mr-2 inline" /> Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Cart Items Card */}
            <div className="rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur lg:col-span-2">
              <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <FaShoppingCart className="text-blue-400" /> Items in Cart
              </h2>
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex w-full flex-col items-center gap-4 py-6 sm:flex-row"
                  >
                    <div className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-blue-100 bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 shadow">
                      {item.images && item.images.length > 0 ? (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="rounded-xl"
                        />
                      ) : (
                        <span className="flex flex-col items-center text-gray-400">
                          <FaBoxOpen className="mb-2 text-3xl" />
                          No Image
                        </span>
                      )}
                    </div>
                    <div className="ml-0 w-full flex-grow sm:ml-4">
                      <h3 className="mb-1 truncate text-lg font-bold text-gray-900">
                        <Link
                          href={`/products/${item.id}`}
                          className="transition-colors hover:text-blue-500 hover:underline"
                        >
                          {item.name}
                        </Link>
                      </h3>
                      <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row sm:justify-start sm:gap-3">
                        <div className="mb-2 flex min-w-[100px] flex-col items-center justify-center text-center sm:mb-0">
                          <span className="mb-1 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 px-2 py-0.5 text-xs font-bold text-white shadow">
                            MRP
                          </span>
                          <span className="cursor-pointer rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-lg font-bold text-indigo-700 shadow-sm transition-all duration-200 hover:border-blue-400 hover:shadow-md">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                        <span className="mb-2 text-xl font-bold text-gray-400 sm:mb-0">×</span>
                        <div className="mb-2 flex flex-row items-center gap-2 sm:mb-0">
                          <button
                            onClick={() => {
                              updateCartItemQuantity(item.id, item.quantity - 1);
                              setLastChangedId(item.id);
                            }}
                            disabled={item.quantity <= 1}
                            className="rounded-full bg-blue-100 p-2 text-blue-700 shadow hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              updateCartItemQuantity(item.id, val);
                              setLastChangedId(item.id);
                            }}
                            className="w-14 rounded-full border border-blue-200 bg-white text-center text-lg font-bold text-gray-900 shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              updateCartItemQuantity(item.id, item.quantity + 1);
                              setLastChangedId(item.id);
                            }}
                            className="rounded-full bg-blue-100 p-2 text-blue-700 shadow hover:bg-blue-200"
                          >
                            +
                          </button>
                        </div>
                        <span className="mb-2 text-xl font-bold text-gray-400 sm:mb-0">=</span>
                        <div className="mt-2 flex w-full flex-col items-center gap-2 sm:mt-0 sm:w-auto sm:flex-row sm:items-center">
                          <span
                            ref={(el) => {
                              subtotalRefs.current[item.id] = el;
                            }}
                            className={`cursor-pointer rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-xl font-extrabold text-indigo-700 shadow-sm transition-all duration-200 hover:border-blue-400 hover:shadow-md ${lastChangedId === item.id ? 'animate-scale' : ''}`}
                          >
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="rounded-full bg-red-100 p-2 text-red-600 shadow transition-all hover:bg-red-200"
                            title="Remove"
                          >
                            <FaTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={clearCart}
                  className="rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-5 py-2 font-semibold text-white shadow transition-all hover:scale-105"
                >
                  <FaTrash className="mr-2 inline" /> Clear Cart
                </button>
              </div>
            </div>
            {/* Order Summary Card */}
            <div className="h-fit rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur lg:col-span-1">
              <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <FaReceipt className="text-purple-400" /> Order Summary
              </h2>
              <div className="space-y-5">
                <div className="flex items-center justify-between text-gray-700">
                  <span className="flex items-center gap-2">
                    <FaDollarSign className="text-blue-400" /> Subtotal
                  </span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-6 py-4 text-lg font-bold text-white shadow transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <FaArrowRight /> Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
