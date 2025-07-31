import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/coupons';

export async function POST(request: NextRequest) {
  try {
    const { code, userId, orderTotal } = await request.json();

    if (!code || !userId || orderTotal === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: code, userId, orderTotal' },
        { status: 400 }
      );
    }

    const result = await validateCoupon(code, userId, orderTotal);

    if (result.isValid) {
      return NextResponse.json({
        success: true,
        coupon: result.coupon,
        discountAmount: result.discountAmount
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 