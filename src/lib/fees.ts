// Delivery fee and threshold logic for reuse

export const DELIVERY_FEE = 30;
export const FREE_SHIPPING_THRESHOLD = 1000;

export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function calculateServiceFee(subtotal: number): number {
  return subtotal * 0.02; // 2% service fee
} 