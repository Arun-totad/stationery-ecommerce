'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupportTicket } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

function formatDateDDMMYYYY(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function AdminSupportTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const q = query(
          collection(db, 'supportTickets'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedTickets: SupportTicket[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt),
        })) as SupportTicket[];

        // Fetch user display names in batch
        const userIds = Array.from(new Set(fetchedTickets.map(t => t.userId)));
        const userNameMap: Record<string, string> = {};
        await Promise.all(userIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              userNameMap[uid] = userDoc.data().displayName || uid;
            } else {
              userNameMap[uid] = uid;
            }
          } catch {
            userNameMap[uid] = uid;
          }
        }));
        setUserNames(userNameMap);

        // Fetch order numbers in batch
        const orderIds = Array.from(new Set(fetchedTickets.map(t => t.orderId).filter((oid): oid is string => typeof oid === 'string')));
        const orderNumberMap: Record<string, string> = {};
        await Promise.all(orderIds.map(async (oid) => {
          try {
            const orderDoc = await getDoc(doc(db, 'orders', oid));
            if (orderDoc.exists()) {
              orderNumberMap[oid] = orderDoc.data().orderNumber || oid;
            } else {
              orderNumberMap[oid] = oid;
            }
          } catch {
            orderNumberMap[oid] = oid;
          }
        }));
        setOrderNumbers(orderNumberMap);
        setTickets(fetchedTickets);
      } catch (error) {
        console.error('Error fetching admin support tickets:', error);
        toast.error('Failed to load support tickets.');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchTickets();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        Please log in as an administrator to view support tickets.
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-10 rounded-3xl shadow-2xl text-gray-900">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-10 text-center">Support Tickets</h1>
          {loading ? (
            <div className="flex justify-center mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center text-gray-600 p-8">
              <p className="text-lg mb-4">No support tickets found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="bg-white rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-blue-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50">
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest rounded-tl-2xl">Ticket ID</th>
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Subject</th>
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">User</th>
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Order</th>
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Created At</th>
                      <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest rounded-tr-2xl">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                        onClick={() => router.push(`/admin/support/${ticket.id}`)}
                      >
                        <td className="px-6 py-3 whitespace-nowrap text-base font-bold text-blue-900">{ticket.id.slice(-8)}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-base text-gray-900">{ticket.subject}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-base text-blue-700 font-semibold">
                          <a href={`/admin/users/${ticket.userId}`} className="hover:underline">
                            {userNames[ticket.userId] || ticket.userId}
                          </a>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-base text-blue-700 font-semibold">
                          {ticket.orderId ? (
                            <a href={`/admin/orders/${ticket.orderId}`} className="hover:underline">
                              {orderNumbers[ticket.orderId!] || ticket.orderId}
                            </a>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                            ticket.status === 'open'
                              ? 'bg-red-100 text-red-800'
                              : ticket.status === 'in-progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">
                          {formatDateDDMMYYYY(ticket.createdAt)} {new Date(ticket.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">
                          {formatDateDDMMYYYY(ticket.updatedAt)} {new Date(ticket.updatedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 