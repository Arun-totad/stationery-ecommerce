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
  const [userName, setUserName] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");

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
            createdAt: ticketSnap.data().createdAt?.toDate ? ticketSnap.data().createdAt.toDate() : new Date(ticketSnap.data().createdAt),
            updatedAt: ticketSnap.data().updatedAt?.toDate ? ticketSnap.data().updatedAt.toDate() : new Date(ticketSnap.data().updatedAt),
            messages: ticketSnap.data().messages?.map((msg: any) => ({
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
            setOrderNumber("");
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

      setTicket(prevTicket => {
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
      setTicket(prevTicket => {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        Please log in or select a valid support ticket.
      </div>
    );
  }

  const isCurrentUserSender = (senderId: string) => senderId === user.uid;

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-10 rounded-3xl shadow-2xl text-gray-900">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900">Ticket: {ticket.subject}</h1>
            <Link href="/admin/support">
              <button className="px-6 py-2 rounded-xl font-semibold shadow bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 text-gray-900 border border-gray-200 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400">&larr; Back to All Tickets</button>
            </Link>
          </div>
          <div className="mb-8 bg-gradient-to-r from-blue-50 via-yellow-50 to-pink-50 p-8 rounded-2xl border border-blue-100 shadow">
            <div className="flex flex-wrap gap-6 items-center mb-4">
              <div>
                <span className="font-bold text-gray-700">Status:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                  ticket.status === 'open'
                    ? 'bg-red-100 text-red-800'
                    : ticket.status === 'in-progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-700">User:</span>
                <a href={`/admin/users/${ticket.userId}`} className="ml-2 text-blue-700 hover:underline font-semibold">{userName || ticket.userId}</a>
              </div>
              {ticket.orderId && (
                <div>
                  <span className="font-bold text-gray-700">Order:</span>
                  <a href={`/admin/orders/${ticket.orderId}`} className="ml-2 text-blue-700 hover:underline font-semibold">{orderNumber || ticket.orderId}</a>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <span className="font-bold text-gray-700">Opened:</span>
                <span className="ml-2 text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-900">{new Date(ticket.updatedAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="ticketStatus" className="block text-sm font-medium text-gray-700 mb-1">Update Status:</label>
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
          <div className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 rounded-2xl border border-yellow-100 shadow mb-6">
            <h2 className="text-xl font-bold text-yellow-900 mb-6">Messages</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <div className="text-gray-500">No messages yet.</div>
              ) : (
                ticket.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${isCurrentUserSender(msg.senderId) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-xl px-4 py-3 shadow text-sm max-w-xs ${isCurrentUserSender(msg.senderId) ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                      <div className="font-semibold mb-1">{msg.senderRole.charAt(0).toUpperCase() + msg.senderRole.slice(1)}{idx === 0 ? ' (Initial Query)' : ''}</div>
                      <div>{msg.messageText}</div>
                      <div className="text-xs text-gray-500 mt-1 text-right">{msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString() : ''}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-4 mt-6">
            <input
              type="text"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white/90 shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 text-gray-900"
              placeholder="Type your message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-lg hover:from-blue-600 hover:to-pink-500 transition-all"
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