'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupportTicket, Message, UserRole } from '@/types';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AdminSupportTicketDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const params = useParams();
  const ticketId = params.ticketId as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [newStatus, setNewStatus] = useState<SupportTicket['status']>('open');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId || authLoading || !user) return;

      setLoading(true);
      try {
        const ticketRef = doc(db, 'supportTickets', ticketId);
        const ticketSnap = await getDoc(ticketRef);

        if (ticketSnap.exists()) {
          const fetchedTicket = {
            id: ticketSnap.id,
            ...ticketSnap.data(),
            createdAt: ticketSnap.data().createdAt?.toDate
              ? ticketSnap.data().createdAt.toDate()
              : new Date(ticketSnap.data().createdAt),
            updatedAt: ticketSnap.data().updatedAt?.toDate
              ? ticketSnap.data().updatedAt.toDate()
              : new Date(ticketSnap.data().updatedAt),
            messages:
              ticketSnap.data().messages?.map((msg: any) => ({
                ...msg,
                timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp),
              })) || [],
          } as SupportTicket;

          setTicket(fetchedTicket);
          setNewStatus(fetchedTicket.status);

          // Fetch user display name
          try {
            const userDoc = await getDoc(doc(db, 'users', fetchedTicket.userId));
            if (userDoc.exists()) {
              setUserName(userDoc.data().displayName || fetchedTicket.userId);
            } else {
              setUserName(fetchedTicket.userId);
            }
          } catch {
            setUserName(fetchedTicket.userId);
          }
          // Fetch order number
          if (fetchedTicket.orderId) {
            try {
              const orderDoc = await getDoc(doc(db, 'orders', fetchedTicket.orderId));
              if (orderDoc.exists()) {
                setOrderNumber(orderDoc.data().orderNumber || fetchedTicket.orderId);
              } else {
                setOrderNumber(fetchedTicket.orderId);
              }
            } catch {
              setOrderNumber(fetchedTicket.orderId);
            }
          } else {
            setOrderNumber('');
          }
        } else {
          toast.error('Support ticket not found.');
          router.push('/admin/support');
        }
      } catch (error) {
        console.error('Error fetching support ticket:', error);
        toast.error('Failed to load support ticket.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, user, authLoading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !ticket) return;

    const message: Message = {
      senderId: user.uid,
      senderRole: userRole as UserRole,
      messageText: newMessage.trim(),
      timestamp: Timestamp.now().toDate(),
    };

    try {
      const ticketRef = doc(db, 'supportTickets', ticket.id);
      await updateDoc(ticketRef, {
        messages: arrayUnion(message),
        updatedAt: Timestamp.now(),
      });

      setTicket((prevTicket) => {
        if (!prevTicket) return null;
        return {
          ...prevTicket,
          messages: [...prevTicket.messages, message],
          updatedAt: message.timestamp,
        };
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message.');
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as SupportTicket['status'];
    setNewStatus(status);
    if (!ticket) return;

    try {
      const ticketRef = doc(db, 'supportTickets', ticket.id);
      await updateDoc(ticketRef, {
        status: status,
        updatedAt: Timestamp.now(),
      });
      setTicket((prevTicket) => {
        if (!prevTicket) return null;
        return {
          ...prevTicket,
          status: status,
          updatedAt: Timestamp.now().toDate(),
        };
      });
      toast.success(`Ticket status updated to ${status}.`);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-900">
        Please log in or select a valid support ticket.
      </div>
    );
  }

  const isCurrentUserSender = (senderId: string) => senderId === user.uid;

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 px-4 text-gray-900 shadow-2xl sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-gray-900">Ticket: {ticket.subject}</h1>
            <Link href="/admin/support">
              <button className="rounded-xl border border-gray-200 bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 px-6 py-2 font-semibold text-gray-900 shadow hover:bg-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none">
                &larr; Back to All Tickets
              </button>
            </Link>
          </div>
          <div className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-yellow-50 to-pink-50 p-8 shadow">
            <div className="mb-4 flex flex-wrap items-center gap-6">
              <div>
                <span className="font-bold text-gray-700">Status:</span>
                <span
                  className={`ml-2 rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                    ticket.status === 'open'
                      ? 'bg-red-100 text-red-800'
                      : ticket.status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-700">User:</span>
                <a
                  href={`/admin/users/${ticket.userId}`}
                  className="ml-2 font-semibold text-blue-700 hover:underline"
                >
                  {userName || ticket.userId}
                </a>
              </div>
              {ticket.orderId && (
                <div>
                  <span className="font-bold text-gray-700">Order:</span>
                  <a
                    href={`/admin/orders/${ticket.orderId}`}
                    className="ml-2 font-semibold text-blue-700 hover:underline"
                  >
                    {orderNumber || ticket.orderId}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="font-bold text-gray-700">Opened:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <label
                htmlFor="ticketStatus"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Update Status:
              </label>
              <select
                id="ticketStatus"
                value={newStatus}
                onChange={handleStatusChange}
                className="block w-48 rounded-xl border-gray-300 shadow focus:border-yellow-400 focus:ring-yellow-400"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="mb-6 rounded-2xl border border-yellow-100 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 shadow">
            <h2 className="mb-6 text-xl font-bold text-yellow-900">Messages</h2>
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <div className="text-gray-500">No messages yet.</div>
              ) : (
                ticket.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${isCurrentUserSender(msg.senderId) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-xl px-4 py-3 text-sm shadow ${isCurrentUserSender(msg.senderId) ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}
                    >
                      <div className="mb-1 font-semibold">
                        {msg.senderRole.charAt(0).toUpperCase() + msg.senderRole.slice(1)}
                        {idx === 0 ? ' (Initial Query)' : ''}
                      </div>
                      <div>{msg.messageText}</div>
                      <div className="mt-1 text-right text-xs text-gray-500">
                        {msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString() : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <form onSubmit={handleSendMessage} className="mt-6 flex gap-4">
            <input
              type="text"
              className="flex-1 rounded-xl border border-gray-300 bg-white/90 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-3 text-base font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-pink-500"
              disabled={!newMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
