'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SalesforceSettingsBlockProps {
  isConnected: boolean;
  lastSyncedAt: Date | null;
}

export function SalesforceSettingsBlock({
  isConnected,
  lastSyncedAt,
}: SalesforceSettingsBlockProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const router = useRouter();

  const handleConnect = () => {
    window.location.href = '/api/integrations/salesforce/auth';
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/salesforce/disconnect', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }
      setMessage({ type: 'success', text: 'Salesforce disconnected successfully.' });
      // Refresh the page to update the UI
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Disconnect failed' });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-800 dark:border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">🔗</div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              Salesforce
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Import contacts and push activities to Salesforce
            </p>
            {isConnected && lastSyncedAt && (
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </p>
            )}
            {isConnected && !lastSyncedAt && (
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Connected — sync runs per account from account pages
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ Connected
              </span>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 text-white">
              Connect to Salesforce
            </Button>
          )}
        </div>
      </div>
      {message && (
        <div
          className={`mt-4 text-sm ${
            message.type === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
