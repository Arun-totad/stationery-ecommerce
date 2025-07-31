'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Coupon, User } from '@/types';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import CouponForm from '@/components/admin/CouponForm';
import CouponAnalytics from '@/components/admin/CouponAnalytics';

export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Form state for creating/editing coupons
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minimumOrderAmount: 0,
    maximumDiscount: 0,
    validFrom: '',
    validUntil: '',
    usageLimit: 0,
    isActive: true,
    restrictedToUser: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [couponsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'coupons'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'users')),
      ]);

      const fetchedCoupons: Coupon[] = couponsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          validFrom: data.validFrom?.toDate?.() || new Date(data.validFrom),
          validUntil: data.validUntil?.toDate?.() || new Date(data.validUntil),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        } as Coupon;
      });

      const fetchedUsers: User[] = usersSnapshot.docs.map((doc) => ({
        ...(doc.data() as User),
        uid: doc.id,
      }));

      setCoupons(fetchedCoupons);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!formData.code || !formData.name || !formData.discountValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      toast.error('Valid until date must be after valid from date');
      return;
    }

    try {
      console.log('User role:', user?.role);
      console.log('User UID:', user?.uid);
      
      const couponData = {
        ...formData,
        usedCount: 0,
        createdBy: user?.uid || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        validFrom: new Date(formData.validFrom),
        validUntil: new Date(formData.validUntil),
        minimumOrderAmount: formData.minimumOrderAmount || 0,
        maximumDiscount: formData.maximumDiscount || 0,
        usageLimit: formData.usageLimit || 0,
        restrictedToUser: formData.restrictedToUser || null,
      };

      console.log('Coupon data being sent:', couponData);
      await addDoc(collection(db, 'coupons'), couponData);
      toast.success('Coupon created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    }
  };

  const handleEditCoupon = async () => {
    if (!editingCoupon) return;

    try {
      const couponData = {
        ...formData,
        updatedAt: new Date(),
        validFrom: new Date(formData.validFrom),
        validUntil: new Date(formData.validUntil),
        minimumOrderAmount: formData.minimumOrderAmount || 0,
        maximumDiscount: formData.maximumDiscount || 0,
        usageLimit: formData.usageLimit || 0,
        restrictedToUser: formData.restrictedToUser || null,
      };

      await updateDoc(doc(db, 'coupons', editingCoupon.id), couponData);
      toast.success('Coupon updated successfully');
      setShowEditModal(false);
      setEditingCoupon(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      toast.success('Coupon deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const handleEditClick = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumOrderAmount: coupon.minimumOrderAmount || 0,
      maximumDiscount: coupon.maximumDiscount || 0,
      validFrom: coupon.validFrom.toISOString().split('T')[0],
      validUntil: coupon.validUntil.toISOString().split('T')[0],
      usageLimit: coupon.usageLimit || 0,
      isActive: coupon.isActive,
      restrictedToUser: coupon.restrictedToUser || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      minimumOrderAmount: 0,
      maximumDiscount: 0,
      validFrom: '',
      validUntil: '',
      usageLimit: 0,
      isActive: true,
      restrictedToUser: '',
    });
  };

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coupon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const isExpired = now > coupon.validUntil;
    const isNotStarted = now < coupon.validFrom;
    const isUsageLimitReached = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;

    if (!coupon.isActive) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
    }
    if (isExpired) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
    }
    if (isNotStarted) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Not Started</span>;
    }
    if (isUsageLimitReached) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Limit Reached</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="min-h-screen bg-gray-100 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center">
              <div className="text-gray-700">Loading...</div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Coupon Management</h1>
          <p className="text-gray-600 mb-6">Create and manage discount coupons for your marketplace</p>
          
          <div className="mb-6 flex justify-between items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 rounded-lg border border-gray-300 px-4 py-2 pl-10 focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Coupon
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Coupons</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCoupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                        <div className="text-sm text-gray-500">{coupon.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{coupon.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                        </div>
                        {coupon.minimumOrderAmount > 0 && (
                          <div className="text-xs text-gray-500">Min: ${coupon.minimumOrderAmount}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{coupon.validFrom.toLocaleDateString()}</div>
                        <div className="text-gray-500">to {coupon.validUntil.toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {coupon.usedCount} / {coupon.usageLimit || '∞'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(coupon)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClick(coupon)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        {showAnalytics && (
          <div className="mb-8">
            <CouponAnalytics coupons={coupons} />
          </div>
        )}

        {/* Create Coupon Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-25">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create New Coupon</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <CouponForm
                formData={formData}
                setFormData={setFormData}
                users={users}
                onSubmit={handleCreateCoupon}
                submitLabel="Create Coupon"
                onCancel={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              />
            </div>
          </div>
        )}

        {/* Edit Coupon Modal */}
        {showEditModal && editingCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-25">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Edit Coupon</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <CouponForm
                formData={formData}
                setFormData={setFormData}
                users={users}
                onSubmit={handleEditCoupon}
                submitLabel="Update Coupon"
                onCancel={() => {
                  setShowEditModal(false);
                  setEditingCoupon(null);
                  resetForm();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 