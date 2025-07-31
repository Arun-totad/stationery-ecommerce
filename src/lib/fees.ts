import { PaymentBreakdown } from '@/types';

// Delivery fee and threshold logic for reuse

export const DELIVERY_FEE = 30;
export const FREE_SHIPPING_THRESHOLD = 1000;
export const CUSTOMER_SERVICE_FEE_RATE = 0.10; // 10% service fee charged to customer
export const VENDOR_PROCESSING_FEE_RATE = 0.10; // 10% processing fee deducted from vendor payout

export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function calculateCustomerServiceFee(subtotal: number): number {
  return subtotal * CUSTOMER_SERVICE_FEE_RATE; // 10% service fee
}

export function calculateVendorProcessingFee(subtotal: number, discountAmount: number = 0): number {
  // Vendor processing fee is 10% of what the vendor would receive (after discounts)
  // So if vendor would receive $90, we hold $9 (10%) and send them $81 (90%)
  const vendorPayoutBeforeFee = subtotal - discountAmount;
  const vendorProcessingFee = vendorPayoutBeforeFee * VENDOR_PROCESSING_FEE_RATE;
  return vendorProcessingFee;
}

// Legacy function for backward compatibility
export function calculateServiceFee(subtotal: number): number {
  return calculateCustomerServiceFee(subtotal);
}

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
