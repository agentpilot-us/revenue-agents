'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  isConnected: boolean;
  isLegacyPrimaryGoogle: boolean;
  callbackUrl: string;
};

export function GoogleWorkspaceSettingsBlock({
  isConnected,
  isLegacyPrimaryGoogle,
  callbackUrl,
}: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/csrf')
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken ?? d.token ?? null))
      .catch(() => setCsrfToken(null));
  }, []);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/google-workspace/disconnect', {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to disconnect Google Workspace');
      }
      setMessage({ type: 'success', text: 'Google Workspace disconnected successfully.' });
      setTimeout(() => router.refresh(), 800);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Disconnect failed',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-800 dark:border-zinc-700">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">🗂️</div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              Google Workspace
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Connect Google Docs, Slides, Drive, and Gmail separately from sign-in.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              AgentPilot only asks for Workspace scopes when you explicitly connect this integration.
            </p>
            {isLegacyPrimaryGoogle && (
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-3">
                Workspace access is currently coming from your main Google sign-in session from the
                previous setup. Reconnect here to move it onto the dedicated Workspace integration.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isConnected ? (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ Connected
              </span>
              {!isLegacyPrimaryGoogle && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
            </>
          ) : csrfToken ? (
            <form action="/api/auth/signin/google-workspace" method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Connect Google Workspace
              </Button>
            </form>
          ) : (
            <Button disabled className="bg-blue-600 text-white">
              Loading...
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
