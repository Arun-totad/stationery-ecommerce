'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Product, Order } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface ProductAnalyticsProps {
  productId: string;
  timeRange: 'day' | 'week' | 'month' | 'year';
}

interface AnalyticsData {
  views: number;
  sales: number;
  revenue: number;
  date: string;
}

interface ProductMetrics {
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
}

export default function ProductAnalytics({ productId, timeRange }: ProductAnalyticsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [metrics, setMetrics] = useState<ProductMetrics>({
    totalViews: 0,
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        // Fetch product views (assuming you have a views collection)
        const viewsQuery = query(
          collection(db, 'productViews'),
          where('productId', '==', productId),
          where('timestamp', '>=', getStartDate(timeRange)),
          orderBy('timestamp', 'asc')
        );
        const viewsSnapshot = await getDocs(viewsQuery);
        const viewsData = viewsSnapshot.docs.map((doc) => ({
          timestamp: doc.data().timestamp.toDate(),
          count: 1,
        }));

        // Fetch orders containing this product
        const ordersQuery = query(
          collection(db, 'orders'),
          where('items', 'array-contains', { productId }),
          where('createdAt', '>=', getStartDate(timeRange)),
          orderBy('createdAt', 'asc')
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Order[];

        // Process and aggregate data
        const processedData = processAnalyticsData(viewsData, ordersData, timeRange);
        setAnalyticsData(processedData);

        // Calculate metrics
        const calculatedMetrics = calculateMetrics(viewsData, ordersData);
        setMetrics(calculatedMetrics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [productId, timeRange, user]);

  const getStartDate = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  };

  const processAnalyticsData = (
    viewsData: { timestamp: Date; count: number }[],
    ordersData: Order[],
    timeRange: string
  ): AnalyticsData[] => {
    // Group data by time intervals based on timeRange
    const groupedData = new Map<string, AnalyticsData>();

    // Process views
    viewsData.forEach((view) => {
      const dateKey = formatDate(view.timestamp, timeRange);
      const existing = groupedData.get(dateKey) || {
        views: 0,
        sales: 0,
        revenue: 0,
        date: dateKey,
      };
      existing.views += view.count;
      groupedData.set(dateKey, existing);
    });

    // Process orders
    ordersData.forEach((order) => {
      const dateKey = formatDate(order.createdAt, timeRange);
      const existing = groupedData.get(dateKey) || {
        views: 0,
        sales: 0,
        revenue: 0,
        date: dateKey,
      };
      const productItems = order.items.filter((item) => item.productId === productId);
      existing.sales += productItems.reduce((sum, item) => sum + item.quantity, 0);
      existing.revenue += productItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      groupedData.set(dateKey, existing);
    });

    return Array.from(groupedData.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatDate = (date: Date, timeRange: string): string => {
    switch (timeRange) {
      case 'day':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      case 'year':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  };

  const calculateMetrics = (
    viewsData: { timestamp: Date; count: number }[],
    ordersData: Order[]
  ): ProductMetrics => {
    const totalViews = viewsData.length;
    const totalSales = ordersData.reduce(
      (sum, order) =>
        sum +
        order.items
          .filter((item) => item.productId === productId)
          .reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const totalRevenue = ordersData.reduce(
      (sum, order) =>
        sum +
        order.items
          .filter((item) => item.productId === productId)
          .reduce((itemSum, item) => itemSum + item.price * item.quantity, 0),
      0
    );

    return {
      totalViews,
      totalSales,
      totalRevenue,
      averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
      conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0,
    };
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Views</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{metrics.totalViews}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Sales</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{metrics.totalSales}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Total Revenue</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              ${metrics.totalRevenue.toFixed(2)}
            </dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Average Order Value</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              ${metrics.averageOrderValue.toFixed(2)}
            </dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">Conversion Rate</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {metrics.conversionRate.toFixed(1)}%
            </dd>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Views and Sales Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Views and Sales</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="views"
                  stroke="#3B82F6"
                  name="Views"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sales"
                  stroke="#10B981"
                  name="Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Revenue</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
