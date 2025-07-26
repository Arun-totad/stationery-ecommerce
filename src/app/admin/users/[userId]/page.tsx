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
import { UserIcon, EnvelopeIcon as MailIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/solid';
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
            createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(userData.createdAt),
            updatedAt: userData.updatedAt instanceof Timestamp ? userData.updatedAt.toDate() : new Date(userData.updatedAt),
          } as User;
          setTargetUser(fetchedUser);

          // Fetch orders for this user
          const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userSnap.id));
          const ordersSnapshot = await getDocs(ordersQuery);
          const fetchedOrders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];
          setOrders(fetchedOrders);

          // Fetch support tickets for this user
          const ticketsQuery = query(collection(db, 'supportTickets'), where('userId', '==', userSnap.id));
          const ticketsSnapshot = await getDocs(ticketsQuery);
          const fetchedTickets = ticketsSnapshot.docs.map(doc => ({
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
            const productsData = productsSnapshot.docs.map(doc => ({
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
      setTargetUser(prevUser => prevUser ? { ...prevUser, role: pendingRole } : null);
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
      setTargetUser(prevUser => prevUser ? { ...prevUser, role: 'admin-manager' } : null);
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!targetUser) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="min-h-screen flex items-center justify-center text-gray-900">
          User details not available.
        </div>
      </ProtectedRoute>
    );
  }

  const canToggleRole = userRole === 'admin-manager' && targetUser.uid !== currentUser?.uid;

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-100 py-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl flex flex-col items-center animate-fade-in">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-200 to-pink-200 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-2">
              {targetUser.displayName ? targetUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{targetUser.displayName || targetUser.email}</h1>
            <span className={`px-4 py-1 rounded-full text-base font-semibold
              ${targetUser.role === 'admin-manager'
                ? 'bg-purple-100 text-purple-700'
                : targetUser.role === 'admin'
                  ? 'bg-yellow-100 text-yellow-700'
                  : targetUser.role === 'vendor'
                    ? 'bg-pink-100 text-pink-700'
                    : 'bg-blue-100 text-blue-700'
              }`}>
              {targetUser.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>

          {/* Info Cards */}
          <div className="w-full space-y-5">
            {/* Basic Info */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-7 mb-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="text-blue-500 w-7 h-7" />
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Basic Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm"><MailIcon className="w-4 h-4" /> Email</div>
                  <div className="font-semibold text-gray-900">{targetUser.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm"><PhoneIcon className="w-4 h-4" /> Phone Number</div>
                  <div className="font-semibold text-gray-900">{targetUser.phoneNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Display Name</div>
                  <div className="font-semibold text-gray-900">{targetUser.displayName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Joined On</div>
                  <div className="font-semibold text-gray-900">{targetUser.createdAt.toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Last Updated</div>
                  <div className="font-semibold text-gray-900">{targetUser.updatedAt.toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            {/* Address Info */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-7 mb-6 border border-pink-100">
              <div className="flex items-center gap-2 mb-4">
                <MapPinIcon className="text-pink-500 w-7 h-7" />
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{targetUser.role === 'vendor' ? 'Shop Address' : 'Address Information'}</h2>
              </div>
              {targetUser.addresses && targetUser.addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <div className="text-gray-500 text-sm">Street</div>
                    <div className="font-semibold text-gray-900">{targetUser.addresses[0].street || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">City</div>
                    <div className="font-semibold text-gray-900">{targetUser.addresses[0].city || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">State</div>
                    <div className="font-semibold text-gray-900">{targetUser.addresses[0].state || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-sm">Zip Code</div>
                    <div className="font-semibold text-gray-900">{targetUser.addresses[0].zipCode || 'N/A'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-gray-500 text-sm">Country</div>
                    <div className="font-semibold text-gray-900">{targetUser.addresses[0].country || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700">No address information available.</div>
              )}
            </div>
            {/* Orders Info Card */}
            {orders.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 rounded-2xl shadow p-5">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Orders</h2>
                <div className="text-gray-700 mb-2">{orders.length} order{orders.length > 1 ? 's' : ''} found for this user.</div>
                <div className="flex flex-col gap-2">
                  {orders.map(order => (
                    <button
                      key={order.id}
                      className="flex items-center justify-between px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition text-left"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <span>Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                      <span className={`ml-4 text-xs px-2 py-1 rounded-full capitalize font-semibold ${getOrderStatusBadge(order.status)}`}>{order.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Support Tickets Info Card */}
            {tickets.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 rounded-2xl shadow p-5">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Support Tickets</h2>
                <div className="text-gray-700 mb-2">{tickets.length} ticket{tickets.length > 1 ? 's' : ''} found for this user.</div>
                <div className="flex flex-col gap-2">
                  {tickets.map(ticket => (
                    <button
                      key={ticket.id}
                      className="flex items-center justify-between px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow transition text-left"
                      onClick={() => router.push(`/admin/support/${ticket.id}`)}
                    >
                      <span>Ticket #{ticket.id.slice(-6).toUpperCase()} - {ticket.subject || 'No Subject'}</span>
                      <span className={`ml-4 text-xs px-2 py-1 rounded-full capitalize font-semibold ${getTicketStatusBadge(ticket.status)}`}>{ticket.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Products Section (only for vendors) */}
          {targetUser.role === 'vendor' && (
            <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-2xl mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-lg">📦</span>
                Products <span className="ml-2 text-base font-semibold text-gray-500">({products.length})</span>
              </h2>
              {productsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group cursor-pointer bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 rounded-2xl shadow-lg p-5 flex flex-col gap-2 border border-gray-100 hover:shadow-yellow-200 transition-all duration-200 hover:scale-[1.025]"
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-xl font-bold shadow">{product.name ? product.name[0].toUpperCase() : 'P'}</span>
                        <span className="text-lg font-bold text-gray-900 group-hover:text-yellow-700 transition">{product.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                        <span><span className="font-semibold text-gray-900">Price:</span> ₹{product.price.toFixed(2)}</span>
                        <span><span className="font-semibold text-gray-900">Stock:</span> {product.stock}</span>
                        <span><span className="font-semibold text-gray-900">Category:</span> {product.category}</span>
                        <span><span className="font-semibold text-gray-900">Brand:</span> {product.brand}</span>
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
          <div className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 rounded-2xl shadow p-6 flex flex-col items-center justify-center gap-4 mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Actions</h2>
            <div className="flex flex-wrap gap-3 items-center justify-center w-full">
              {canToggleRole && targetUser.role !== 'vendor' && (
                <button
                  onClick={handleToggleAdminRole}
                  className={`px-6 py-2 rounded-lg font-semibold shadow transition duration-200 ease-in-out text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${targetUser.role === 'admin' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  {targetUser.role === 'admin' ? 'Depromote to Customer' : 'Promote to Admin'}
                </button>
              )}
              {userRole === 'admin' && targetUser.role === 'admin' && (
                <button
                  onClick={handlePromoteToAdminManager}
                  className="px-6 py-2 rounded-lg font-semibold shadow transition duration-200 ease-in-out bg-purple-500 hover:bg-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  Promote to Admin Manager
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 font-semibold shadow transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400"
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