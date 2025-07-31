# Service Fee System

## Overview

The Swift Marketplace implements a comprehensive service fee system that generates revenue through two main channels:
1. **Customer Service Fee**: 10% charged to customers on order subtotal
2. **Vendor Processing Fee**: 10% deducted from vendor payout amount (after discounts)

This dual-fee structure ensures sustainable platform revenue while maintaining transparency for both customers and vendors.

## Fee Structure

### Customer Service Fee
- **Rate**: 10% of order subtotal
- **Charged**: At the time of order placement
- **Purpose**: Platform maintenance, customer support, and operational costs
- **Example**: $100 order → $10 service fee

### Vendor Processing Fee
- **Rate**: 10% of vendor payout amount (after discounts)
- **Deducted**: From vendor payout amount
- **Purpose**: Payment processing, vendor support, and platform services
- **Example**: $100 order with $10 discount → Vendor would receive $90, but we hold $9 (10% of $90) and send them $81

### Total Platform Revenue
- **Combined Rate**: Variable based on order value and discounts
- **Calculation**: Customer Service Fee + Vendor Processing Fee
- **Example**: $100 order with $10 discount → $10 customer fee + $9 vendor fee = $19 total platform revenue

## Payment Flow

### 1. Order Placement
```
Customer places $100 order
├── Subtotal: $100.00
├── Customer Service Fee (10%): +$10.00
├── Delivery Fee: +$30.00 (if applicable)
└── Total Charged to Customer: $140.00
```

### 2. Payment Processing
```
Payment received in Stripe
├── Customer charged: $140.00
├── Platform holds: $140.00
└── Order status: Payment completed
```

### 3. Vendor Payout
```
When order is delivered/cancelled
├── Order subtotal: $100.00
├── Discount applied: -$10.00
├── Vendor payout before fee: $90.00
├── Vendor Processing Fee (10% of $90): -$9.00
└── Vendor receives: $81.00
```

## Implementation Details

### Database Schema

#### Order Document
```typescript
interface Order {
  // ... existing fields
  serviceFee: number; // Customer service fee (10%)
  vendorProcessingFee: number; // Vendor processing fee (10% of payout amount)
  paymentBreakdown: PaymentBreakdown; // Detailed breakdown
  vendorPayoutStatus: 'pending' | 'processing' | 'completed' | 'failed';
  vendorPayoutDate?: Date;
}
```

#### Payment Breakdown
```typescript
interface PaymentBreakdown {
  subtotal: number; // Original order subtotal
  deliveryFee: number; // Delivery fee charged to customer
  customerServiceFee: number; // 10% service fee charged to customer
  vendorProcessingFee: number; // 10% processing fee deducted from vendor payout
  discountAmount: number; // Discount applied (if any)
  totalChargedToCustomer: number; // Total amount customer pays
  vendorPayoutAmount: number; // Amount vendor receives after fees
  platformRevenue: number; // Total platform revenue (customer fee + vendor fee)
}
```

### Fee Calculation Functions

#### Customer Service Fee
```typescript
export function calculateCustomerServiceFee(subtotal: number): number {
  return subtotal * 0.10; // 10% service fee
}
```

#### Vendor Processing Fee
```typescript
export function calculateVendorProcessingFee(subtotal: number, discountAmount: number = 0): number {
  // Vendor processing fee is 10% of what the vendor would receive (after discounts)
  const vendorPayoutBeforeFee = subtotal - discountAmount;
  const vendorProcessingFee = vendorPayoutBeforeFee * 0.10;
  return vendorProcessingFee;
}
```

#### Complete Payment Breakdown
```typescript
export function calculatePaymentBreakdown(
  subtotal: number,
  deliveryFee: number = 0,
  discountAmount: number = 0
): PaymentBreakdown {
  const customerServiceFee = calculateCustomerServiceFee(subtotal);
  const vendorProcessingFee = calculateVendorProcessingFee(subtotal, discountAmount);
  const totalChargedToCustomer = subtotal + deliveryFee + customerServiceFee - discountAmount;
  const vendorPayoutAmount = subtotal - vendorProcessingFee - discountAmount;
  const platformRevenue = customerServiceFee + vendorProcessingFee;

  return {
    subtotal,
    deliveryFee,
    customerServiceFee,
    vendorProcessingFee,
    discountAmount,
    totalChargedToCustomer,
    vendorPayoutAmount,
    platformRevenue,
  };
}
```

