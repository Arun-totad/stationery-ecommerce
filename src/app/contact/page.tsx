'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.displayName) {
        setName(user.displayName);
      }
      if (user.email) {
        setEmail(user.email);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast.error('Please log in to submit a support ticket.');
      setLoading(false);
      return;
    }

    try {
      const newTicket = {
        userId: user.uid,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        messages: [],
      };

      await addDoc(collection(db, 'supportTickets'), newTicket);

      toast.success('Your support ticket has been submitted!');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');

      router.push('/account/support');
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error('Failed to submit your support ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-pink-50 px-4 py-16">
      <div className="animate-fade-in relative flex w-full max-w-md flex-col items-center rounded-3xl border border-blue-100 bg-white/90 p-10 shadow-2xl">
        {/* Decorative Gradient Icon */}
        <span className="absolute -top-10 left-1/2 inline-flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6" />
            <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24" />
            <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6" />
          </svg>
        </span>
        {/* Gradient Accent Bar */}
        <div className="mt-8 mb-6 h-2 w-20 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
        <h2 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm md:text-4xl">
          Contact{' '}
          <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
            Us
          </span>
        </h2>
        <p className="mb-8 text-center text-base font-medium text-gray-600 md:text-lg">
          Submit a support ticket and we'll get back to you soon.
        </p>
        <form className="w-full space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              id="subject"
              name="subject"
              type="text"
              required
              className="block w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              className="block w-full resize-none rounded-xl border border-gray-300 bg-white/80 px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Your Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 px-4 py-3 text-base font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-pink-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
