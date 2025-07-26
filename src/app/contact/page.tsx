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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-pink-50 flex items-center justify-center py-16 px-4">
      <div className="relative max-w-md w-full bg-white/90 p-10 rounded-3xl shadow-2xl border border-blue-100 flex flex-col items-center animate-fade-in">
        {/* Decorative Gradient Icon */}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg border-4 border-white">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6"/>
            <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24"/>
            <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6"/>
          </svg>
        </span>
        {/* Gradient Accent Bar */}
        <div className="w-20 h-2 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full mb-6 mt-8" />
        <h2 className="text-center text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow-sm">
          Contact <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">Us</span>
        </h2>
        <p className="text-center text-base md:text-lg text-gray-600 mb-8 font-medium">
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
              className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/80 shadow-sm"
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
              className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/80 shadow-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              id="subject"
              name="subject"
              type="text"
              required
              className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/80 shadow-sm"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              className="block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/80 shadow-sm resize-none"
              placeholder="Your Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 rounded-xl font-bold text-base bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-lg hover:from-blue-600 hover:to-pink-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
} 