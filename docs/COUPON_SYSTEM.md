# Coupon System Implementation

## Overview

The coupon system allows administrators to create and manage discount coupons that users can apply during checkout. The system supports both percentage and fixed amount discounts with various validation rules.

## Features

### Admin Features
- **Create Coupons**: Admins can create coupons with the following properties:
  - Coupon code (unique identifier)
  - Name and description
  - Discount type (percentage or fixed amount)
  - Discount value
  - Minimum order amount requirement
  - Maximum discount limit (for percentage coupons)
  - Validity period (start and end dates)
  - Usage limit (optional)
  - User restrictions (optional)
  - Active/inactive status

- **Manage Coupons**: 
  - View all coupons in a table format
  - Edit existing coupons
  - Delete coupons
  - Search and filter coupons
  - View coupon analytics and usage statistics

- **Analytics Dashboard**:
  - Total coupons, active coupons, expired coupons
  - Total usage and discount given
  - Visual charts showing coupon status distribution
  - Usage statistics by coupon
  - Recent coupon usage history

### User Features
- **Apply Coupons**: Users can enter coupon codes during checkout
- **Real-time Validation**: Coupons are validated in real-time with detailed error messages
- **Automatic Discount Calculation**: Discounts are automatically calculated and applied to the order total
- **Visual Feedback**: Clear indication of applied coupons and savings

## Database Schema

### Coupons Collection
```typescript
interface Coupon {
  id: string;
  code: string;                    // Unique coupon code
  name: string;                    // Display name
  description: string;             // Description
  discountType: 'percentage' | 'fixed';
  discountValue: number;           // Percentage (0-100) or fixed amount
  minimumOrderAmount?: number;     // Minimum order amount required
  maximumDiscount?: number;        // Max discount for percentage coupons
  validFrom: Date;                 // Start date
  validUntil: Date;                // End date
  usageLimit?: number;             // Total usage limit (0 = unlimited)
  usedCount: number;               // Current usage count
  isActive: boolean;               // Active status
  restrictedToUser?: string;       // User ID if restricted
  createdBy: string;               // Admin who created it
  createdAt: Date;
  updatedAt: Date;
}
```

### Coupon Usage Collection
```typescript
interface CouponUsage {
  id: string;
  couponId: string;               // Reference to coupon
  userId: string;                 // User who used the coupon
  orderId: string;                // Order where coupon was used
  discountAmount: number;         // Actual discount applied
  usedAt: Date;                   // When coupon was used
}
```

## Validation Rules

### Coupon Validation
1. **Code Existence**: Coupon code must exist in the database
2. **Active Status**: Coupon must be active
3. **Validity Period**: Current date must be within validFrom and validUntil
4. **Usage Limit**: Current usage count must be less than the limit
5. **User Restriction**: If restricted to a specific user, only that user can use it
6. **Minimum Order Amount**: Order total must meet the minimum requirement
7. **Discount Calculation**: 
   - Percentage: (orderTotal * discountValue) / 100, capped by maximumDiscount
   - Fixed: discountValue, capped by orderTotal

### Order Integration
- Coupon information is stored with each order
- Discount amount is distributed proportionally across multiple vendors
- Coupon usage count is incremented when order is placed
- Usage history is recorded for analytics

## API Endpoints

### Validate Coupon
```
POST /api/coupons/validate
Body: { code: string, userId: string, orderTotal: number }
Response: { success: boolean, coupon?: Coupon, discountAmount?: number, error?: string }
```

## Security Rules

### Firestore Rules
- **Coupons**: Read access for authenticated users, write access for admins only
- **Coupon Usage**: Read access for users (own usage) and admins, write access for authenticated users

## Usage Examples

### Creating a Coupon
1. Navigate to Admin Dashboard → Coupons
2. Click "Create Coupon"
3. Fill in the form:
   - Code: "SAVE20"
   - Name: "Summer Sale"
   - Discount Type: Percentage
   - Discount Value: 20
   - Minimum Order: $50
   - Valid From: Today
   - Valid Until: End of month
   - Usage Limit: 100

### Applying a Coupon
1. Add items to cart
2. Proceed to checkout
3. Enter coupon code in the coupon field
4. Click "Apply"
5. View applied discount in order summary

## Technical Implementation

### Key Components
- `src/app/admin/coupons/page.tsx` - Admin coupon management interface
- `src/components/admin/CouponForm.tsx` - Reusable coupon form component
- `src/components/admin/CouponAnalytics.tsx` - Analytics dashboard
- `src/lib/coupons.ts` - Coupon validation and calculation utilities
- `src/app/checkout/page.tsx` - Checkout page with coupon integration

### Validation Flow
1. User enters coupon code
2. Frontend calls validation function
3. Validation checks all rules
4. If valid, coupon is applied and discount calculated
5. Order total is updated with discount
6. On order placement, coupon usage is recorded

### Error Handling
- Comprehensive error messages for each validation failure
- Graceful handling of network errors
- Fallback behavior if coupon update fails during order placement

## Future Enhancements

1. **Bulk Operations**: Import/export coupons via CSV
2. **Advanced Analytics**: More detailed reporting and insights
3. **Email Integration**: Send coupon codes via email campaigns
4. **A/B Testing**: Test different coupon strategies
5. **Automated Coupons**: Generate coupons based on user behavior
6. **Stacking Rules**: Allow/deny multiple coupon usage
7. **Category Restrictions**: Limit coupons to specific product categories 