'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Order, SupportTicket, Vendor, Transaction } from '@/types';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  FaArrowLeft, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaChartLine, 
  FaBox, 
  FaUser, 
  FaCalendar,
  FaDollarSign,
  FaShoppingCart,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaImage,
  FaTags,
  FaStore,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt
} from 'react-icons/fa';

interface ProductAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  recentOrders: Order[];
  monthlyRevenue: { month: string; revenue: number }[];
  orderStatusDistribution: { status: string; count: number }[];
}

export default function AdminProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [analytics, setAnalytics] = useState<ProductAnalytics>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    recentOrders: [],
    monthlyRevenue: [],
    orderStatusDistribution: [],
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'orders' | 'tickets'>('overview');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch product
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          toast.error('Product not found.');
          router.push('/admin?view=products');
          return;
        }
        const prod = { id: productSnap.id, ...productSnap.data() } as Product;
        setProduct(prod);
        
        // Fetch vendor
        if (prod.vendorId) {
          const vendorRef = doc(db, 'users', prod.vendorId);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            setVendor({ uid: vendorSnap.id, ...vendorSnap.data() } as Vendor);
          }
        }
        
        // Fetch orders for this product
        let productOrders: Order[] = [];
        try {
          const ordersQuery = query(
            collection(db, 'orders'), 
            where('vendorId', '==', prod.vendorId),
            orderBy('createdAt', 'desc')
          );
          const ordersSnapshot = await getDocs(ordersQuery);
          const allOrders = ordersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];
          
          // Filter orders where any item has this productId
          productOrders = allOrders.filter((order) =>
            order.items.some((item) => item.id === prod.id)
          );
          setOrders(productOrders);
        } catch (error) {
          console.error('Error fetching orders:', error);
          // If the query fails due to missing index, try without orderBy
          try {
            const ordersQuery = query(
              collection(db, 'orders'), 
              where('vendorId', '==', prod.vendorId)
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            const allOrders = ordersSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Order[];
            
            // Sort manually if orderBy fails
            const sortedOrders = allOrders.sort((a, b) => {
              const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
              const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
              return dateB.getTime() - dateA.getTime();
            });
            
            // Filter orders where any item has this productId
            productOrders = sortedOrders.filter((order) =>
              order.items.some((item) => item.id === prod.id)
            );
            setOrders(productOrders);
          } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            setOrders([]);
          }
        }
        
        // Calculate analytics
        const analyticsData = calculateProductAnalytics(productOrders, prod);
        setAnalytics(analyticsData);
        
        // Fetch support tickets for these orders
        if (productOrders.length > 0) {
          const orderIds = productOrders.map((o: Order) => o.id);
          const ticketsQuery = query(
            collection(db, 'supportTickets'),
            where('orderId', 'in', orderIds.slice(0, 10))
          );
          const ticketsSnapshot = await getDocs(ticketsQuery);
          setTickets(
            ticketsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SupportTicket[]
          );
        } else {
          setTickets([]);
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error('Failed to load product details.');
        router.push('/admin?view=products');
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [productId, router]);

  const calculateProductAnalytics = (productOrders: Order[], product: Product): ProductAnalytics => {
    const totalOrders = productOrders.length;
    const totalRevenue = productOrders.reduce((sum, order) => {
      const productItems = order.items.filter(item => item.id === product.id);
      return sum + productItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
    
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Monthly revenue calculation
    const monthlyRevenue = productOrders.reduce((acc, order) => {
      const month = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const existing = acc.find(item => item.month === month);
      const productItems = order.items.filter(item => item.id === product.id);
      const orderRevenue = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (existing) {
        existing.revenue += orderRevenue;
      } else {
        acc.push({ month, revenue: orderRevenue });
      }
      return acc;
    }, [] as { month: string; revenue: number }[]);
    
    // Order status distribution
    const orderStatusDistribution = productOrders.reduce((acc, order) => {
      const status = order.status;
      const existing = acc.find(item => item.status === status);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ status, count: 1 });
      }
      return acc;
    }, [] as { status: string; count: number }[]);
    
    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      conversionRate: 0, // Would need view data to calculate
      recentOrders: productOrders.slice(0, 5),
      monthlyRevenue: monthlyRevenue.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()),
      orderStatusDistribution,
    };
  };

  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    if (typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-yellow-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center text-gray-900">
          Product details not available.
        </div>
      </ProtectedRoute>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FaArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/admin/products/${productId}/edit`)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaEdit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => router.push(`/products/${productId}`)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaEye className="h-4 w-4" />
                  <span>View Public</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Product Header */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-200 to-pink-200 text-4xl font-bold text-white shadow-lg">
                  {product.name ? product.name[0].toUpperCase() : 'P'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <FaTags className="h-4 w-4" />
                      <span>{product.category}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FaStore className="h-4 w-4" />
                      <span>{product.brand}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FaCalendar className="h-4 w-4" />
                      <span>Created {formatDate(product.createdAt)}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 lg:mt-0">
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{formatCurrency(product.price)}</div>
                  <div className="text-sm text-gray-600">Current Price</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-sm border mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: FaBox },
                  { id: 'analytics', label: 'Analytics', icon: FaChartLine },
                  { id: 'orders', label: 'Orders', icon: FaShoppingCart },
                  { id: 'tickets', label: 'Support', icon: FaExclamationTriangle },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Product Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Price</label>
                          <div className="text-lg font-semibold text-gray-900">{formatCurrency(product.price)}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Stock</label>
                          <div className="text-lg font-semibold text-gray-900">{product.stock}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Category</label>
                          <div className="text-lg font-semibold text-gray-900">{product.category}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Brand</label>
                          <div className="text-lg font-semibold text-gray-900">{product.brand}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Condition</label>
                          <div className="text-lg font-semibold text-gray-900">
                            {product.condition || 'New'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Second Hand</label>
                          <div className="text-lg font-semibold text-gray-900">
                            {product.isSecondHand ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                      {product.description && (
                        <div className="mt-4">
                          <label className="text-sm font-medium text-gray-500">Description</label>
                          <div className="text-gray-900 mt-1">{product.description}</div>
                        </div>
                      )}
                    </div>

                    {/* Product Images */}
                    {product.images && product.images.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {product.images.map((image, index) => (
                            <div
                              key={index}
                              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedImage(image)}
                            >
                              <img
                                src={image}
                                alt={`${product.name} - Image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vendor Information */}
                    {vendor && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
                        <div className="flex items-start space-x-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-200 to-purple-200 text-2xl font-bold text-white shadow-lg">
                            {vendor.displayName ? vendor.displayName[0].toUpperCase() : 'V'}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">{vendor.displayName}</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                              {vendor.email && (
                                <div className="flex items-center space-x-2">
                                  <FaEnvelope className="h-4 w-4" />
                                  <span>{vendor.email}</span>
                                </div>
                              )}
                              {vendor.phoneNumber && (
                                <div className="flex items-center space-x-2">
                                  <FaPhone className="h-4 w-4" />
                                  <span>{vendor.phoneNumber}</span>
                                </div>
                              )}
                              {vendor.shopAddress && (
                                <div className="flex items-center space-x-2">
                                  <FaMapMarkerAlt className="h-4 w-4" />
                                  <span>{vendor.shopAddress}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                vendor.isVerified 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {vendor.isVerified ? 'Verified' : 'Pending Verification'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Orders</span>
                          <span className="text-lg font-semibold text-gray-900">{analytics.totalOrders}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Revenue</span>
                          <span className="text-lg font-semibold text-gray-900">{formatCurrency(analytics.totalRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Avg Order Value</span>
                          <span className="text-lg font-semibold text-gray-900">{formatCurrency(analytics.averageOrderValue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Support Tickets</span>
                          <span className="text-lg font-semibold text-gray-900">{tickets.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {analytics.recentOrders.slice(0, 3).map((order) => (
                          <div key={order.id} className="flex items-center justify-between text-sm">
                            <div>
                              <div className="font-medium text-gray-900">Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</div>
                              <div className="text-gray-600">{formatDate(order.createdAt)}</div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        ))}
                        {analytics.recentOrders.length === 0 && (
                          <div className="text-sm text-gray-500">No recent orders</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  {/* Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100">Total Orders</p>
                          <p className="text-3xl font-bold">{analytics.totalOrders}</p>
                        </div>
                        <FaShoppingCart className="h-8 w-8 text-blue-200" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100">Total Revenue</p>
                          <p className="text-3xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
                        </div>
                        <FaDollarSign className="h-8 w-8 text-green-200" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100">Avg Order Value</p>
                          <p className="text-3xl font-bold">{formatCurrency(analytics.averageOrderValue)}</p>
                        </div>
                        <FaChartLine className="h-8 w-8 text-purple-200" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-100">Support Tickets</p>
                          <p className="text-3xl font-bold">{tickets.length}</p>
                        </div>
                        <FaExclamationTriangle className="h-8 w-8 text-yellow-200" />
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Monthly Revenue Chart */}
                    {analytics.monthlyRevenue.length > 0 && (
                      <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.monthlyRevenue}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                              <Bar dataKey="revenue" fill="#3B82F6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Order Status Distribution */}
                    {analytics.orderStatusDistribution.length > 0 && (
                      <div className="bg-white rounded-lg border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.orderStatusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {analytics.orderStatusDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Product Orders</h3>
                    <span className="text-sm text-gray-600">{orders.length} orders found</span>
                  </div>
                  
                  {orders.length > 0 ? (
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Revenue
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order) => {
                              const productItems = order.items.filter(item => item.id === product.id);
                              const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
                              const totalRevenue = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                              
                              return (
                                <tr
                                  key={order.id}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.customerName || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(order.createdAt)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {totalQuantity}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatCurrency(totalRevenue)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                      <p className="mt-1 text-sm text-gray-500">This product hasn't been ordered yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Support Tickets Tab */}
              {activeTab === 'tickets' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Support Tickets</h3>
                    <span className="text-sm text-gray-600">{tickets.length} tickets found</span>
                  </div>
                  
                  {tickets.length > 0 ? (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => router.push(`/admin/support/${ticket.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-gray-900 mb-2">
                                {ticket.subject || 'No Subject'}
                              </h4>
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {ticket.message}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Ticket #{ticket.id.slice(-6).toUpperCase()}</span>
                                <span>Created {formatDate(ticket.createdAt)}</span>
                                <span>Updated {formatDate(ticket.updatedAt)}</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTicketStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaExclamationTriangle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No support tickets</h3>
                      <p className="mt-1 text-sm text-gray-500">No support tickets found for this product.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
              <img
                src={selectedImage}
                alt="Product"
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
