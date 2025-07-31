'use client';

import { PaymentBreakdown } from '@/types';
import { FaMoneyBillWave, FaCreditCard, FaStore, FaChartLine, FaInfoCircle } from 'react-icons/fa';

interface PaymentBreakdownDisplayProps {
  paymentBreakdown: PaymentBreakdown;
  className?: string;
  showVendorFocus?: boolean; // New prop to show vendor-focused view
}

export default function PaymentBreakdownDisplay({ 
  paymentBreakdown, 
  className = '',
  showVendorFocus = false 
}: PaymentBreakdownDisplayProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-xl ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
            <FaMoneyBillWave className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Breakdown</h2>
            <p className="text-sm text-gray-600">Complete financial details for this order</p>
          </div>
        </div>
        {showVendorFocus && (
          <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1">
            <FaStore className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Vendor View</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Charges - Left Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-blue-900">
            <FaCreditCard className="text-blue-600" />
            Customer Charges
          </div>
          <div className="space-y-3 rounded-xl bg-blue-50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Order Subtotal:</span>
              <span className="font-semibold text-gray-900">${paymentBreakdown.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Delivery Fee:</span>
              <span className="font-semibold text-gray-900">${paymentBreakdown.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <span className="text-gray-700">Service Fee (10%):</span>
                <FaInfoCircle className="text-blue-500 text-xs" title="Platform service fee charged to customer" />
              </div>
              <span className="font-semibold text-red-600">+${paymentBreakdown.customerServiceFee.toFixed(2)}</span>
            </div>
            {paymentBreakdown.discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Discount Applied:</span>
                <span className="font-semibold text-green-600">-${paymentBreakdown.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-blue-200 pt-3">
              <span className="text-lg font-bold text-blue-900">Total Customer Pays:</span>
              <span className="text-xl font-bold text-blue-900">${paymentBreakdown.totalChargedToCustomer.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Vendor Payout - Center Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-purple-900">
            <FaStore className="text-purple-600" />
            Your Payout
          </div>
          <div className="space-y-3 rounded-xl bg-purple-50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Order Subtotal:</span>
              <span className="font-semibold text-gray-900">${paymentBreakdown.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <span className="text-gray-700">Processing Fee (10%):</span>
                <FaInfoCircle className="text-purple-500 text-xs" title="Platform processing fee: 10% of your payout amount (after discounts)" />
              </div>
              <span className="font-semibold text-red-600">-${paymentBreakdown.vendorProcessingFee.toFixed(2)}</span>
            </div>
            {paymentBreakdown.discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Discount Impact:</span>
                <span className="font-semibold text-red-600">-${paymentBreakdown.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-purple-200 pt-3">
              <span className="text-lg font-bold text-purple-900">You Receive:</span>
              <span className="text-xl font-bold text-purple-900">${paymentBreakdown.vendorPayoutAmount.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Payout Summary */}
          <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-green-800">Your Net Revenue</div>
                <div className="text-xs text-green-600">After all fees and discounts</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">
                  ${paymentBreakdown.vendorPayoutAmount.toFixed(2)}
                </div>
                <div className="text-xs text-green-600">
                  {((paymentBreakdown.vendorPayoutAmount / paymentBreakdown.subtotal) * 100).toFixed(1)}% of subtotal
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Revenue - Right Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-orange-900">
            <FaChartLine className="text-orange-600" />
            Platform Revenue
          </div>
          <div className="space-y-3 rounded-xl bg-orange-50 p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Customer Fee:</span>
              <span className="font-semibold text-orange-700">+${paymentBreakdown.customerServiceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Vendor Fee:</span>
              <span className="font-semibold text-orange-700">+${paymentBreakdown.vendorProcessingFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-orange-200 pt-3">
              <span className="text-lg font-bold text-orange-900">Total Revenue:</span>
              <span className="text-xl font-bold text-orange-900">${paymentBreakdown.platformRevenue.toFixed(2)}</span>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-800 mb-3">Fee Structure</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer Service Fee:</span>
                <span className="font-semibold">10% of subtotal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vendor Processing Fee:</span>
                <span className="font-semibold">10% of payout amount</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="text-gray-600">Total Platform Fee:</span>
                <span className="font-semibold">Variable (10% + 10%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 p-4 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm opacity-90">Customer Pays</div>
            <div className="text-xl font-bold">${paymentBreakdown.totalChargedToCustomer.toFixed(2)}</div>
          </div>
          <div className="border-l border-r border-white/20 px-4">
            <div className="text-sm opacity-90">You Receive</div>
            <div className="text-xl font-bold">${paymentBreakdown.vendorPayoutAmount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm opacity-90">Platform Revenue</div>
            <div className="text-xl font-bold">${paymentBreakdown.platformRevenue.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 