'use client';

import React, { useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { MinusSmallIcon, PlusSmallIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FaBoxOpen, FaRupeeSign, FaShippingFast, FaReceipt, FaTrash, FaShoppingCart, FaArrowRight } from 'react-icons/fa';
import { calculateDeliveryFee, FREE_SHIPPING_THRESHOLD, calculateServiceFee, DELIVERY_FEE } from '@/lib/fees';

export default function CartPage() {
  const { cartItems, loading, updateCartItemQuantity, removeFromCart, clearCart } = useCart();
  const router = useRouter();
  const { user } = useAuth();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = calculateDeliveryFee(subtotal);
  const freeShippingThreshold = FREE_SHIPPING_THRESHOLD;
  const serviceFee = calculateServiceFee(subtotal);
  const orderTotal = subtotal + shipping + serviceFee;

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
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-gray-700">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-10 text-center">
          Your Shopping Cart
          <span className="block h-1 w-1/2 mx-auto bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400 rounded-full mt-2"></span>
        </h1>
        {cartItems.length === 0 ? (
          <div className="text-center text-gray-600 p-8 bg-white/80 backdrop-blur rounded-2xl shadow-xl">
            <p className="text-lg mb-4">Your cart is empty.</p>
            <Link href="/products">
              <button className="bg-gradient-to-r from-blue-400 to-pink-400 text-white py-2 px-6 rounded-full font-semibold shadow hover:scale-105 transition-all">
                <FaShoppingCart className="inline mr-2" /> Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Cart Items Card */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <FaShoppingCart className="text-blue-400" /> Items in Cart
              </h2>
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-center py-6 gap-4 w-full">
                    <div className="flex-shrink-0 w-32 h-32 relative rounded-xl overflow-hidden border-2 border-blue-100 shadow bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 flex items-center justify-center">
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
                          <FaBoxOpen className="text-3xl mb-2" />
                          No Image
                        </span>
                      )}
                    </div>
                    <div className="ml-0 sm:ml-4 flex-grow w-full">
                      <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
                        <Link href={`/products/${item.id}`} className="hover:underline hover:text-blue-500 transition-colors">
                          {item.name}
                        </Link>
                      </h3>
                      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full justify-between sm:justify-start">
                        <div className="flex flex-col items-center justify-center min-w-[100px] text-center mb-2 sm:mb-0">
                          <span className="mb-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 text-white text-xs font-bold shadow">MRP</span>
                          <span className="px-5 py-2 rounded-full bg-blue-50 text-indigo-700 font-bold text-lg border border-blue-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-400 cursor-pointer">
                            ₹{item.price.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-gray-400 text-xl font-bold mb-2 sm:mb-0">×</span>
                        <div className="flex flex-row items-center gap-2 mb-2 sm:mb-0">
                          <button
                            onClick={() => {
                              updateCartItemQuantity(item.id, item.quantity - 1);
                              setLastChangedId(item.id);
                            }}
                            disabled={item.quantity <= 1}
                            className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              updateCartItemQuantity(item.id, val);
                              setLastChangedId(item.id);
                            }}
                            className="w-14 text-center text-gray-900 font-bold text-lg rounded-full border border-blue-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
                          />
                          <button
                            onClick={() => {
                              updateCartItemQuantity(item.id, item.quantity + 1);
                              setLastChangedId(item.id);
                            }}
                            className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 shadow"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-gray-400 text-xl font-bold mb-2 sm:mb-0">=</span>
                        <div className="w-full flex flex-col items-center sm:w-auto sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                          <span
                            ref={el => { subtotalRefs.current[item.id] = el; }}
                            className={`px-5 py-2 rounded-full bg-blue-50 text-indigo-700 font-extrabold text-xl border border-blue-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-400 cursor-pointer ${lastChangedId === item.id ? 'animate-scale' : ''}`}
                          >
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 shadow transition-all"
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
              {/* Subtotal at the right end of cart items card */}
              <div className="flex justify-end mt-6">
                <div className="text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-100 to-pink-100 px-6 py-3 rounded-full shadow">
                  Subtotal: <span className="text-indigo-600">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={clearCart}
                  className="px-5 py-2 bg-gradient-to-r from-blue-400 to-pink-400 text-white rounded-full font-semibold shadow hover:scale-105 transition-all"
                >
                  <FaTrash className="inline mr-2" /> Clear Cart
                </button>
              </div>
            </div>
            {/* Order Summary Card */}
            <div className="lg:col-span-1 bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 h-fit">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <FaReceipt className="text-purple-400" /> Order Summary
              </h2>
              <div className="space-y-5">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="flex items-center gap-2"><FaRupeeSign className="text-blue-400" /> Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-700 font-semibold mt-2">
                  <span className="flex items-center gap-2">
                    <FaShippingFast className="text-pink-400" /> Delivery Fee
                  </span>
                  <span className="flex flex-col items-end">
                    <span className={subtotal >= freeShippingThreshold ? "text-green-600 font-extrabold text-xl" : "text-blue-600 font-bold text-lg"}>
                      ₹{subtotal >= freeShippingThreshold ? "0.00" : shipping.toFixed(2)}
                    </span>
                    {subtotal >= freeShippingThreshold && (
                      <span className="flex items-center gap-1 mt-0.5">
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold text-xs shadow border border-green-300 select-none" style={{letterSpacing: '2px'}}>FREE</span>
                        <span className="text-red-600 font-bold text-sm">-₹{DELIVERY_FEE.toFixed(2)}</span>
                      </span>
                    )}
                  </span>
                </div>
                {subtotal < freeShippingThreshold && (
                  <div className="flex items-center w-full px-4 py-2 rounded-full shadow bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 border border-blue-100 animate-fade-in overflow-hidden whitespace-nowrap mt-2 mb-2">
                    <span className="font-extrabold text-green-600 text-lg md:text-xl leading-tight mr-1 animate-bounce">
                      ₹{(freeShippingThreshold - subtotal).toFixed(0)}
                    </span>
                    <span className="font-medium text-base md:text-lg text-gray-500 align-middle ml-1" style={{ fontWeight: 500 }}>
                      away from <span className="text-green-600 font-bold">FREE delivery!</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-700 mt-2">
                  <span className="flex items-center gap-2"><FaReceipt className="text-purple-400" /> Service Fee <span className="ml-2 text-xs text-gray-500">(2% of subtotal)</span></span>
                  <span>₹{serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-5 flex justify-between items-center text-gray-900 font-extrabold text-2xl">
                  <span>Order Total</span>
                  <span>₹{orderTotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-blue-400 to-pink-400 text-white py-4 px-6 rounded-full text-lg font-bold shadow hover:scale-105 hover:shadow-lg transition-all duration-200 mt-8 flex items-center justify-center gap-2"
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