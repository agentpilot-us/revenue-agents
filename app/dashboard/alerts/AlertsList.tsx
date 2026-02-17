'use client';

import { formatDistanceToNow } from 'date-fns';
import { markAlertAsRead } from './actions';

type Alert = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  campaign: { name: string; id: string } | null;
};

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const handleMarkAsRead = async (alertId: string) => {
    await markAlertAsRead(alertId);
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <p className="text-gray-500 dark:text-gray-400">
          No alerts yet. We&apos;ll notify you when high-value visitors engage!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-lg border p-4 ${
            alert.isRead
              ? 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
              : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
          }`}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{alert.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{alert.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                {alert.campaign && ` • ${alert.campaign.name}`}
              </p>
            </div>
            {!alert.isRead && (
              <button
                type="button"
                onClick={() => handleMarkAsRead(alert.id)}
                className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
