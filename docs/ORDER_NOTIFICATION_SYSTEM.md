# Order Notification System

## Overview

The Swift Marketplace includes a comprehensive notification system that keeps customers informed about their order status changes. This document explains how the system works and the recent fixes implemented.

## How It Works

### Notification Types

The system supports several notification types:

- `order_placed`: When a new order is created
- `order_status_update`: When order status changes
- `support_ticket_created`: When support tickets are created
- `support_message`: When new messages are added to support tickets
- `support_status_update`: When support ticket status changes

### Order Status Update Notifications

When an order status is updated, the system creates a notification with:

- **User ID**: The customer who placed the order
- **Type**: `order_status_update`
- **Message**: Human-readable status update message
- **Data**: Order ID and new status
- **Link**: Direct link to the order details page
- **Link Label**: Order number for easy identification

### Status Messages

Different status updates have specific messages:

- **Pending**: "Your order has been placed and is pending confirmation."
- **Processing**: "Your order is now being processed by the vendor."
- **Shipped**: "Your order has been shipped and is on its way!"
- **Delivered**: "Your order has been delivered successfully!"
- **Cancelled**: "Your order has been cancelled."

## Implementation Locations

### 1. Vendor Order Management (`/vendor/orders/[orderId]`)

**Fixed Issue**: Previously, vendors could update order status without triggering customer notifications.

**Solution**: Added notification creation to:
- `handleStatusChange()`: When vendor changes order status
- `handleAcceptOrder()`: When vendor accepts a pending order

**Code Changes**:
```typescript
// Create notification for customer about status update
try {
  await addDoc(collection(db, 'notifications'), {
    userId: order.userId,
    type: 'order_status_update',
    message: statusMessages[newStatus] || `Your order status has been updated to ${newStatus}.`,
    createdAt: new Date(),
    read: false,
    data: { orderId: order.id, newStatus: newStatus },
    link: `/account/orders/${order.id}`,
    linkLabel: order.orderNumber || order.id,
  });
} catch (notifErr) {
  console.error('Failed to create status update notification:', notifErr);
}
```

### 2. Admin Order Management (`/admin/orders/[orderId]`)

**Status**: ✅ Already implemented

Admins can update order status and notifications are automatically created.

### 3. Order Placement

**Status**: ✅ Already implemented

Notifications are created when:
- Orders are placed via checkout page
- Orders are placed via Razorpay payment

### 4. Order Cancellation

**Status**: ✅ Already implemented

Customers can cancel their own orders and receive notifications.

## Notification Display

### Header Component

The notification system is integrated into the main header:

- **Bell Icon**: Shows unread notification count
- **Dropdown**: Displays recent notifications
- **Auto-read**: Notifications are marked as read when opened
- **Direct Links**: Click notifications to go directly to relevant pages

### Notification Features

- **Real-time Updates**: Uses Firestore onSnapshot for live updates
- **Unread Indicators**: Visual indicators for unread notifications
- **Time Stamps**: Shows relative time (e.g., "10 minutes ago")
- **Type-based Styling**: Different colors and icons for different notification types

## Testing

### Manual Testing

1. **Create an order** as a customer
2. **Login as vendor** and update order status
3. **Check customer account** for notifications
4. **Verify notification content** and links

### Test Script

A test script is available at `test-notification.js` for browser console testing.

## Error Handling

The notification system includes robust error handling:

- **Non-blocking**: Notification failures don't prevent order operations
- **Logging**: All errors are logged to console for debugging
- **Graceful Degradation**: System continues to work even if notifications fail

## Future Enhancements

Potential improvements for the notification system:

1. **Email Notifications**: Send email notifications for important updates
2. **Push Notifications**: Browser push notifications for real-time updates
3. **Notification Preferences**: Allow users to customize notification settings
4. **Bulk Operations**: Handle multiple notifications efficiently
5. **Notification History**: Archive old notifications

## Troubleshooting

### Common Issues

1. **Notifications not appearing**: Check Firestore rules and user permissions
2. **Wrong user notifications**: Verify `userId` field in notification creation
3. **Missing notifications**: Check for JavaScript errors in browser console
4. **Real-time updates not working**: Verify Firestore onSnapshot listeners

### Debug Steps

1. Check browser console for errors
2. Verify Firestore database for notification documents
3. Test notification creation manually
4. Check user authentication status
5. Verify Firestore security rules

## Security Considerations

- Notifications are user-scoped (only visible to the intended user)
- Firestore security rules prevent unauthorized access
- Notification creation is tied to authenticated operations
- No sensitive data is stored in notifications 