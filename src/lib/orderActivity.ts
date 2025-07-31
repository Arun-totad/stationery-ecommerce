import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { OrderActivity, UserRole } from '@/types';

export const addOrderActivity = async (
  orderId: string,
  action: string,
  description: string,
  performedBy: string,
  performedByRole: UserRole,
  previousValue: string | null = null,
  newValue: string | null = null
) => {
  try {
    // Create activity object with only defined values
    const activity: OrderActivity = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      description,
      performedBy,
      performedByRole,
      timestamp: new Date(),
      // Only include previousValue and newValue if they are not null
      ...(previousValue !== null && { previousValue }),
      ...(newValue !== null && { newValue }),
    };

    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      activityLog: arrayUnion(activity),
      updatedAt: new Date(),
    });

    return activity;
  } catch (error) {
    console.error('Error adding order activity:', error);
    throw error;
  }
};

export const getActivityIcon = (action: string): string => {
  switch (action.toLowerCase()) {
    case 'order_created':
      return '🛒';
    case 'status_changed':
      return '🔄';
    case 'payment_completed':
      return '💳';
    case 'payment_failed':
      return '❌';
    case 'payment_status_changed':
      return '💳';
    case 'shipped':
      return '📦';
    case 'delivered':
      return '✅';
    case 'cancelled':
      return '🚫';
    case 'refunded':
      return '💰';
    case 'estimated_delivery_updated':
      return '📅';
    case 'coupon_applied':
      return '🎫';
    case 'support_ticket_created':
      return '🎫';
    case 'support_ticket_status_changed':
      return '📋';
    case 'support_admin_response':
      return '💬';
    case 'pickup_address_updated':
      return '📍';
    default:
      return '📝';
  }
};

export const getActivityColor = (action: string): string => {
  switch (action.toLowerCase()) {
    case 'order_created':
      return 'bg-blue-100 text-blue-800';
    case 'status_changed':
      return 'bg-yellow-100 text-yellow-800';
    case 'payment_completed':
      return 'bg-green-100 text-green-800';
    case 'payment_failed':
      return 'bg-red-100 text-red-800';
    case 'payment_status_changed':
      return 'bg-purple-100 text-purple-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-orange-100 text-orange-800';
    case 'estimated_delivery_updated':
      return 'bg-indigo-100 text-indigo-800';
    case 'coupon_applied':
      return 'bg-pink-100 text-pink-800';
    case 'support_ticket_created':
      return 'bg-gray-100 text-gray-800';
    case 'support_ticket_status_changed':
      return 'bg-teal-100 text-teal-800';
    case 'support_admin_response':
      return 'bg-blue-100 text-blue-800';
    case 'pickup_address_updated':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatActivityDescription = (activity: OrderActivity): string => {
  if (activity.previousValue && activity.newValue && activity.previousValue !== null && activity.newValue !== null) {
    return `${activity.description}: ${activity.previousValue} → ${activity.newValue}`;
  }
  return activity.description;
}; 