## User Interface

### Admin Dashboard
- **Payment Details Section**: Shows basic payment information
- **Detailed Payment Breakdown**: Comprehensive breakdown with customer charges, vendor payout, and platform revenue
- **Vendor Payout Status**: Track vendor payout processing
- **Activity Log**: Records all payment-related activities

### Vendor Dashboard
- **Payment Breakdown**: Shows vendor-specific payout information
- **Processing Fee Display**: Clear indication of fees deducted
- **Payout Amount**: Final amount vendor will receive
- **Payout Status**: Current status of vendor payout

### Customer View
- **Service Fee Transparency**: Clear breakdown of all charges
- **Total Amount**: Final amount including all fees
- **Order Summary**: Simplified view of charges

## Fee Examples

### Example 1: Basic Order
```
Order: $50.00
├── Customer Service Fee: +$5.00
├── Delivery Fee: +$30.00
└── Total: $85.00

Vendor Payout:
├── Order Subtotal: $50.00
├── Processing Fee (10% of $50): -$5.00
└── Vendor Receives: $45.00

Platform Revenue: $10.00 ($5.00 + $5.00)
```

### Example 2: Large Order with Free Shipping
```
Order: $1,200.00
├── Customer Service Fee: +$120.00
├── Delivery Fee: $0.00 (free shipping)
└── Total: $1,320.00

Vendor Payout:
├── Order Subtotal: $1,200.00
├── Processing Fee (10% of $1,200): -$120.00
└── Vendor Receives: $1,080.00

Platform Revenue: $240.00 ($120.00 + $120.00)
```

### Example 3: Order with Discount
```
Order: $100.00
├── Customer Service Fee: +$10.00
├── Delivery Fee: +$30.00
├── Discount: -$20.00
└── Total: $120.00

Vendor Payout:
├── Order Subtotal: $100.00
├── Discount Applied: -$20.00
├── Vendor payout before fee: $80.00
├── Processing Fee (10% of $80): -$8.00
└── Vendor Receives: $72.00

Platform Revenue: $18.00 ($10.00 + $8.00)
```

## Business Logic

### When Fees Are Applied
1. **Customer Service Fee**: Applied immediately when order is placed
2. **Vendor Processing Fee**: Calculated at order time, deducted at payout
3. **Payout Processing**: Triggered when order status changes to 'delivered' or 'cancelled'

### Fee Exemptions
- **Refunds**: Both fees are refunded proportionally
- **Cancellations**: Fees are handled based on cancellation timing
- **Disputes**: Fees may be adjusted based on resolution

### Revenue Tracking
- **Real-time Calculation**: Fees calculated in real-time
- **Detailed Reporting**: Complete breakdown available in admin dashboard
- **Analytics**: Platform revenue tracked for business insights

## Technical Implementation

### Order Creation
```typescript
// In payment verification route
const customerServiceFee = calculateCustomerServiceFee(vendorOrderSubtotal);
const vendorProcessingFee = calculateVendorProcessingFee(vendorOrderSubtotal, discountAmount);
const paymentBreakdown = calculatePaymentBreakdown(vendorOrderSubtotal, deliveryFee, discountAmount);
const total = paymentBreakdown.totalChargedToCustomer;

const newOrder: Order = {
  // ... other fields
  serviceFee: customerServiceFee,
  vendorProcessingFee,
  paymentBreakdown,
  vendorPayoutStatus: 'pending',
};
```

### Display Components
- **PaymentBreakdownDisplay**: Reusable component for showing detailed breakdown
- **Admin Order Details**: Enhanced with payment breakdown and vendor payout status
- **Vendor Order Details**: Shows vendor-specific payout information

## Future Enhancements

### Planned Features
- **Dynamic Fee Rates**: Configurable fee percentages based on order value or vendor tier
- **Fee Analytics**: Detailed reporting on fee collection and distribution
- **Automated Payouts**: Integration with payment processors for automatic vendor payouts
- **Fee Disputes**: System for handling fee-related disputes

### Integration Opportunities
- **Accounting Systems**: Export fee data for accounting purposes
- **Tax Reporting**: Generate tax reports for platform revenue
- **Vendor Statements**: Monthly statements showing fee deductions and payouts 