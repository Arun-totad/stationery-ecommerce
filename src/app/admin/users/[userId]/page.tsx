'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserRole, Product, Order, SupportTicket } from '@/types';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import {
  UserIcon,
  EnvelopeIcon as MailIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/solid';
import ConfirmModal from '@/components/ConfirmModal';

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { userRole, user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showConfirm, setShowConfirm] = useState<null | 'admin' | 'admin-manager'>(null);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [pendingAction, setPendingAction] = useState<string>('');

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const fetchedUser = {
            uid: userSnap.id,
            email: userData.email,
            displayName: userData.displayName,
            phoneNumber: userData.phoneNumber || null,
            addresses: userData.addresses || [],
            role: userData.role,
            createdAt:
              userData.createdAt instanceof Timestamp
                ? userData.createdAt.toDate()
                : new Date(userData.createdAt),
            updatedAt:
              userData.updatedAt instanceof Timestamp
                ? userData.updatedAt.toDate()
                : new Date(userData.updatedAt),
          } as User;
          setTargetUser(fetchedUser);

          // Fetch orders for this user
          const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userSnap.id));
          const ordersSnapshot = await getDocs(ordersQuery);
          const fetchedOrders = ordersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];
          setOrders(fetchedOrders);

          // Fetch support tickets for this user
          const ticketsQuery = query(
            collection(db, 'supportTickets'),
            where('userId', '==', userSnap.id)
          );
          const ticketsSnapshot = await getDocs(ticketsQuery);
          const fetchedTickets = ticketsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as SupportTicket[];
          setTickets(fetchedTickets);

          if (fetchedUser.role === 'vendor') {
            setProductsLoading(true);
            const productsQuery = query(
              collection(db, 'products'),
              where('vendorId', '==', fetchedUser.uid)
            );
            const productsSnapshot = await getDocs(productsQuery);
            const productsData = productsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Product[];
            setProducts(productsData);
            setProductsLoading(false);
          }
        } else {
          toast.error('User not found.');
          router.push('/admin');
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        toast.error('Failed to load user details.');
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProducts();
  }, [userId, router]);

  const handleToggleAdminRole = async () => {
    if (!targetUser || userRole !== 'admin-manager') return;
    const newRole: UserRole = targetUser.role === 'admin' ? 'customer' : 'admin';
    const action = newRole === 'admin' ? 'Promote' : 'Depromote';
    setPendingRole(newRole);
    setPendingAction(action);
    setShowConfirm('admin');
  };

  const confirmToggleAdminRole = async () => {
    if (!targetUser || !pendingRole) return;
    const action = pendingRole === 'admin' ? 'Promote' : 'Depromote';
    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { role: pendingRole });
      setTargetUser((prevUser) => (prevUser ? { ...prevUser, role: pendingRole } : null));
      toast.success(`${action}d user successfully!`);
    } catch (error) {
      console.error(`Error ${action.toLowerCase()}ing user:`, error);
      toast.error(`Failed to ${action.toLowerCase()} user.`);
    } finally {
      setShowConfirm(null);
      setPendingRole(null);
      setPendingAction('');
    }
  };

  const handlePromoteToAdminManager = () => {
    setShowConfirm('admin-manager');
  };

  const confirmPromoteToAdminManager = async () => {
    if (!targetUser) return;
    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { role: 'admin-manager' });
      setTargetUser((prevUser) => (prevUser ? { ...prevUser, role: 'admin-manager' } : null));
      toast.success('User promoted to admin-manager!');
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user.');
    } finally {
      setShowConfirm(null);
    }
  };

  // Helper for status badge color
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-pink-100 text-pink-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!targetUser) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center text-gray-900">
          User details not available.
        </div>
      </ProtectedRoute>
    );
  }

  const canToggleRole = userRole === 'admin-manager' && targetUser.uid !== currentUser?.uid;

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="flex min-h-[80vh] flex-col items-center justify-center bg-gray-100 py-10">
        <div className="animate-fade-in flex w-full max-w-2xl flex-col items-center rounded-3xl bg-white p-8 shadow-2xl">
          {/* Avatar and Name */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-200 to-pink-200 text-3xl font-bold text-white shadow-lg">
              {targetUser.displayName
                ? targetUser.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                : 'U'}
            </div>
            <h1 className="mb-1 text-3xl font-extrabold text-gray-900">
              {targetUser.displayName || targetUser.email}
            </h1>
            <span
              className={`rounded-full px-4 py-1 text-base font-semibold ${
                targetUser.role === 'admin-manager'
                  ? 'bg-purple-100 text-purple-700'
                  : targetUser.role === 'admin'
                    ? 'bg-yellow-100 text-yellow-700'
                    : targetUser.role === 'vendor'
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-blue-100 text-blue-700'
              }`}
            >
              {targetUser.role.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>

          {/* Info Cards */}
          <div className="w-full space-y-5">
            {/* Basic Info */}
            <div className="mb-6 rounded-3xl border border-blue-100 bg-white/70 p-7 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-2">
                <UserIcon className="h-7 w-7 text-blue-500" />
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Basic Information
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MailIcon className="h-4 w-4" /> Email
                  </div>
                  <div className="font-semibold text-gray-900">{targetUser.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <PhoneIcon className="h-4 w-4" /> Phone Number
                  </div>
                  <div className="font-semibold text-gray-900">
                    {targetUser.phoneNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Display Name</div>
                  <div className="font-semibold text-gray-900">
                    {targetUser.displayName || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Joined On</div>
                  <div className="font-semibold text-gray-900">
                    {targetUser.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Last Updated</div>
                  <div className="font-semibold text-gray-900">
                    {targetUser.updatedAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            {/* Address Info */}
            <div className="mb-6 rounded-3xl border border-pink-100 bg-white/70 p-7 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-center gap-2">
                <MapPinIcon className="h-7 w-7 text-pink-500" />
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {targetUser.role === 'vendor' ? 'Shop Address' : 'Address Information'}
                </h2>
              </div>
              {targetUser.addresses && targetUser.addresses.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-gray-500">Street</div>
                    <div className="font-semibold text-gray-900">
                      {targetUser.addresses[0].street || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">City</div>
                    <div className="font-semibold text-gray-900">
                      {targetUser.addresses[0].city || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">State</div>
                    <div className="font-semibold text-gray-900">
                      {targetUser.addresses[0].state || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Zip Code</div>
                    <div className="font-semibold text-gray-900">
                      {targetUser.addresses[0].zipCode || 'N/A'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">Country</div>
                    <div className="font-semibold text-gray-900">
                      {targetUser.addresses[0].country || 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700">No address information available.</div>
              )}
            </div>
            {/* Orders Info Card */}
            {orders.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 p-5 shadow">
                <h2 className="mb-2 text-xl font-bold text-gray-800">Orders</h2>
                <div className="mb-2 text-gray-700">
                  {orders.length} order{orders.length > 1 ? 's' : ''} found for this user.
                </div>
                <div className="flex flex-col gap-2">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      className="flex items-center justify-between rounded-lg bg-blue-600 px-4 py-2 text-left font-semibold text-white shadow transition hover:bg-blue-700"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <span>Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                      <span
                        className={`ml-4 rounded-full px-2 py-1 text-xs font-semibold capitalize ${getOrderStatusBadge(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Support Tickets Info Card */}
            {tickets.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 p-5 shadow">
                <h2 className="mb-2 text-xl font-bold text-gray-800">Support Tickets</h2>
                <div className="mb-2 text-gray-700">
                  {tickets.length} ticket{tickets.length > 1 ? 's' : ''} found for this user.
                </div>
                <div className="flex flex-col gap-2">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      className="flex items-center justify-between rounded-lg bg-pink-600 px-4 py-2 text-left font-semibold text-white shadow transition hover:bg-pink-700"
                      onClick={() => router.push(`/admin/support/${ticket.id}`)}
                    >
                      <span>
                        Ticket #{ticket.id.slice(-6).toUpperCase()} -{' '}
                        {ticket.subject || 'No Subject'}
                      </span>
                      <span
                        className={`ml-4 rounded-full px-2 py-1 text-xs font-semibold capitalize ${getTicketStatusBadge(ticket.status)}`}
                      >
                        {ticket.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Products Section (only for vendors) */}
          {targetUser.role === 'vendor' && (
            <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
                <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-lg text-yellow-700">
                  📦
                </span>
                Products{' '}
                <span className="ml-2 text-base font-semibold text-gray-500">
                  ({products.length})
                </span>
              </h2>
              {productsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-500"></div>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-gray-100 bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 p-5 shadow-lg transition-all duration-200 hover:scale-[1.025] hover:shadow-yellow-200"
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-xl font-bold shadow">
                          {product.name ? product.name[0].toUpperCase() : 'P'}
                        </span>
                        <span className="text-lg font-bold text-gray-900 transition group-hover:text-yellow-700">
                          {product.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                        <span>
                          <span className="font-semibold text-gray-900">Price:</span> ₹
                          {product.price.toFixed(2)}
                        </span>
                        <span>
                          <span className="font-semibold text-gray-900">Stock:</span>{' '}
                          {product.stock}
                        </span>
                        <span>
                          <span className="font-semibold text-gray-900">Category:</span>{' '}
                          {product.category}
                        </span>
                        <span>
                          <span className="font-semibold text-gray-900">Brand:</span>{' '}
                          {product.brand}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No products found for this vendor.</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 p-6 shadow">
            <h2 className="mb-2 text-center text-xl font-bold text-gray-800">Actions</h2>
            <div className="flex w-full flex-wrap items-center justify-center gap-3">
              {canToggleRole && targetUser.role !== 'vendor' && (
                <button
                  onClick={handleToggleAdminRole}
                  className={`rounded-lg px-6 py-2 font-semibold text-white shadow transition duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:outline-none ${targetUser.role === 'admin' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {targetUser.role === 'admin' ? 'Depromote to Customer' : 'Promote to Admin'}
                </button>
              )}
              {userRole === 'admin' && targetUser.role === 'admin' && (
                <button
                  onClick={handlePromoteToAdminManager}
                  className="rounded-lg bg-purple-500 px-6 py-2 font-semibold text-white shadow transition duration-200 ease-in-out hover:bg-purple-600 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                >
                  Promote to Admin Manager
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 shadow transition duration-200 ease-in-out hover:bg-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={showConfirm === 'admin'}
        title={pendingAction === 'Promote' ? 'Promote to Admin' : 'Depromote to Customer'}
        message={`Are you sure you want to ${pendingAction.toLowerCase()} this user to ${pendingRole}?`}
        onConfirm={confirmToggleAdminRole}
        onCancel={() => setShowConfirm(null)}
        confirmText={pendingAction === 'Promote' ? 'Promote' : 'Depromote'}
        cancelText="Cancel"
      />
      <ConfirmModal
        open={showConfirm === 'admin-manager'}
        title="Promote to Admin Manager"
        message="Are you sure you want to promote this admin to admin-manager?"
        onConfirm={confirmPromoteToAdminManager}
        onCancel={() => setShowConfirm(null)}
        confirmText="Promote"
        cancelText="Cancel"
      />
    </ProtectedRoute>
  );
}
