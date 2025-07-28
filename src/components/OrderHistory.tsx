import React from 'react';

interface Order {
  id: string;
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
}

const mockOrders: Order[] = [
  { id: '1001', date: '2024-06-01', status: 'Delivered', total: 49.99 },
  { id: '1002', date: '2024-06-10', status: 'Shipped', total: 19.99 },
  { id: '1003', date: '2024-06-15', status: 'Processing', total: 89.99 },
];

const statusColor = {
  Processing: 'bg-yellow-100 text-yellow-800',
  Shipped: 'bg-blue-100 text-blue-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const OrderHistory: React.FC<{ userId: string }> = ({ userId }) => {
  // In a real app, fetch orders for the userId
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-black">Order History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Order #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {mockOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{order.id}</td>
                <td className="px-4 py-2 text-gray-700">{order.date}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${statusColor[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700">${order.total.toFixed(2)}</td>
                <td className="px-4 py-2">
                  <button className="text-sm font-medium text-blue-600 hover:underline">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;
