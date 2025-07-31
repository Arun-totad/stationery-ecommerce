import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Coupon } from '@/types';

export interface CouponValidationResult {
  isValid: boolean;
  error?: string;
  coupon?: Coupon;
  discountAmount?: number;
}

export async function validateCoupon(
  code: string,
  userId: string,
  orderTotal: number
): Promise<CouponValidationResult> {
  try {
    // Find the coupon by code
    const couponsRef = collection(db, 'coupons');
    const q = query(couponsRef, where('code', '==', code.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        isValid: false,
        error: 'Invalid coupon code'
      };
    }

    const couponDoc = querySnapshot.docs[0];
    const data = couponDoc.data();
    
    // Convert Firestore timestamps to Date objects
    const coupon = {
      id: couponDoc.id,
      ...data,
      validFrom: data.validFrom?.toDate?.() || new Date(data.validFrom),
      validUntil: data.validUntil?.toDate?.() || new Date(data.validUntil),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    } as Coupon;

    // Check if coupon is active
    if (!coupon.isActive) {
      return {
        isValid: false,
        error: 'This coupon is not active'
      };
    }

    // Check validity dates
    const now = new Date();
    console.log('Coupon validation debug:', {
      now: now.toISOString(),
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil.toISOString(),
      isActive: coupon.isActive,
      usedCount: coupon.usedCount,
      usageLimit: coupon.usageLimit
    });
    
    if (now < coupon.validFrom) {
      return {
        isValid: false,
        error: 'This coupon is not yet valid'
      };
    }

    if (now > coupon.validUntil) {
      return {
        isValid: false,
        error: 'This coupon has expired'
      };
    }

    // Check usage limit
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return {
        isValid: false,
        error: 'This coupon has reached its usage limit'
      };
    }

    // Check if coupon is restricted to specific user
    if (coupon.restrictedToUser && coupon.restrictedToUser !== userId) {
      return {
        isValid: false,
        error: 'This coupon is not available for your account'
      };
    }

    // Check minimum order amount
    console.log('Order total check:', {
      orderTotal,
      minimumOrderAmount: coupon.minimumOrderAmount,
      meetsMinimum: orderTotal >= (coupon.minimumOrderAmount || 0)
    });
    
    if (coupon.minimumOrderAmount && orderTotal < coupon.minimumOrderAmount) {
      return {
        isValid: false,
        error: `Minimum order amount of $${coupon.minimumOrderAmount} required`
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
      // Apply maximum discount limit if set
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    return {
      isValid: true,
      coupon,
      discountAmount
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      isValid: false,
      error: 'Error validating coupon. Please try again.'
    };
  }
}

export function calculateDiscountAmount(coupon: Coupon, orderTotal: number): number {
  let discountAmount = 0;
  
  if (coupon.discountType === 'percentage') {
    discountAmount = (orderTotal * coupon.discountValue) / 100;
    // Apply maximum discount limit if set
    if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
      discountAmount = coupon.maximumDiscount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  // Ensure discount doesn't exceed order total
  if (discountAmount > orderTotal) {
    discountAmount = orderTotal;
  }

  return discountAmount;
} 