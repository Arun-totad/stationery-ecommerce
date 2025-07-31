'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/types';
import { addOrderActivity } from '@/lib/orderActivity';

export default function NewSupportTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrderNumber = async () => {
      if (orderId) {
        setLoadingOrder(true);
        try {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const data = orderSnap.data();
            setOrderNumber(data.orderNumber || orderId);
            setSubject((prev) => prev || `Order Issue: ${data.orderNumber || orderId}`);
          } else {
            setOrderNumber(orderId);
            setSubject((prev) => prev || `Order Issue: ${orderId}`);
          }
        } catch {
          setOrderNumber(orderId);
          setSubject((prev) => prev || `Order Issue: ${orderId}`);
        } finally {
          setLoadingOrder(false);
        }
      }
    };
    fetchOrderNumber();
    // eslint-disable-next-line
  }, [orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (!user) {
      toast.error('You must be logged in to create a support ticket.');
      return;
    }
    setLoading(true);
    try {
      // Generate custom ticket ID: TICKET-YYYYMMDD-COUNTER
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      let ticketCounter = 0;
      const ticketMetaRef = doc(db, 'ticketMeta', 'numbering');
      await runTransaction(db, async (transaction) => {
        const metaSnap = await transaction.get(ticketMetaRef);
        let lastNumbers: Record<string, number> = {};
        if (metaSnap.exists()) {
          lastNumbers = metaSnap.data().lastNumbers || {};
        }
        ticketCounter = (lastNumbers[dateStr] || 0) + 1;
        transaction.set(
          ticketMetaRef,
          { lastNumbers: { ...lastNumbers, [dateStr]: ticketCounter } },
          { merge: true }
        );
      });
      const ticketId = `TICKET-${dateStr}-${String(ticketCounter).padStart(4, '0')}`;
      // Create the ticket with the custom ID
      await setDoc(doc(db, 'supportTickets', ticketId), {
        userId: user.uid,
        subject: subject.replace(/Order Issue:.*/, `Order Issue: ${orderNumber || orderId}`),
        orderId: orderId ? String(orderId) : undefined,
        status: 'open',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messages: [
          {
            senderId: user.uid,
            senderRole: (user.role || 'customer') as UserRole,
            messageText: message,
            timestamp: Timestamp.now().toDate(),
          },
        ],
        ticketNumber: ticketId,
      });

      // Create notification for ticket creation
      try {
        const notificationData = {
          type: 'support_ticket_created',
          message: `Support ticket "${subject}" has been created successfully.`,
          createdAt: new Date(),
          read: false,
          data: { ticketId, ticketNumber: ticketId },
          link: `/account/support/${ticketId}`,
          linkLabel: ticketId,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', user.uid, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }

      // Add activity log to the order if this ticket is associated with an order
      if (orderId) {
        try {
          await addOrderActivity(
            orderId,
            'support_ticket_created',
            `Support ticket created: ${subject}`,
            user.uid,
            user.role || 'customer',
            undefined,
            ticketId
          );
        } catch (activityErr) {
          console.error('Failed to add support ticket activity to order:', activityErr);
        }
      }

      toast.success('Support ticket created!');
      router.push('/account/support');
    } catch (error) {
      toast.error('Failed to create support ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-white">
      <form
        onSubmit={handleSubmit}
        className="animate-fade-in-up w-full max-w-md rounded-3xl border-2 border-transparent bg-white p-8 shadow-2xl"
        style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}
      >
        <div className="mb-6 flex items-center gap-2">
          <svg
            className="h-7 w-7 text-blue-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
          <h1 className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-2xl font-extrabold text-transparent">
            Create Support Ticket
          </h1>
        </div>
        <hr className="mb-6 h-1 rounded-full border-0 bg-gradient-to-r from-blue-400 via-pink-300 to-blue-400" />
        {orderId && (
          <div className="mb-4">
            <label className="mb-1 block font-medium text-gray-700">Order Number</label>
            <input
              type="text"
              value={loadingOrder ? 'Loading...' : orderNumber}
              disabled
              className="w-full rounded border border-blue-200 bg-blue-50 px-3 py-2 font-mono font-semibold text-blue-900 transition focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
          </div>
        )}
        <div className="mb-4">
          <label className="mb-1 block font-medium text-gray-700">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={`w-full rounded border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-gray-900 placeholder-gray-400 transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none ${orderId ? 'bg-blue-100 font-bold text-blue-700' : ''}`}
            placeholder="Subject"
            disabled={!!orderId}
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block font-medium text-gray-700">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] w-full rounded border border-blue-200 bg-blue-50 px-3 py-3 text-base font-medium text-gray-900 placeholder-gray-400 transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200 focus:outline-none"
            placeholder="Describe your issue..."
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-3 text-lg font-bold text-white shadow transition-all duration-200 hover:scale-105 hover:shadow-lg"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
