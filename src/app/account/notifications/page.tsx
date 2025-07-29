"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort by createdAt descending
      notifs.sort((a, b) =>
        a.createdAt && b.createdAt && a.createdAt instanceof Date && b.createdAt instanceof Date
          ? b.createdAt.getTime() - a.createdAt.getTime()
          : 0
      );
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <li key={notif.id} className="bg-white rounded-lg shadow p-4 flex flex-col">
              <span className="font-medium">{notif.message}</span>
              {notif.link && (
                <Link href={notif.link} className="text-blue-600 hover:underline text-sm mt-1">
                  {notif.linkLabel || 'View'}
                </Link>
              )}
              <span className="text-xs text-gray-400 mt-1">
                {notif.createdAt && notif.createdAt.toDate
                  ? notif.createdAt.toDate().toLocaleString()
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}