'use client';

import { OrderActivity } from '@/types';
import { getActivityIcon, getActivityColor, formatActivityDescription } from '@/lib/orderActivity';

interface OrderActivityLogProps {
  activities: OrderActivity[];
  className?: string;
}

export default function OrderActivityLog({ activities, className = '' }: OrderActivityLogProps) {
  // Sort activities by timestamp (newest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedActivities.length === 0) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-8 shadow ${className}`}>
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-700 shadow">
            📋
          </span>
          Activity Log
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg">No activity recorded yet</p>
          <p className="text-gray-400 text-sm mt-2">Activity will appear here as the order progresses</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-8 shadow ${className}`}>
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-2xl font-bold text-blue-700 shadow">
          📋
        </span>
        Activity Log
      </h2>
      
      <div className="space-y-6">
        {sortedActivities.map((activity, index) => {
          const timestamp = new Date(activity.timestamp);
          const isLast = index === sortedActivities.length - 1;
          
          return (
            <div key={activity.id} className="relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-6 top-12 h-full w-0.5 bg-gray-200"></div>
              )}
              
              <div className="flex items-start space-x-4">
                {/* Activity icon */}
                <div className={`flex-shrink-0 rounded-full p-3 ${getActivityColor(activity.action)}`}>
                  <span className="text-lg">{getActivityIcon(activity.action)}</span>
                </div>
                
                {/* Activity content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {activity.action.replace(/_/g, ' ')}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-2">
                    {formatActivityDescription(activity)}
                  </p>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="capitalize">{activity.performedByRole}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 