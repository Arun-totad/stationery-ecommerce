# Order Activity Log System

## Overview

The Order Activity Log System provides comprehensive tracking of all activities and changes that occur on an order throughout its lifecycle. This system helps administrators and vendors understand the complete history of an order, including when it was created, status changes, payment updates, and other relevant events.

## Features

### Activity Tracking
- **Order Creation**: Automatically logged when an order is first created
- **Status Changes**: Tracked when order status is updated (pending → processing → shipped → delivered/cancelled)
- **Payment Status**: Monitored for payment completion, failure, or status changes
- **Coupon Applications**: Recorded when discount coupons are applied to orders
- **Support Tickets**: Logged when support tickets are created for an order
- **User Actions**: Tracks who performed each action and their role

### Visual Timeline
- **Chronological Display**: Activities are shown in reverse chronological order (newest first)
- **Color-coded Icons**: Different activities have distinct icons and colors for easy identification
- **Timeline Design**: Visual timeline with connecting lines between activities
- **Detailed Information**: Shows timestamps, user roles, and action details

## Implementation Details

### Data Structure

```typescript
interface OrderActivity {
  id: string;
  action: string;
  description: string;
  performedBy: string; // User ID
  performedByRole: UserRole; // customer, vendor, admin, admin-manager
  timestamp: Date;
  previousValue?: string; // Previous status/value
  newValue?: string; // New status/value
}
```

### Activity Types

| Activity | Icon | Color | Description |
|----------|------|-------|-------------|
| `order_created` | 🛒 | Blue | Order was initially created |
| `status_changed` | 🔄 | Yellow | Order status was updated |
| `payment_completed` | 💳 | Green | Payment was successfully completed |
| `payment_failed` | ❌ | Red | Payment failed |
| `payment_status_changed` | 💳 | Purple | Payment status was manually updated |
| `coupon_applied` | 🎫 | Pink | Discount coupon was applied |
| `support_ticket_created` | 🎫 | Gray | Support ticket was created for this order |

### Components

#### OrderActivityLog Component
- **Location**: `src/components/OrderActivityLog.tsx`
- **Purpose**: Displays the activity timeline
- **Features**: 
  - Responsive design
  - Empty state handling
  - Timeline visualization
  - Activity filtering and sorting

#### Activity Utility Functions
- **Location**: `src/lib/orderActivity.ts`
- **Functions**:
  - `addOrderActivity()`: Adds new activity to order
  - `getActivityIcon()`: Returns appropriate icon for activity type
  - `getActivityColor()`: Returns color scheme for activity type
  - `formatActivityDescription()`: Formats activity description with changes

## Usage

### For Administrators
1. Navigate to Admin → Orders
2. Select any order to view details
3. Scroll down to the "Activity Log" section
4. View complete order history with timestamps
5. Use "Refresh Activity Log" button to update the display

### For Vendors
1. Navigate to Vendor Dashboard → Orders
2. Select any order to view details
3. View activity log for orders they manage
4. Track customer interactions and order progress

### Automatic Activity Logging

The system automatically logs activities for:
- **Order Creation**: When order is first placed
- **Status Updates**: When admin/vendor changes order status
- **Payment Status**: When payment status is updated
- **Coupon Usage**: When discounts are applied
- **Support Tickets**: When tickets are created for the order

### Manual Activity Logging

Administrators can trigger activity logging by:
- Updating order status
- Changing payment status
- The system automatically records who made the change and when

## Technical Implementation

### Database Integration
- Activities are stored in the `activityLog` array field of each order document
- Uses Firestore's `arrayUnion` to append new activities
- Timestamps are automatically converted between Firestore Timestamp and JavaScript Date objects

### Real-time Updates
- Activity log refreshes automatically after status changes
- Manual refresh button available for administrators
- Optimistic UI updates for better user experience

### Error Handling
- Graceful fallback if activity logging fails
- Console logging for debugging
- Non-blocking activity creation (doesn't prevent order operations)

## Future Enhancements

### Planned Features
- **Activity Filtering**: Filter activities by type, date range, or user
- **Export Functionality**: Export activity logs to CSV/PDF
- **Email Notifications**: Notify relevant parties of important activities
- **Activity Comments**: Allow users to add notes to activities
- **Bulk Operations**: Log activities for multiple orders simultaneously

### Integration Opportunities
- **Analytics Dashboard**: Use activity data for order analytics
- **Customer Communication**: Share relevant activities with customers
- **Audit Trail**: Enhanced security and compliance tracking
- **Performance Metrics**: Track order processing times and bottlenecks

## Security Considerations

- Only authorized users can view activity logs
- Activity logging is non-blocking and doesn't affect order operations
- User IDs are partially masked in the display for privacy
- All activities are timestamped and cannot be modified after creation

## Troubleshooting

### Common Issues
1. **Activities not showing**: Check if order has `activityLog` field
2. **Timestamps incorrect**: Verify Firestore timestamp conversion
3. **Missing activities**: Ensure activity logging functions are called
4. **Permission errors**: Verify user has appropriate role permissions

### Debug Steps
1. Check browser console for error messages
2. Verify Firestore rules allow activity log updates
3. Confirm user authentication and role assignment
4. Test activity logging with simple status changes 