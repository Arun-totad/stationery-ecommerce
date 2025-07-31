'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Coupon, CouponUsage } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface CouponAnalyticsProps {
  coupons: Coupon[];
}

export default function CouponAnalytics({ coupons }: CouponAnalyticsProps) {
  const [couponUsage, setCouponUsage] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCouponUsage();
  }, []);

  const fetchCouponUsage = async () => {
    try {
      const usageSnapshot = await getDocs(query(collection(db, 'couponUsage'), orderBy('usedAt', 'desc')));
      const usage: CouponUsage[] = usageSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        usedAt: doc.data().usedAt?.toDate?.() || new Date(doc.data().usedAt),
      } as CouponUsage));
      setCouponUsage(usage);
    } catch (error) {
      console.error('Error fetching coupon usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCouponStats = () => {
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive).length;
    const expiredCoupons = coupons.filter(c => new Date() > c.validUntil).length;
    const totalUsage = couponUsage.length;
    const totalDiscountGiven = couponUsage.reduce((sum, usage) => sum + usage.discountAmount, 0);

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUsage,
      totalDiscountGiven
    };
  };

  const getUsageByCoupon = () => {
    const usageMap = new Map<string, number>();
    const discountMap = new Map<string, number>();

    couponUsage.forEach(usage => {
      const currentUsage = usageMap.get(usage.couponId) || 0;
      const currentDiscount = discountMap.get(usage.couponId) || 0;
      usageMap.set(usage.couponId, currentUsage + 1);
      discountMap.set(usage.couponId, currentDiscount + usage.discountAmount);
    });

    return coupons.map(coupon => ({
      name: coupon.name,
      usage: usageMap.get(coupon.id) || 0,
      discount: discountMap.get(coupon.id) || 0,
      limit: coupon.usageLimit || 0,
      used: coupon.usedCount
    })).filter(item => item.usage > 0);
  };

  const getRecentUsage = () => {
    return couponUsage.slice(0, 10).map(usage => {
      const coupon = coupons.find(c => c.id === usage.couponId);
      return {
        ...usage,
        couponName: coupon?.name || 'Unknown Coupon',
        couponCode: coupon?.code || 'Unknown'
      };
    });
  };

  const stats = getCouponStats();
  const usageData = getUsageByCoupon();
  const recentUsage = getRecentUsage();

  const pieData = [
    { name: 'Active', value: stats.activeCoupons, color: '#10B981' },
    { name: 'Expired', value: stats.expiredCoupons, color: '#EF4444' },
    { name: 'Inactive', value: stats.totalCoupons - stats.activeCoupons - stats.expiredCoupons, color: '#6B7280' }
  ];

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.totalCoupons}</div>
          <div className="text-sm text-gray-600">Total Coupons</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-green-600">{stats.activeCoupons}</div>
          <div className="text-sm text-gray-600">Active Coupons</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-red-600">{stats.expiredCoupons}</div>
          <div className="text-sm text-gray-600">Expired Coupons</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-purple-600">{stats.totalUsage}</div>
          <div className="text-sm text-gray-600">Total Usage</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold text-orange-600">${stats.totalDiscountGiven.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Discount Given</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coupon Status Pie Chart */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Coupon Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Usage by Coupon Bar Chart */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Usage by Coupon</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usage" fill="#3B82F6" name="Usage Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Usage Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Coupon Usage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coupon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsage.map((usage) => (
                <tr key={usage.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usage.couponName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usage.couponCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    ${usage.discountAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usage.usedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentUsage.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No coupon usage recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 