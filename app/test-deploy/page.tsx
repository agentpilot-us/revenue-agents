'use client';

import { useState } from 'react';
import { salesPageHtml } from '@/lib/templates/sales-page-html';

export default function TestDeployPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDeploy() {
    setLoading(true);
    setError(null);
    setUrl(null);
    try {
      const html = salesPageHtml({
        title: 'Test Sales Page',
        valueProp: 'This is a test deployment from Agent Pilot.',
        benefits: ['Fast', 'Simple', 'Secure'],
        pricing: 'Free to try',
        ctaLabel: 'Get Started',
        ctaUrl: 'https://example.com',
      });
      const res = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'agentpilot-test-page',
          files: { 'index.html': html },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Deploy failed');
      setUrl(data.url ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deployment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Vercel deployment</h1>
      <p className="text-slate-600 mb-6">
        Deploys a static test page via the API route. Requires VERCEL_ACCESS_TOKEN and auth.
      </p>
      <button
        type="button"
        onClick={handleDeploy}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Deploying…' : 'Deploy test page'}
      </button>
      {error && (
        <p className="mt-4 text-red-600" role="alert">
          {error}
        </p>
      )}
      {url && (
        <p className="mt-4 text-green-600">
          Deployed: <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{url}</a>
        </p>
      )}
    </div>
  );
}
