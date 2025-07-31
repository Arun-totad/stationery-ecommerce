'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SupportTicket, Message, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { UserIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

function formatDateTimeDDMMYYYY(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day}/${month}/${year} ${time}`;
}

export default function AccountSupportTicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { user, userRole, loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reopenMessage, setReopenMessage] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);
  const [showCloseInput, setShowCloseInput] = useState(false);
  const [closeComment, setCloseComment] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) return;
      setLoadingTicket(true);
      try {
        const ticketRef = doc(db, 'supportTickets', ticketId);
        const ticketSnap = await getDoc(ticketRef);

        if (ticketSnap.exists()) {
          const data = ticketSnap.data();
          setTicket({
            id: ticketSnap.id,
            userId: data.userId,
            subject: data.subject,
            message: data.message,
            status: data.status,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            messages: (data.messages || []).map((msg: any) => ({
              senderId: msg.senderId,
              senderRole: msg.senderRole,
              messageText: msg.messageText,
              timestamp: msg.timestamp?.toDate(),
            })),
            orderId: data.orderId,
          });
          // Fetch order number if orderId exists
          if (data.orderId) {
            const orderRef = doc(db, 'orders', data.orderId);
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists()) {
              const orderData = orderSnap.data();
              setOrderNumber(orderData.orderNumber || data.orderId);
            } else {
              setOrderNumber(data.orderId);
            }
          } else {
            setOrderNumber(null);
          }

          // Redirect if user is not the owner
          if (user && user.uid !== data.userId) {
            toast.error('You are not authorized to view this ticket.');
            router.push('/account/support');
            return;
          }
        } else {
          toast.error('Ticket not found.');
          router.push('/account/support');
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast.error('Failed to load ticket details.');
        router.push('/account/support');
      } finally {
        setLoadingTicket(false);
      }
    };

    if (ticketId && !authLoading) {
      fetchTicket();
    }
  }, [ticketId, user, authLoading, router]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || !user) return;

    setIsSubmitting(true);
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      const message: Message = {
        senderId: user.uid,
        senderRole: userRole || 'customer',
        messageText: newMessage.trim(),
        timestamp: Timestamp.now().toDate(),
      };

      await updateDoc(ticketRef, {
        messages: arrayUnion(message),
        updatedAt: message.timestamp,
        status: ticket.status === 'resolved' ? 'in-progress' : ticket.status, // Reopen if resolved
      });

      // Create notification for new message
      try {
        const notificationMessage = userRole === 'customer' 
          ? `New message in support ticket "${ticket.subject}"`
          : `New message from customer in ticket "${ticket.subject}"`;
        
        const notificationData = {
          type: 'support_message',
          message: notificationMessage,
          createdAt: new Date(),
          read: false,
          data: { ticketId, ticketNumber: ticket.id },
          link: `/account/support/${ticketId}`,
          linkLabel: ticket.id,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', ticket.userId, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }

      setTicket((prevTicket) => {
        if (!prevTicket) return null;
        const updatedMessages = [...prevTicket.messages, message];
        return {
          ...prevTicket,
          messages: updatedMessages,
          updatedAt: message.timestamp,
          status: ticket.status === 'resolved' ? 'in-progress' : ticket.status,
        };
      });
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!reopenMessage.trim() || !ticket || !user) {
      toast.error('Please provide a message to reopen the ticket.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      const message: Message = {
        senderId: user.uid,
        senderRole: userRole || 'customer',
        messageText: `Ticket reopened: ${reopenMessage.trim()}`,
        timestamp: Timestamp.now().toDate(),
      };

      await updateDoc(ticketRef, {
        messages: arrayUnion(message),
        updatedAt: message.timestamp,
        status: 'in-progress',
      });

      // Create notification for ticket reopening
      try {
        const notificationData = {
          type: 'support_ticket_reopened',
          message: `Support ticket "${ticket.subject}" has been reopened.`,
          createdAt: new Date(),
          read: false,
          data: { ticketId, ticketNumber: ticket.id },
          link: `/account/support/${ticketId}`,
          linkLabel: ticket.id,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', ticket.userId, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }

      setTicket((prevTicket) => {
        if (!prevTicket) return null;
        const updatedMessages = [...prevTicket.messages, message];
        return {
          ...prevTicket,
          messages: updatedMessages,
          updatedAt: message.timestamp,
          status: 'in-progress',
        };
      });
      setReopenMessage('');
      setShowReopenInput(false);
      toast.success('Ticket reopened successfully!');
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast.error('Failed to reopen ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTicket = async (comment?: string) => {
    if (!ticket || !user) return;

    setIsSubmitting(true);
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      const updates: any = {
        status: 'closed',
        updatedAt: Timestamp.now().toDate(),
      };

      if (comment) {
        const closeMessage: Message = {
          senderId: user.uid,
          senderRole: userRole || 'customer',
          messageText: `Ticket closed with comment: ${comment.trim()}`,
          timestamp: Timestamp.now().toDate(),
        };
        updates.messages = arrayUnion(closeMessage);
      } else {
        const closeMessage: Message = {
          senderId: user.uid,
          senderRole: userRole || 'customer',
          messageText: 'Ticket closed.',
          timestamp: Timestamp.now().toDate(),
        };
        updates.messages = arrayUnion(closeMessage);
      }

      await updateDoc(ticketRef, updates);

      // Create notification for ticket closing
      try {
        const notificationData = {
          type: 'support_ticket_closed',
          message: `Support ticket "${ticket.subject}" has been closed.`,
          createdAt: new Date(),
          read: false,
          data: { ticketId, ticketNumber: ticket.id },
          link: `/account/support/${ticketId}`,
          linkLabel: ticket.id,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', ticket.userId, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }

      setTicket((prevTicket) => {
        if (!prevTicket) return null;
        let updatedMessages = [...prevTicket.messages];
        const newStatus = 'closed';

        if (comment) {
          updatedMessages.push({
            senderId: user.uid,
            senderRole: userRole || 'customer',
            messageText: `Ticket closed with comment: ${comment.trim()}`,
            timestamp: Timestamp.now().toDate(),
          });
        } else {
          updatedMessages.push({
            senderId: user.uid,
            senderRole: userRole || 'customer',
            messageText: 'Ticket closed.',
            timestamp: Timestamp.now().toDate(),
          });
        }

        return {
          ...prevTicket,
          status: newStatus,
          messages: updatedMessages,
          updatedAt: Timestamp.now().toDate(),
        };
      });
      toast.success('Ticket closed successfully!');
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSenderName = (senderId: string, senderRole: UserRole) => {
    if (user && senderId === user.uid) {
      return 'You';
    } else if (senderRole === 'admin' || senderRole === 'admin-manager') {
      return 'Admin';
    } else if (senderRole === 'vendor') {
      return 'Vendor';
    } else {
      return 'Customer';
    }
  };

  if (loadingTicket || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket || (user && user.uid !== ticket.userId)) {
    // Redirect is handled in useEffect, but this provides a fallback UI
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">
          You are not authorized to view this ticket or it does not exist.
        </p>
      </div>
    );
  }

  const isCustomer = user && user.uid === ticket.userId;

  return (
    <div className="animate-fade-in-up min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-white px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="animate-fade-in-up mx-auto max-w-4xl rounded-3xl border-2 border-transparent bg-white p-8 shadow-2xl"
        style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-7 w-7 text-blue-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
            <h1 className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-3xl font-extrabold text-transparent">
              Support Ticket: {ticket.subject}
            </h1>
          </div>
          <button
            onClick={() => router.push('/account/support')}
            className="inline-flex items-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
          >
            Back to Support Tickets
          </button>
        </div>
        <hr className="mb-6 h-1 rounded-full border-0 bg-gradient-to-r from-blue-400 via-pink-300 to-blue-400" />
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Ticket ID: <span className="font-mono text-blue-700">{ticket.id}</span>
          </p>
          {ticket.orderId && (
            <p className="text-sm text-gray-600">
              Order Number:{' '}
              <Link
                href={`/account/orders/${ticket.orderId}`}
                className="font-mono font-bold text-blue-600 hover:underline"
              >
                {orderNumber || ticket.orderId}
              </Link>
            </p>
          )}
          <p className="text-sm text-gray-600">
            Status:
            <span
              className={`ml-1 inline-flex rounded-full px-3 py-1 text-xs leading-5 font-bold shadow-sm transition-all duration-200 ${
                ticket.status === 'open'
                  ? 'bg-green-100 text-green-700 shadow-green-200'
                  : ticket.status === 'in-progress'
                    ? 'bg-yellow-100 text-yellow-700 shadow-yellow-200'
                    : ticket.status === 'resolved'
                      ? 'bg-blue-100 text-blue-700 shadow-blue-200'
                      : 'bg-red-100 text-red-700 shadow-red-200'
              } `}
            >
              {ticket.status}
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Created At:{' '}
            <span className="font-mono">
              {ticket.createdAt ? formatDateTimeDDMMYYYY(ticket.createdAt) : 'N/A'}
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Last Updated:{' '}
            <span className="font-mono">
              {ticket.updatedAt ? formatDateTimeDDMMYYYY(ticket.updatedAt) : 'N/A'}
            </span>
          </p>
        </div>
        {/* Initial Message */}
        <div className="animate-fade-in-up mb-6 rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-pink-50 p-4">
          <p className="mb-2 text-sm font-bold text-blue-700">Initial Query:</p>
          <p className="text-gray-900">{ticket.message}</p>
        </div>
        {/* Chat History */}
        <div className="animate-fade-in-up mb-6 max-h-96 space-y-4 overflow-y-auto rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
          {ticket.messages.length > 0 ? (
            ticket.messages.map((msg, index) => {
              const isSystemMessage =
                msg.messageText.startsWith('Ticket closed') ||
                msg.messageText.startsWith('Ticket reopened');
              return (
                <div
                  key={index}
                  className={`flex ${isSystemMessage ? 'justify-center' : msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-2xl p-3 shadow transition-all duration-200 sm:max-w-md lg:max-w-lg ${
                      msg.messageText.startsWith('Ticket closed')
                        ? 'w-full max-w-none border-2 border-red-200 bg-red-100 text-center text-red-800'
                        : msg.messageText.startsWith('Ticket reopened')
                          ? 'w-full max-w-none border-2 border-green-200 bg-green-100 text-center text-green-800'
                          : msg.senderId === user?.uid
                            ? 'border-2 border-blue-200 bg-gradient-to-br from-blue-100 to-pink-100 text-gray-900 hover:scale-105 hover:shadow-lg'
                            : 'border-2 border-gray-200 bg-white text-gray-900 hover:scale-105 hover:shadow-lg'
                    } ${isSystemMessage ? 'border-none' : ''}`}
                  >
                    <p className="mb-1 text-xs font-semibold text-gray-500">
                      {getSenderName(msg.senderId, msg.senderRole)} at{' '}
                      {formatDateTimeDDMMYYYY(msg.timestamp)}
                    </p>
                    <p>{msg.messageText}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-600">No chat history for this ticket yet.</p>
          )}
        </div>
        {/* Message Input and Status Actions */}
        <div className="animate-fade-in-up mt-6 border-t border-blue-100 pt-6">
          <h2 className="mb-4 text-xl font-bold text-blue-700">Respond to Ticket</h2>

          {(ticket.status === 'resolved' || ticket.status === 'closed') && isCustomer && (
            <div className="mb-4">
              <button
                onClick={() => setShowReopenInput(!showReopenInput)}
                className="inline-flex items-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none"
              >
                {showReopenInput ? 'Cancel Reopen' : 'Reopen Ticket'}
              </button>
              {showReopenInput && (
                <div className="mt-4">
                  <label htmlFor="reopen-message" className="sr-only">
                    Message to reopen
                  </label>
                  <textarea
                    id="reopen-message"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Please explain why you are reopening this ticket..."
                    value={reopenMessage}
                    onChange={(e) => setReopenMessage(e.target.value)}
                  ></textarea>
                  <button
                    onClick={handleReopenTicket}
                    className="mt-2 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                    disabled={isSubmitting || !reopenMessage.trim()}
                  >
                    {isSubmitting ? 'Reopening...' : 'Submit Reopen Request'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Close Ticket Button for Customer */}
          {ticket.status !== 'closed' && isCustomer && (
            <div className="mb-4">
              <button
                onClick={() => setShowCloseInput(!showCloseInput)}
                className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                disabled={isSubmitting}
              >
                {showCloseInput ? 'Cancel Close' : 'Close Ticket'}
              </button>
              {showCloseInput && (
                <div className="mt-4">
                  <label htmlFor="close-message" className="sr-only">
                    Message to close
                  </label>
                  <textarea
                    id="close-message"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Optional: Add a comment before closing..."
                    value={closeComment}
                    onChange={(e) => setCloseComment(e.target.value)}
                  ></textarea>
                  <button
                    onClick={() => handleCloseTicket(closeComment)}
                    className="mt-2 inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Closing...' : 'Confirm Close'}
                  </button>
                </div>
              )}
            </div>
          )}

          {ticket.status !== 'closed' && isCustomer && !showReopenInput && !showCloseInput && (
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="comment" className="sr-only">
                  Add your message
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Add your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                ></textarea>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                    onClick={handleSendMessage}
                    disabled={isSubmitting || !newMessage.trim()}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
