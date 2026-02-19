'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TestConnectionButtonProps {
  serviceName: string;
  testEndpoint: string;
  isConfigured: boolean;
}

export function TestConnectionButton({
  serviceName,
  testEndpoint,
  isConfigured,
}: TestConnectionButtonProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const handleTest = async () => {
    if (!isConfigured) return;

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch(testEndpoint);
      const data = await res.json();

      if (data.ok) {
        setResult({ ok: true });
      } else {
        setResult({ ok: false, error: data.error || 'Test failed' });
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isConfigured) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testing}
          className="text-sm"
        >
          {testing ? 'Testing...' : 'Test connection'}
        </Button>
        {result && (
          <span
            className={`text-sm ${
              result.ok
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {result.ok ? '✓ Connection successful' : `✗ ${result.error || 'Test failed'}`}
          </span>
        )}
      </div>
    </div>
  );
}
