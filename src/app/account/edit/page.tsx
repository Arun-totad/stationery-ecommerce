'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Address, Vendor } from '@/types';
import { useRouter } from 'next/navigation';
import { UserCircleIcon, MapPinIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';

const AccountEditPage = () => {
  const { user, refreshUserData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<User>({
    uid: '',
    email: '',
    displayName: '',
    phoneNumber: null,
    addresses: [
      {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
    ],
    role: 'customer', // Default role
    createdAt: new Date(), // Initialize createdAt
    updatedAt: new Date(), // Initialize updatedAt
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addressFieldErrors, setAddressFieldErrors] = useState<{
    [addressIdx: number]: { [field: string]: string };
  }>({});
  const [addresses, setAddresses] = useState<Address[]>([
    {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (authLoading) return; // Wait for auth to finish loading
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            setFormData({
              ...userData,
              phoneNumber: userData.phoneNumber || null,
              addresses:
                userData.addresses && userData.addresses.length > 0
                  ? userData.addresses
                  : [
                      {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: '',
                      },
                    ],
            });
            setAddresses(
              userData.addresses && userData.addresses.length > 0
                ? userData.addresses
                : [
                    {
                      street: '',
                      city: '',
                      state: '',
                      zipCode: '',
                      country: '',
                    },
                  ]
            );
          } else {
            setFormData((prev) => ({
              ...prev,
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              phoneNumber: prev.phoneNumber || null,
              addresses:
                prev.addresses && prev.addresses.length > 0
                  ? prev.addresses
                  : [
                      {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: '',
                      },
                    ],
              role: prev.role || 'customer',
              createdAt: prev.createdAt || new Date(),
              updatedAt: prev.updatedAt || new Date(),
            }));
            setAddresses([
              {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
              },
            ]);
          }
        } catch (err: any) {
          setError('Failed to load user data: ' + err.message);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading && !user) {
        setLoading(false);
        router.push('/login');
      }
    };
    fetchUserData();
  }, [user, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddresses((prev) =>
      prev.map((addr, i) =>
        i === idx
          ? {
              ...addr,
              [name]: name === 'zipCode' ? value.replace(/[^0-9]/g, '').slice(0, 5) : value,
            }
          : addr
      )
    );
  };

  const handleAddAddress = () => {
    setAddresses((prev) => [
      ...prev,
      { street: '', city: '', state: '', zipCode: '', country: '' },
    ]);
  };

  const handleRemoveAddress = (idx: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
  };

  const getUpdateData = () => {
    let finalPhoneNumber: string | null = null;
    if (typeof formData.phoneNumber === 'string' && formData.phoneNumber !== '') {
      finalPhoneNumber = formData.phoneNumber;
    } else if (formData.phoneNumber === null) {
      finalPhoneNumber = null;
    }
    const updateData: any = {
      displayName: formData.displayName,
      phoneNumber: finalPhoneNumber,
      addresses: addresses.map((addr) => ({
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        zipCode: addr.zipCode || '',
        country: addr.country || '',
      })),
      updatedAt: new Date(),
    };
    if (user?.role === 'vendor') {
      updateData.shopName = formData.displayName;
    }
    return updateData;
  };

  const validateForm = () => {
    const errors: { [addressIdx: number]: { [field: string]: string } } = {};
    let hasError = false;
    if (!formData.displayName.trim()) {
      hasError = true;
    }
    if (!formData.phoneNumber || !/^\+?\d{10,15}$/.test(formData.phoneNumber)) {
      hasError = true;
    }
    addresses.forEach((address, idx) => {
      errors[idx] = {};
      if (!address.street.trim()) {
        errors[idx].street = 'Street is required';
        hasError = true;
      }
      if (!address.city.trim()) {
        errors[idx].city = 'City is required';
        hasError = true;
      }
      if (!address.state.trim()) {
        errors[idx].state = 'State is required';
        hasError = true;
      }
      if (!address.country.trim()) {
        errors[idx].country = 'Country is required';
        hasError = true;
      }
      if (!/^[0-9]{5}$/.test(address.zipCode)) {
        errors[idx].zipCode = 'Zip Code must be exactly 5 digits';
        hasError = true;
      }
    });
    setAddressFieldErrors(errors);
    return hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    const hasError = validateForm();
    if (hasError) {
      return;
    }

    if (!user) {
      setError('You must be logged in to update your profile.');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      // Log the current Firestore user document for debugging
      const userDocSnap = await getDoc(userDocRef);
      console.log('Current Firestore user document:', userDocSnap.data());
      // Log the update payload for debugging
      const updateData = getUpdateData();
      console.log('Firestore update payload:', updateData);
      await updateDoc(userDocRef, updateData);
      await refreshUserData();
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError('Failed to update profile: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error && !user) {
    // Only show error if no user and it's a critical error
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100">
      {/* Animated Blobs */}
      <div className="animate-blob absolute -top-32 -left-32 z-0 h-96 w-96 rounded-full bg-pink-200 opacity-40 blur-3xl filter" />
      <div className="animate-blob animation-delay-2000 absolute -right-32 -bottom-32 z-0 h-96 w-96 rounded-full bg-blue-200 opacity-40 blur-3xl filter" />
      <div className="animate-blob animation-delay-4000 absolute top-1/2 left-1/2 z-0 h-72 w-72 rounded-full bg-yellow-100 opacity-30 blur-2xl filter" />
      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-3xl bg-white/70 px-8 py-10 shadow-2xl backdrop-blur-lg">
          <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-gray-900">
            Edit My Account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
              <UserCircleIcon className="h-6 w-6 text-blue-400" /> Profile Information
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  value={formData.displayName}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="mt-1 block w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-4 py-2 text-base text-gray-500 shadow-sm"
                  value={formData.email}
                  disabled
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  value={formData.phoneNumber || ''}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="my-6 border-b border-gray-200"></div>

            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
              <MapPinIcon className="h-6 w-6 text-blue-400" /> Address Information
            </h2>
            <button
              type="button"
              onClick={handleAddAddress}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-base font-bold text-blue-700 shadow transition-all hover:bg-blue-200"
            >
              <PlusIcon className="h-5 w-5" /> Add Address
            </button>
            {addresses.map((address, idx) => (
              <div
                key={idx}
                className="relative mb-4 grid grid-cols-1 gap-6 rounded-xl border bg-white/60 p-4 md:grid-cols-2"
              >
                {addresses.length > 1 && (
                  <div className="absolute -top-4 -right-4 z-20">
                    <button
                      type="button"
                      onClick={() => handleRemoveAddress(idx)}
                      className="group flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-red-500 shadow-xl transition-all duration-150 hover:bg-red-600 focus:ring-2 focus:ring-red-400 focus:outline-none"
                      title="Remove Address"
                      aria-label="Remove Address"
                    >
                      <TrashIcon className="h-7 w-7 text-white" />
                      <span className="pointer-events-none absolute top-14 right-1/2 translate-x-1/2 rounded bg-black px-3 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                        Remove Address
                      </span>
                    </button>
                  </div>
                )}
                <div>
                  <label
                    htmlFor={`street-${idx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Street
                  </label>
                  <input
                    type="text"
                    id={`street-${idx}`}
                    name="street"
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={address.street}
                    onChange={(e) => handleAddressChange(idx, e)}
                    autoComplete="street-address"
                  />
                  {addressFieldErrors[idx]?.street && (
                    <p className="mt-1 text-xs text-red-500">{addressFieldErrors[idx].street}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`city-${idx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    City
                  </label>
                  <input
                    type="text"
                    id={`city-${idx}`}
                    name="city"
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={address.city}
                    onChange={(e) => handleAddressChange(idx, e)}
                    autoComplete="address-level2"
                  />
                  {addressFieldErrors[idx]?.city && (
                    <p className="mt-1 text-xs text-red-500">{addressFieldErrors[idx].city}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`state-${idx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    State
                  </label>
                  <input
                    type="text"
                    id={`state-${idx}`}
                    name="state"
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={address.state}
                    onChange={(e) => handleAddressChange(idx, e)}
                    autoComplete="address-level1"
                  />
                  {addressFieldErrors[idx]?.state && (
                    <p className="mt-1 text-xs text-red-500">{addressFieldErrors[idx].state}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`zipCode-${idx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Zip Code
                  </label>
                  <input
                    type="text"
                    id={`zipCode-${idx}`}
                    name="zipCode"
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={address.zipCode}
                    onChange={(e) => handleAddressChange(idx, e)}
                    autoComplete="postal-code"
                    maxLength={5}
                  />
                  {addressFieldErrors[idx]?.zipCode && (
                    <p className="mt-1 text-xs text-red-500">{addressFieldErrors[idx].zipCode}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`country-${idx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Country
                  </label>
                  <input
                    type="text"
                    id={`country-${idx}`}
                    name="country"
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-2 text-base text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={address.country}
                    onChange={(e) => handleAddressChange(idx, e)}
                    autoComplete="country"
                  />
                  {addressFieldErrors[idx]?.country && (
                    <p className="mt-1 text-xs text-red-500">{addressFieldErrors[idx].country}</p>
                  )}
                </div>
              </div>
            ))}

            {success && (
              <div className="mb-4 rounded border border-green-300 bg-green-100 p-3 text-center font-semibold text-green-700">
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded border border-red-300 bg-red-100 p-3 text-center font-semibold text-red-700">
                {error}
              </div>
            )}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/account')}
                className="inline-flex justify-center rounded-full bg-gray-200 px-6 py-2 text-base font-bold text-gray-700 shadow transition-all hover:bg-gray-300"
              >
                Back to Account
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-2 text-base font-bold text-white shadow transition-all hover:from-blue-600 hover:to-pink-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx global>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        @keyframes blob {
          0%,
          100% {
            transform: translateY(0px) scale(1);
          }
          33% {
            transform: translateY(-20px) scale(1.05);
          }
          66% {
            transform: translateY(10px) scale(0.97);
          }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default AccountEditPage;
