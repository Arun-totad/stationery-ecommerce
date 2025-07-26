'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { SupportTicket } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

function formatDateDDMMYYYY(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function AccountSupportPage() {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTickets = async () => {
      if (authLoading || !user) return;

      setLoadingTickets(true);
      try {
        const q = query(
          collection(db, 'supportTickets'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedTickets: SupportTicket[] = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          fetchedTickets.push({
            id: docSnapshot.id,
            userId: data.userId,
            subject: data.subject,
            message: data.message,
            status: data.status,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            messages: data.messages || [],
          });
        });
        setTickets(fetchedTickets);
      } catch (error) {
        console.error('Error fetching support tickets:', error);
        toast.error('Failed to load support tickets.');
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [user, authLoading]);

  if (authLoading || loadingTickets) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading support tickets...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Please log in to view your support tickets.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-white py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl shadow-2xl border-2 border-transparent animate-fade-in-up" style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">My Support Tickets</h1>
          </div>
        </div>
        <hr className="mb-6 border-0 h-1 bg-gradient-to-r from-blue-400 via-pink-300 to-blue-400 rounded-full" />
        {tickets.length === 0 ? (
          <p className="text-gray-600 text-center">You have no support tickets yet.</p>
        ) : (
          <div className="overflow-x-auto animate-fade-in-up">
            <table className="min-w-full divide-y divide-blue-100">
              <thead className="bg-blue-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider"
                  >
                    Subject
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider"
                  >
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-100">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-pink-50 transition-all duration-200 animate-fade-in-up"
                    onClick={() => router.push(`/account/support/${ticket.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm transition-all duration-200
                          ${ticket.status === 'open'
                            ? 'bg-green-100 text-green-700 shadow-green-200'
                            : ticket.status === 'in-progress'
                            ? 'bg-yellow-100 text-yellow-700 shadow-yellow-200'
                            : ticket.status === 'resolved'
                            ? 'bg-blue-100 text-blue-700 shadow-blue-200'
                            : 'bg-red-100 text-red-700 shadow-red-200'}
                        `}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.updatedAt ? formatDateDDMMYYYY(ticket.updatedAt) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 