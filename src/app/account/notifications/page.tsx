"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  UserPlusIcon 
} from '@heroicons/react/24/outline';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAt: Date;
        
        // Handle different date formats
        if (data.createdAt && typeof data.createdAt === 'object' && data.createdAt.toDate) {
          // Firestore Timestamp
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt instanceof Date) {
          // Already a Date object
          createdAt = data.createdAt;
        } else if (data.createdAt && typeof data.createdAt === 'string') {
          // ISO string
          createdAt = new Date(data.createdAt);
        } else if (data.createdAt && typeof data.createdAt === 'number') {
          // Timestamp number
          createdAt = new Date(data.createdAt);
        } else {
          // Fallback to current date
          createdAt = new Date();
        }
        
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt,
        };
      });
      
      // Additional client-side sorting to ensure proper order
      notifs.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    if (diffInDays >= 1) {
      // Show date and time for older notifications
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: diffInDays >= 365 ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours >= 1) {
      // Show hours ago
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      // Show minutes ago
      const minutes = Math.floor(diffInMs / (1000 * 60));
      if (minutes < 1) {
        return 'Just now';
      }
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_placed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'order_status_update':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      case 'account_created':
        return <UserPlusIcon className="h-5 w-5 text-purple-500" />;
      case 'support_ticket_created':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'support_message':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'support_admin_response':
        return <ExclamationTriangleIcon className="h-5 w-5 text-purple-500" />;
      case 'support_status_update':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'support_ticket_reopened':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'support_ticket_closed':
        return <CheckCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBackground = (type: string, isUnread: boolean) => {
    if (isUnread) {
      switch (type) {
        case 'order_placed':
          return 'bg-blue-50 border-l-4 border-blue-500';
        case 'order_status_update':
          return 'bg-yellow-50 border-l-4 border-yellow-500';
        case 'account_created':
          return 'bg-purple-50 border-l-4 border-purple-500';
        case 'support_ticket_created':
          return 'bg-green-50 border-l-4 border-green-500';
        case 'support_message':
          return 'bg-blue-50 border-l-4 border-blue-500';
        case 'support_admin_response':
          return 'bg-purple-50 border-l-4 border-purple-500';
        case 'support_status_update':
          return 'bg-orange-50 border-l-4 border-orange-500';
        case 'support_ticket_reopened':
          return 'bg-yellow-50 border-l-4 border-yellow-500';
        case 'support_ticket_closed':
          return 'bg-gray-50 border-l-4 border-gray-500';
        default:
          return 'bg-blue-50 border-l-4 border-blue-500';
      }
    } else {
      switch (type) {
        case 'order_placed':
          return 'bg-blue-100 border-l-4 border-blue-400';
        case 'order_status_update':
          return 'bg-yellow-100 border-l-4 border-yellow-400';
        case 'account_created':
          return 'bg-purple-100 border-l-4 border-purple-400';
        case 'support_ticket_created':
          return 'bg-green-100 border-l-4 border-green-400';
        case 'support_message':
          return 'bg-blue-100 border-l-4 border-blue-400';
        case 'support_admin_response':
          return 'bg-purple-100 border-l-4 border-purple-400';
        case 'support_status_update':
          return 'bg-orange-100 border-l-4 border-orange-400';
        case 'support_ticket_reopened':
          return 'bg-yellow-100 border-l-4 border-yellow-400';
        case 'support_ticket_closed':
          return 'bg-gray-100 border-l-4 border-gray-400';
        default:
          return 'bg-blue-100 border-l-4 border-blue-400';
      }
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <li 
              key={notif.id} 
              className={`rounded-lg shadow p-4 flex items-start gap-3 transition-all duration-200 hover:shadow-lg ${
                getNotificationBackground(notif.type, !notif.read)
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={`font-medium ${
                  !notif.read ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {notif.message}
                </span>
                {notif.link && (
                  <Link 
                    href={notif.link} 
                    className={`block mt-1 text-sm ${
                      !notif.read ? 'text-blue-600' : 'text-blue-500'
                    } hover:underline`}
                  >
                    {notif.linkLabel || 'View'}
                  </Link>
                )}
                <span className={`block text-xs mt-1 ${
                  !notif.read ? 'text-gray-600' : 'text-gray-500'
                }`}>
                  {notif.createdAt && notif.createdAt instanceof Date
                    ? formatTimestamp(notif.createdAt)
                    : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}