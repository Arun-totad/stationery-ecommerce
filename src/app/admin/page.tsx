'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Vendor, Product, Order, Transaction } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
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
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import Link from 'next/link';

export default function AdminPage() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<
    Record<string, { id: string; ticketNumber?: string } | null>
  >({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [productVendorSort, setProductVendorSort] = useState<'asc' | 'desc' | null>(null);
  const [vendorProductSort, setVendorProductSort] = useState<
    Record<string, { field: 'name' | 'price' | 'stock'; direction: 'asc' | 'desc' }>
  >({});
  const [orderSearch, setOrderSearch] = useState('');

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
    const fetchData = async () => {
      setLoading(true);
      try {
        // Always fetch all users, products, orders, and transactions for dashboard
        const [
          usersSnapshot,
          productsSnapshot,
          ordersSnapshot,
          transactionsSnapshot,
          ticketsSnapshot,
        ] = await Promise.all([
          getDocs(query(collection(db, 'users'))),
          getDocs(query(collection(db, 'products'))),
          getDocs(query(collection(db, 'orders'))),
          getDocs(query(collection(db, 'transactions'))),
          getDocs(query(collection(db, 'supportTickets'))),
        ]);

        const fetchedUsers: User[] = usersSnapshot.docs.map((doc) => ({
          ...(doc.data() as User),
          uid: doc.id,
        }));
        const fetchedProducts: Product[] = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          let createdAt: Date;
          let updatedAt: Date;
          if (
            data.createdAt &&
            typeof data.createdAt === 'object' &&
            typeof data.createdAt.toDate === 'function'
          ) {
            createdAt = data.createdAt.toDate();
          } else {
            createdAt = new Date(data.createdAt);
          }
          if (
            data.updatedAt &&
            typeof data.updatedAt === 'object' &&
            typeof data.updatedAt.toDate === 'function'
          ) {
            updatedAt = data.updatedAt.toDate();
          } else {
            updatedAt = new Date(data.updatedAt);
          }
          return {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            stock: data.stock || 0,
            category: data.category || '',
            brand: data.brand || '',
            images: data.images || [],
            vendorId: data.vendorId || '',
            createdAt,
            updatedAt,
          } as Product;
        });
        const fetchedOrders: Order[] = ordersSnapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Order, 'id'>;
          return {
            id: doc.id,
            ...data,
            createdAt:
              data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
                ? (data.createdAt as any).toDate()
                : new Date(data.createdAt),
            updatedAt:
              data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt
                ? (data.updatedAt as any).toDate()
                : new Date(data.updatedAt),
            estimatedDeliveryDate:
              data.estimatedDeliveryDate &&
              typeof data.estimatedDeliveryDate === 'object' &&
              'toDate' in data.estimatedDeliveryDate
                ? (data.estimatedDeliveryDate as any).toDate()
                : data.estimatedDeliveryDate
                  ? new Date(data.estimatedDeliveryDate)
                  : null,
          };
        });
        const fetchedTransactions: Transaction[] = transactionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Transaction, 'id'>),
          transactionDate: doc.data().transactionDate?.toDate
            ? doc.data().transactionDate.toDate()
            : new Date(doc.data().transactionDate),
        }));
        // Map orderId to support ticket (first ticket found for each order)
        const ticketMap: Record<string, { id: string; ticketNumber?: string } | null> = {};
        ticketsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.orderId) {
            if (!ticketMap[data.orderId]) {
              ticketMap[data.orderId] = { id: doc.id, ticketNumber: data.ticketNumber };
            }
          }
        });
        setSupportTickets(ticketMap);

        setUsers(fetchedUsers);
        setProducts(fetchedProducts);
        setOrders(fetchedOrders);
        setTransactions(fetchedTransactions);
      } catch (error) {
        toast.error('Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentView]);

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  // Add a helper function at the top of the component
  function formatDateSafe(date: any): string {
    if (!date) return 'N/A';
    let d: Date;
    if (date instanceof Date) d = date;
    else if (date && typeof date === 'object' && 'toDate' in date) d = (date as any).toDate();
    else d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  }

  // Helper functions for chart data and colors
  function getUserGrowthData(users: User[]) {
    // Group users by join date (day)
    const dateMap: Record<string, number> = {};
    users.forEach((u) => {
      let d: Date;
      if (u.createdAt instanceof Date) d = u.createdAt;
      else if (
        u.createdAt &&
        typeof u.createdAt === 'object' &&
        typeof (u.createdAt as any).toDate === 'function'
      )
        d = (u.createdAt as any).toDate();
      else d = new Date(u.createdAt);
      const dateStr = d.toLocaleDateString();
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });
    // Cumulative sum
    const sortedDates = Object.keys(dateMap).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    let cumulative = 0;
    return sortedDates.map((date) => {
      cumulative += dateMap[date];
      return { date, count: cumulative };
    });
  }
  const orderStatusColors = ['#3B82F6', '#F472B6', '#FBBF24', '#10B981', '#6366F1', '#F59E42'];
  function getOrderStatusData(orders: Order[]) {
    const statusMap: Record<string, number> = {};
    orders.forEach((o) => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="mx-auto rounded-lg bg-white p-8 px-4 text-gray-900 shadow-md sm:px-6 lg:px-8">
          {/* Dashboard Overview Cards */}
          {!currentView && (
            <>
              <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-4">
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-300 p-6 shadow">
                  <span className="text-3xl font-bold text-blue-700">{users.length}</span>
                  <span className="mt-2 text-lg font-medium text-blue-900">Total Users</span>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-pink-100 to-pink-300 p-6 shadow">
                  <span className="text-3xl font-bold text-pink-700">
                    {users.filter((u) => u.role === 'vendor').length}
                  </span>
                  <span className="mt-2 text-lg font-medium text-pink-900">Vendors</span>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-yellow-100 to-yellow-300 p-6 shadow">
                  <span className="text-3xl font-bold text-yellow-700">{orders.length}</span>
                  <span className="mt-2 text-lg font-medium text-yellow-900">Orders</span>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-green-100 to-green-300 p-6 shadow">
                  <span className="text-3xl font-bold text-green-700">
                    ${orders.reduce((sum, o) => sum + (o.serviceFee || 0), 0).toLocaleString()}
                  </span>
                  <span className="mt-2 text-lg font-medium text-green-900">Revenue</span>
                </div>
              </div>
              {/* Charts Section */}
              <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* User Growth Line Chart */}
                <div className="rounded-2xl bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-semibold text-blue-900">User Growth</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={getUserGrowthData(users)}>
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Order Status Pie Chart */}
                <div className="rounded-2xl bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-semibold text-pink-900">
                    Order Status Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={getOrderStatusData(orders)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {getOrderStatusData(orders).map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={orderStatusColors[idx % orderStatusColors.length]}
                          />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {loading ? (
            <div className="flex justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="w-full space-y-8">
              {currentView === 'products' && products.length > 0 && (
                <section>
                  <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                    <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-lg text-yellow-700">
                      📦
                    </span>
                    Products by Vendor
                    <span className="ml-2 inline-block rounded-full bg-yellow-50 px-3 py-1 text-base font-semibold text-yellow-700">
                      {products.length}
                    </span>
                  </h2>
                  {/* Search input for products */}
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-gray-200 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 py-2 pr-4 pl-10 shadow transition focus:bg-white focus:ring-2 focus:ring-yellow-400"
                        placeholder="Search products by name, category, brand, or vendor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-8">
                    {users
                      .filter((u) => u.role === 'vendor')
                      .map((vendor) => {
                        const vendorProducts = products.filter(
                          (product) =>
                            product.vendorId === vendor.uid &&
                            (product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              vendor.displayName
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                        );
                        if (vendorProducts.length === 0) return null;
                        // Sorting logic for this vendor
                        const sortConfig = vendorProductSort[vendor.uid] || {
                          field: 'name',
                          direction: 'asc',
                        };
                        const sortedProducts = [...vendorProducts].sort((a, b) => {
                          if (!sortConfig.field) return 0;
                          let valA = a[sortConfig.field as 'name' | 'price' | 'stock'];
                          let valB = b[sortConfig.field as 'name' | 'price' | 'stock'];
                          if (typeof valA === 'string' && typeof valB === 'string') {
                            if (sortConfig.direction === 'asc') return valA.localeCompare(valB);
                            return valB.localeCompare(valA);
                          }
                          if (typeof valA === 'number' && typeof valB === 'number') {
                            if (sortConfig.direction === 'asc') return valA - valB;
                            return valB - valA;
                          }
                          return 0;
                        });
                        const handleSort = (field: 'name' | 'price' | 'stock') => {
                          setVendorProductSort((prev) => ({
                            ...prev,
                            [vendor.uid]: {
                              field,
                              direction:
                                sortConfig.field === field && sortConfig.direction === 'asc'
                                  ? 'desc'
                                  : 'asc',
                            },
                          }));
                        };
                        return (
                          <div
                            key={vendor.uid}
                            className="rounded-3xl border border-yellow-100 bg-white p-6 shadow-xl"
                          >
                            <div className="mb-4 flex items-center gap-4">
                              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-2xl font-bold shadow">
                                {vendor.displayName
                                  ? vendor.displayName
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .toUpperCase()
                                  : 'V'}
                              </span>
                              <div>
                                <div className="text-xl font-bold text-gray-900">
                                  {vendor.displayName || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {vendor.email || 'N/A'} &bull;{' '}
                                  {'shopAddress' in vendor ? (vendor as any).shopAddress : 'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                  <tr className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50">
                                    <th
                                      className="cursor-pointer rounded-tl-2xl px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase select-none"
                                      onClick={() => handleSort('name')}
                                    >
                                      Name
                                      {sortConfig.field === 'name' &&
                                        (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                    <th
                                      className="cursor-pointer px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase select-none"
                                      onClick={() => handleSort('price')}
                                    >
                                      Price
                                      {sortConfig.field === 'price' &&
                                        (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                    <th
                                      className="cursor-pointer px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase select-none"
                                      onClick={() => handleSort('stock')}
                                    >
                                      Stock
                                      {sortConfig.field === 'stock' &&
                                        (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                    </th>
                                    <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                                      Category
                                    </th>
                                    <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                                      Brand
                                    </th>
                                    <th className="rounded-tr-2xl px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                                      Created At
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {sortedProducts.map((product) => (
                                    <tr
                                      key={product.id}
                                      className="group cursor-pointer transition-all duration-200 hover:bg-yellow-50"
                                      onClick={() => router.push(`/admin/products/${product.id}`)}
                                    >
                                      <td className="flex items-center gap-3 px-6 py-3 font-medium whitespace-nowrap text-gray-900">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-lg font-bold shadow transition-transform group-hover:scale-105">
                                          {product.name ? product.name[0].toUpperCase() : 'P'}
                                        </span>
                                        <span>{product.name}</span>
                                      </td>
                                      <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                        ${product.price.toFixed(2)}
                                      </td>
                                      <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                        {product.stock}
                                      </td>
                                      <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                        {product.category}
                                      </td>
                                      <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                        {product.brand}
                                      </td>
                                      <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                        {product.createdAt &&
                                        typeof product.createdAt === 'object' &&
                                        'toDate' in product.createdAt
                                          ? (product.createdAt as any).toDate().toLocaleDateString()
                                          : product.createdAt
                                            ? new Date(product.createdAt).toLocaleDateString()
                                            : 'N/A'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>
              )}

              {currentView === 'orders' && orders.length > 0 && (
                <section>
                  <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                    <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-lg text-yellow-700">
                      📦
                    </span>
                    Orders
                    <span className="ml-2 inline-block rounded-full bg-yellow-50 px-3 py-1 text-base font-semibold text-yellow-700">
                      {orders.length}
                    </span>
                  </h2>
                  {/* Search bar for orders */}
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-gray-200 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 py-2 pr-4 pl-10 shadow transition focus:bg-white focus:ring-2 focus:ring-yellow-400"
                        placeholder="Search orders by number, customer, or vendor..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 hover:shadow-yellow-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50">
                            <th className="rounded-tl-2xl px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Order Number
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Customer
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Vendor
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Total
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Support Ticket
                            </th>
                            <th className="rounded-tr-2xl px-6 py-4 text-left text-base font-extrabold tracking-widest text-yellow-900 uppercase">
                              Created
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {orders
                            .filter((order) => {
                              const q = orderSearch.toLowerCase();
                              return (
                                (order.orderNumber || '').toLowerCase().includes(q) ||
                                (order.customerName || '').toLowerCase().includes(q) ||
                                (order.userId || '').toLowerCase().includes(q) ||
                                (order.vendorId || '').toLowerCase().includes(q)
                              );
                            })
                            .map((order) => (
                              <tr
                                key={order.id}
                                className="group cursor-pointer transition-all duration-200 hover:bg-yellow-50"
                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                              >
                                <td className="px-6 py-3 font-bold whitespace-nowrap text-yellow-900">
                                  {order.orderNumber ||
                                    (order.id
                                      ? `ORD-2024-${order.id.slice(-4).toUpperCase()}`
                                      : 'ORD-2024-XXXX')}
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  {order.customerName || order.userId}
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  {users.find((u) => u.uid === order.vendorId)?.displayName ||
                                    order.vendorId ||
                                    'N/A'}
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  ${order.total?.toFixed(2)}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                  <span
                                    className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                                      order.status === 'delivered'
                                        ? 'bg-green-100 text-green-800'
                                        : order.status === 'cancelled'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {order.status}
                                  </span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                  {supportTickets[order.id] ? (
                                    <Link
                                      href={`/admin/support/${supportTickets[order.id]!.id}`}
                                      className="inline-block cursor-pointer rounded-full bg-pink-100 px-3 py-1 text-sm font-semibold text-pink-800 transition hover:bg-pink-200"
                                    >
                                      {supportTickets[order.id]!.ticketNumber ||
                                        supportTickets[order.id]!.id.slice(-6).toUpperCase()}
                                    </Link>
                                  ) : (
                                    <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-500">
                                      No support ticket
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  {formatDateSafe(order.createdAt)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {currentView === 'transactions' && transactions.length > 0 && (
                <section>
                  <h2 className="mb-4 text-2xl font-semibold text-gray-900">Transactions</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-2xl shadow-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-lg font-bold tracking-wide text-gray-700 uppercase">
                            Transaction ID
                          </th>
                          <th className="px-6 py-4 text-left text-lg font-bold tracking-wide text-gray-700 uppercase">
                            User ID
                          </th>
                          <th className="px-6 py-4 text-left text-lg font-bold tracking-wide text-gray-700 uppercase">
                            Amount
                          </th>
                          <th className="px-6 py-4 text-left text-lg font-bold tracking-wide text-gray-700 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-lg font-bold tracking-wide text-gray-700 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-lg font-bold tracking-wide text-gray-700 uppercase">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white even:bg-gray-50">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-100">
                            <td className="px-6 py-3 text-base font-medium whitespace-nowrap text-gray-900">
                              {transaction.id}
                            </td>
                            <td className="max-w-xs truncate px-6 py-3 text-base whitespace-nowrap text-gray-700">
                              {transaction.userId}
                            </td>
                            <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                              ${transaction.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700 capitalize">
                              {transaction.type}
                            </td>
                            <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700 capitalize">
                              {transaction.status}
                            </td>
                            <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                              {formatDateSafe(transaction.transactionDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {currentView === 'users' && users.length > 0 && (
                <section>
                  <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-lg text-blue-700">
                      👥
                    </span>
                    Users
                    <span className="ml-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-base font-semibold text-blue-700">
                      {users.length}
                    </span>
                  </h2>
                  {/* Search input and Role filter */}
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                        <svg
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-gray-200 bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 py-2 pr-4 pl-10 shadow transition focus:bg-white focus:ring-2 focus:ring-blue-400"
                        placeholder="Search users by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="w-full max-w-xs md:ml-2">
                      <select
                        className="w-full rounded-xl border border-gray-200 bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 px-4 py-2 shadow transition focus:ring-2 focus:ring-blue-400"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option value="all">All Roles</option>
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                        <option value="admin-manager">Admin Manager</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 hover:shadow-blue-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50">
                            <th className="rounded-tl-2xl px-6 py-4 text-left text-base font-extrabold tracking-widest text-blue-900 uppercase">
                              Name
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-blue-900 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-blue-900 uppercase">
                              Phone
                            </th>
                            <th className="px-6 py-4 text-left text-base font-extrabold tracking-widest text-blue-900 uppercase">
                              Role
                            </th>
                            <th className="rounded-tr-2xl px-6 py-4 text-left text-base font-extrabold tracking-widest text-blue-900 uppercase">
                              Joined
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {users
                            .filter((user) => {
                              const q = searchQuery.toLowerCase();
                              const matchesSearch =
                                user.displayName?.toLowerCase().includes(q) ||
                                user.email?.toLowerCase().includes(q) ||
                                user.phoneNumber?.toLowerCase().includes(q);
                              const matchesRole =
                                roleFilter === 'all' ? true : user.role === roleFilter;
                              return matchesSearch && matchesRole;
                            })
                            .map((user) => (
                              <tr
                                key={user.uid}
                                className="group cursor-pointer transition-all duration-200 hover:bg-blue-50"
                                onClick={() => handleRowClick(user.uid)}
                              >
                                <td className="flex items-center gap-3 px-6 py-3 font-medium whitespace-nowrap text-gray-900">
                                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-200 to-pink-200 text-lg font-bold shadow transition-transform group-hover:scale-105">
                                    {user.displayName
                                      ? user.displayName
                                          .split(' ')
                                          .map((n) => n[0])
                                          .join('')
                                          .toUpperCase()
                                      : 'U'}
                                  </span>
                                  <span>{user.displayName || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  {user.email || 'N/A'}
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  {user.phoneNumber ? formatPhoneForDisplay(user.phoneNumber) : 'N/A'}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                  <span
                                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                      user.role === 'admin-manager'
                                        ? 'bg-purple-100 text-purple-700'
                                        : user.role === 'admin'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : user.role === 'vendor'
                                            ? 'bg-pink-100 text-pink-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {user.role
                                      .replace('-', ' ')
                                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-base whitespace-nowrap text-gray-700">
                                  {formatDateSafe(user.createdAt)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {((currentView === 'users' && users.length === 0) ||
                (currentView === 'products' && products.length === 0) ||
                (currentView === 'orders' && orders.length === 0) ||
                (currentView === 'transactions' && transactions.length === 0)) &&
                currentView !== null && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <span className="mb-2 text-4xl">🗒️</span>
                    <span>No {currentView} found.</span>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
