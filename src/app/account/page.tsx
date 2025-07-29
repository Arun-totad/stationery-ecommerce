'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Address } from '@/types';
import Link from 'next/link';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import {
  MapPinIcon,
  BuildingOffice2Icon,
  MapIcon,
  GlobeAltIcon,
  IdentificationIcon,
  HomeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [makingDefaultIdx, setMakingDefaultIdx] = useState<number | null>(null);

  // Phone number formatting function
  const formatPhoneForDisplay = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return value; // Return original if not 10 digits
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || authLoading) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        } else {
          setUserData({
            // Initialize with basic info if doc doesn't exist
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            phoneNumber: '',
            addresses: [
              {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
              },
            ],
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err: any) {
        // console.error('Error fetching user data:', err);
        setError('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, authLoading]);

  // Remove address handler
  const handleRemoveAddress = async (idx: number) => {
    if (!user || !userData) return;
    setRemovingIdx(idx);
    setRemoveError(null);
    try {
      const currentAddresses = userData.addresses || [];
      let newAddresses = currentAddresses.filter((_, i) => i !== idx);
      if (newAddresses.length === 0) {
        newAddresses = [
          {
            street: 'NA',
            city: 'NA',
            state: 'NA',
            zipCode: 'NA',
            country: 'NA',
          },
        ];
      }
      await updateDoc(doc(db, 'users', user.uid), {
        addresses: newAddresses,
        updatedAt: new Date(),
      });
      setUserData({ ...userData, addresses: newAddresses });
    } catch (err: any) {
      setRemoveError('Failed to remove address. Please try again.');
    } finally {
      setRemovingIdx(null);
    }
  };

  // Make address default handler
  const handleMakeDefault = async (idx: number) => {
    if (!user || !userData) return;
    setMakingDefaultIdx(idx);
    setRemoveError(null);
    try {
      const currentAddresses = userData.addresses || [];
      if (idx < 0 || idx >= currentAddresses.length) return;
      const newAddresses = [currentAddresses[idx], ...currentAddresses.filter((_, i) => i !== idx)];
      await updateDoc(doc(db, 'users', user.uid), {
        addresses: newAddresses,
        updatedAt: new Date(),
      });
      setUserData({ ...userData, addresses: newAddresses });
    } catch (err: any) {
      setRemoveError('Failed to make address default. Please try again.');
    } finally {
      setMakingDefaultIdx(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Please log in to view your account details.</p>
      </div>
    );
  }

  // Support multiple addresses
  const addresses: Address[] =
    userData.addresses && userData.addresses.length > 0 ? userData.addresses : [];

  function isPlaceholderAddress(addr: Address | undefined) {
    if (!addr) return true;
    return ['street', 'city', 'state', 'zipCode', 'country'].every(
      (key) => !addr[key as keyof Address] || addr[key as keyof Address] === 'NA'
    );
  }

  const hasAddresses = addresses.length > 0 && !isPlaceholderAddress(addresses[0]);

  // Helper type guard for Firestore Timestamp
  function isFirestoreTimestamp(val: any): val is { toDate: () => Date } {
    return val && typeof val === 'object' && typeof val.toDate === 'function';
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'admin-manager']}>
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100">
        {/* Background Blobs */}
        <div className="absolute -top-32 -left-32 z-0 h-96 w-96 rounded-full bg-pink-200 opacity-40 blur-3xl filter" />
        <div className="absolute -right-32 -bottom-32 z-0 h-96 w-96 rounded-full bg-blue-200 opacity-40 blur-3xl filter" />
        <div className="absolute top-1/2 left-1/2 z-0 h-72 w-72 rounded-full bg-yellow-100 opacity-30 blur-2xl filter" />
        <div className="relative z-10 w-full max-w-xl">
          <div className="relative rounded-3xl bg-white/70 px-8 py-10 shadow-2xl backdrop-blur-lg">
            <div className="mb-8 flex flex-col items-center justify-center gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <h1 className="text-center text-3xl font-extrabold tracking-tight text-gray-900 md:text-left">
                My Account
              </h1>
              <Link href="/account/edit">
                <button
                  className="z-10 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-2 text-base font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-pink-500 md:w-auto"
                  style={{ boxShadow: '0 4px 16px 0 rgba(80, 80, 200, 0.10)' }}
                >
                  <UserCircleIcon className="h-5 w-5 text-white" />
                  Edit Profile
                </button>
              </Link>
            </div>
            {/* Incomplete Profile Message - only if no addresses */}
            {!hasAddresses && (
              <div className="relative mt-2 mb-8 flex flex-col gap-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="mb-1 block text-lg font-bold text-yellow-900">
                    Your profile is incomplete.
                  </span>
                  <span className="text-base text-gray-700">
                    Please update your address information to complete your profile.
                  </span>
                </div>
                <Link href="/account/edit">
                  <button className="mt-3 rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 px-6 py-2 text-base font-bold text-white shadow transition-all hover:from-yellow-500 hover:to-pink-500 md:mt-0">
                    Update Address
                  </button>
                </Link>
              </div>
            )}
            <div className="mb-8 flex flex-col items-center">
              {/* Avatar with gradient ring */}
              <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 p-1 shadow-lg">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                  {userData.displayName ? (
                    <span className="text-4xl font-extrabold text-blue-700">
                      {userData.displayName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                  ) : (
                    <UserCircleIcon className="h-16 w-16 text-blue-300" />
                  )}
                </div>
              </div>
              <span className="mt-2 text-lg font-semibold text-gray-700">
                {userData.displayName || 'N/A'}
              </span>
              <span className="mt-1 text-sm font-medium text-gray-500 capitalize">
                {userData.role}
              </span>
            </div>
            <div className="mb-6 border-b border-gray-200"></div>
            {/* Redesigned Profile Information Section */}
            <div className="space-y-6 transition-all duration-700">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
                <UserCircleIcon className="h-7 w-7 text-blue-400" />
                Profile Information
              </h2>
              <div className="flex flex-col gap-4 rounded-2xl bg-white/80 p-6 shadow-lg transition-shadow duration-300 hover:shadow-2xl">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0H9m3 0h3" />
                  </svg>
                  <span className="font-medium text-gray-600">Email Address:</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm">
                    {userData.email || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h2.28a2 2 0 011.94 1.515l.516 2.064a2 2 0 01-1.516 2.485l-1.516.303a11.042 11.042 0 005.516 5.516l.303-1.516A2 2 0 0115.42 14.26l2.064.516A2 2 0 0119 16.72V19a2 2 0 01-2 2h-1C7.373 21 3 16.627 3 11V9a2 2 0 012-2z"
                    />
                  </svg>
                  <span className="font-medium text-gray-600">Phone Number:</span>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700 shadow-sm">
                    {formatPhoneForDisplay(userData.phoneNumber || '')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
                  <span className="font-medium text-gray-600">Joined:</span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700 shadow-sm">
                    {(() => {
                      const val: any = userData.createdAt;
                      if (!val) return 'N/A';
                      if (typeof val === 'string' || typeof val === 'number') {
                        const d = new Date(val);
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                      }
                      if (val instanceof Date) {
                        return val.toLocaleDateString();
                      }
                      if (isFirestoreTimestamp(val)) {
                        const d = val.toDate();
                        return d instanceof Date && !isNaN(d.getTime())
                          ? d.toLocaleDateString()
                          : 'N/A';
                      }
                      return 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </div>
            {/* End Profile Information Section */}
            <div className="my-6 border-b border-gray-200"></div>
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-gray-900">
              <MapPinIcon className="h-6 w-6 text-blue-400" />
              Address Information
            </h2>
            {hasAddresses ? (
              <div className="space-y-6">
                {addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl bg-white/80 p-6 shadow-lg transition-shadow duration-300 hover:shadow-2xl"
                  >
                    <div className="mb-2 flex justify-end gap-2">
                      {idx === 0 && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 shadow">
                          Default
                        </span>
                      )}
                      {idx !== 0 && addresses.length > 1 && (
                        <button
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-blue-700 shadow transition-all hover:bg-blue-100"
                          onClick={() => handleMakeDefault(idx)}
                          disabled={makingDefaultIdx === idx}
                        >
                          {makingDefaultIdx === idx ? 'Making Default...' : 'Make Default'}
                        </button>
                      )}
                      {idx !== 0 && addresses.length > 1 && (
                        <button
                          className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 shadow transition-all hover:bg-red-200"
                          onClick={() => handleRemoveAddress(idx)}
                          disabled={removingIdx === idx}
                        >
                          {removingIdx === idx ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <HomeIcon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-gray-700">Street:</span>
                        <span className="ml-1 text-gray-900">{addr.street}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <BuildingOffice2Icon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-gray-700">City:</span>
                        <span className="ml-1 text-gray-900">{addr.city}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <IdentificationIcon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-gray-700">State:</span>
                        <span className="ml-1 text-gray-900">{addr.state}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapIcon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-gray-700">Zip Code:</span>
                        <span className="ml-1 text-gray-900">{addr.zipCode}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <GlobeAltIcon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-gray-700">Country:</span>
                        <span className="ml-1 text-gray-900">{addr.country}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white/60 p-10 shadow backdrop-blur-md">
                {/* SVG or graphical illustration for no address */}
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 80 80"
                  fill="none"
                  className="mb-4"
                >
                  <rect x="10" y="30" width="60" height="35" rx="8" fill="#e0e7ff" />
                  <rect x="25" y="45" width="30" height="10" rx="3" fill="#fbbf24" />
                  <circle cx="40" cy="30" r="12" fill="#f472b6" />
                  <path d="M40 18v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <path d="M40 42v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="mb-2 text-lg font-bold text-gray-700">No address added yet</span>
                <span className="mb-4 text-center text-sm text-gray-500">
                  You haven't added any address. Add your first address to make ordering and
                  delivery seamless.
                </span>
                <Link href="/account/edit">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-2 text-base font-bold text-white shadow transition-all hover:from-blue-600 hover:to-pink-500"
                  >
                    Add Your First Address
                  </button>
                </Link>
              </div>
            )}
            {removeError && (
              <div className="mt-4 rounded border border-red-300 bg-red-100 p-2 text-center font-semibold text-red-700">
                {removeError}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
