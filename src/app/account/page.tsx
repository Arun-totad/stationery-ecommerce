'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Address } from '@/types';
import Link from 'next/link';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { MapPinIcon, BuildingOffice2Icon, MapIcon, GlobeAltIcon, IdentificationIcon, HomeIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [makingDefaultIdx, setMakingDefaultIdx] = useState<number | null>(null);

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
          setUserData({ // Initialize with basic info if doc doesn't exist
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            phoneNumber: '',
            addresses: [{
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: '',
            }],
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
        newAddresses = [{
          street: 'NA',
          city: 'NA',
          state: 'NA',
          zipCode: 'NA',
          country: 'NA',
        }];
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Please log in to view your account details.</p>
      </div>
    );
  }

  // Support multiple addresses
  const addresses: Address[] = (userData.addresses && userData.addresses.length > 0)
    ? userData.addresses
    : [];

  function isPlaceholderAddress(addr: Address | undefined) {
    if (!addr) return true;
    return ['street', 'city', 'state', 'zipCode', 'country'].every(
      key => !addr[key as keyof Address] || addr[key as keyof Address] === 'NA'
    );
  }

  const hasAddresses = addresses.length > 0 && !isPlaceholderAddress(addresses[0]);

  // Helper type guard for Firestore Timestamp
  function isFirestoreTimestamp(val: any): val is { toDate: () => Date } {
    return val && typeof val === 'object' && typeof val.toDate === 'function';
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'admin-manager']}>
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100">
        {/* Animated Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-200 opacity-40 rounded-full filter blur-3xl animate-blob z-0" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200 opacity-40 rounded-full filter blur-3xl animate-blob animation-delay-2000 z-0" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-yellow-100 opacity-30 rounded-full filter blur-2xl animate-blob animation-delay-4000 z-0" />
        <div className="relative z-10 w-full max-w-xl">
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl px-8 py-10 relative">
            <div className="flex flex-col items-center justify-center mb-8 gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center md:text-left">My Account</h1>
              <Link href="/account/edit">
                <button
                  className="px-6 py-2 rounded-full font-bold text-base bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-lg hover:from-blue-600 hover:to-pink-500 transition-all flex items-center gap-2 z-10 w-full md:w-auto justify-center"
                  style={{ boxShadow: '0 4px 16px 0 rgba(80, 80, 200, 0.10)' }}
                >
                  <UserCircleIcon className="h-5 w-5 text-white" />
                  Edit Profile
                </button>
              </Link>
            </div>
            {/* Incomplete Profile Message - only if no addresses */}
            {!hasAddresses && (
              <div className="mb-8 mt-2 p-5 rounded-2xl border border-yellow-300 bg-yellow-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative">
                <div>
                  <span className="font-bold text-yellow-900 text-lg block mb-1">Your profile is incomplete.</span>
                  <span className="text-gray-700 text-base">Please update your address information to complete your profile.</span>
                </div>
                <Link href="/account/edit">
                  <button
                    className="px-6 py-2 rounded-full font-bold text-base bg-gradient-to-r from-yellow-400 to-pink-400 text-white shadow hover:from-yellow-500 hover:to-pink-500 transition-all mt-3 md:mt-0"
                  >
                    Update Address
                  </button>
                </Link>
              </div>
            )}
            <div className="flex flex-col items-center mb-8">
              {/* Avatar with gradient ring */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 flex items-center justify-center mb-2 shadow-lg p-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  {userData.displayName ? (
                    <span className="text-4xl font-extrabold text-blue-700">
                      {userData.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  ) : (
                    <UserCircleIcon className="w-16 h-16 text-blue-300" />
                  )}
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-700 mt-2">{userData.displayName || 'N/A'}</span>
              <span className="text-sm font-medium text-gray-500 mt-1 capitalize">{userData.role}</span>
            </div>
            <div className="border-b border-gray-200 mb-6"></div>
            {/* Redesigned Profile Information Section with Animation */}
            <div className="space-y-6 animate-fade-in-up transition-all duration-700">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <UserCircleIcon className="h-7 w-7 text-blue-400 animate-bounce-slow" />
                Profile Information
              </h2>
              <div className="flex flex-col gap-4 bg-white/80 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-500 animate-fade-in" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0H9m3 0h3" /></svg>
                  <span className="font-medium text-gray-600">Email Address:</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold text-sm shadow-sm">{userData.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-500 animate-fade-in" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a2 2 0 011.94 1.515l.516 2.064a2 2 0 01-1.516 2.485l-1.516.303a11.042 11.042 0 005.516 5.516l.303-1.516A2 2 0 0115.42 14.26l2.064.516A2 2 0 0119 16.72V19a2 2 0 01-2 2h-1C7.373 21 3 16.627 3 11V9a2 2 0 012-2z" /></svg>
                  <span className="font-medium text-gray-600">Phone Number:</span>
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold text-sm shadow-sm">{userData.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-purple-500 animate-fade-in" />
                  <span className="font-medium text-gray-600">Joined:</span>
                  <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-semibold text-sm shadow-sm">
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
                        return d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
                      }
                      return 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </div>
            {/* End Profile Information Section */}
            <div className="border-b border-gray-200 my-6"></div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <MapPinIcon className="h-6 w-6 text-blue-400 animate-bounce-slow" />
              Address Information
            </h2>
            {hasAddresses ? (
              <div className="space-y-6">
                {addresses.map((addr, idx) => (
                  <div key={idx} className="bg-white/80 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-shadow duration-300 animate-fade-in-up relative">
                    <div className="flex justify-end gap-2 mb-2">
                      {idx === 0 && (
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shadow animate-fade-in">Default</span>
                      )}
                      {idx !== 0 && addresses.length > 1 && (
                        <button
                          className="px-3 py-1 rounded-full bg-gray-100 text-blue-700 text-xs font-bold shadow hover:bg-blue-100 transition-all animate-fade-in"
                          onClick={() => handleMakeDefault(idx)}
                          disabled={makingDefaultIdx === idx}
                        >
                          {makingDefaultIdx === idx ? 'Making Default...' : 'Make Default'}
                        </button>
                      )}
                      {idx !== 0 && addresses.length > 1 && (
                        <button
                          className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold shadow hover:bg-red-200 transition-all animate-fade-in"
                          onClick={() => handleRemoveAddress(idx)}
                          disabled={removingIdx === idx}
                        >
                          {removingIdx === idx ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <HomeIcon className="h-5 w-5 text-blue-400 animate-fade-in" />
                        <span className="font-medium text-gray-700">Street:</span>
                        <span className="ml-1 text-gray-900">{addr.street}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <BuildingOffice2Icon className="h-5 w-5 text-blue-400 animate-fade-in" />
                        <span className="font-medium text-gray-700">City:</span>
                        <span className="ml-1 text-gray-900">{addr.city}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <IdentificationIcon className="h-5 w-5 text-blue-400 animate-fade-in" />
                        <span className="font-medium text-gray-700">State:</span>
                        <span className="ml-1 text-gray-900">{addr.state}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapIcon className="h-5 w-5 text-blue-400 animate-fade-in" />
                        <span className="font-medium text-gray-700">Zip Code:</span>
                        <span className="ml-1 text-gray-900">{addr.zipCode}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <GlobeAltIcon className="h-5 w-5 text-blue-400 animate-fade-in" />
                        <span className="font-medium text-gray-700">Country:</span>
                        <span className="ml-1 text-gray-900">{addr.country}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-2xl shadow p-10 animate-fade-in-up">
                {/* SVG or graphical illustration for no address */}
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-4 animate-fade-in">
                  <rect x="10" y="30" width="60" height="35" rx="8" fill="#e0e7ff" />
                  <rect x="25" y="45" width="30" height="10" rx="3" fill="#fbbf24" />
                  <circle cx="40" cy="30" r="12" fill="#f472b6" />
                  <path d="M40 18v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <path d="M40 42v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-lg font-bold text-gray-700 mb-2">No address added yet</span>
                <span className="text-sm text-gray-500 mb-4 text-center">You haven't added any address. Add your first address to make ordering and delivery seamless.</span>
                <Link href="/account/edit">
                  <button
                    type="button"
                    className="inline-flex justify-center py-2 px-6 rounded-full font-bold text-base bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow hover:from-blue-600 hover:to-pink-500 transition-all animate-fade-in"
                  >
                    Add Your First Address
                  </button>
                </Link>
              </div>
            )}
            {removeError && (
              <div className="mt-4 p-2 rounded bg-red-100 text-red-700 text-center font-semibold border border-red-300 animate-fade-in">{removeError}</div>
            )}
          </div>
        </div>
        <style jsx global>{`
          .animate-blob { animation: blob 7s infinite; }
          @keyframes blob {
            0%, 100% { transform: translateY(0px) scale(1); }
            33% { transform: translateY(-20px) scale(1.05); }
            66% { transform: translateY(10px) scale(0.97); }
          }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          .animate-fade-in-up {
            animation: fadeInUp 1s cubic-bezier(0.23, 1, 0.32, 1) both;
          }
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(40px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-bounce-slow {
            animation: bounceSlow 2.5s infinite;
          }
          @keyframes bounceSlow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          .animate-fade-in {
            animation: fadeIn 1.2s both;
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
} 