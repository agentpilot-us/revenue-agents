'use client';

import { useState, useEffect } from 'react';

type Props = {
  accountId: string;
  accountName: string;
  contactId?: string | null;
  contactName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  open: boolean;
  onClose: () => void;
  triggerButton: React.ReactNode;
};

type DraftResult = {
  draft: { subject: string; body: string };
  context: { accountName: string; contactName: string | null; departmentName: string | null };
  contentLibraryMatches: Array<{ id: string; title: string; type: string }>;
};

export function DraftFollowUpModal({
  accountId,
  accountName,
  contactId,
  contactName,
  departmentId,
  departmentName,
  open,
  onClose,
  triggerButton,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) handleOpen();
  }, [open]);

  const handleOpen = async () => {
    if (!open) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/draft-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          contactId: contactId || undefined,
          departmentId: departmentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Draft failed');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate draft');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.draft) return;
    const text = `Subject: ${result.draft.subject}\n\n${result.draft.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const editHref = `/chat?play=expansion&accountId=${accountId}${contactId ? `&contactId=${contactId}` : ''}`;

  if (!open) return <>{triggerButton}</>;

  return (
    <>
      {triggerButton}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Draft follow-up</h2>
            <p className="text-sm text-gray-600 mt-1">
              To: {contactName || 'Contact'} {accountName && `· ${accountName}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <p className="text-gray-500">Generating draft…</p>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800 mb-4">
                {error}
              </div>
            )}
            {!result && !error && (
              <p className="text-gray-500">{loading ? 'Generating draft…' : 'Preparing…'}</p>
            )}
            {result && (
              <>
                <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                  <div className="font-medium text-gray-700 mb-1">Context used</div>
                  <ul className="text-gray-600">
                    <li>Account: {result.context.accountName}</li>
                    {result.context.contactName && <li>Contact: {result.context.contactName}</li>}
                    {result.context.departmentName && <li>Department: {result.context.departmentName}</li>}
                  </ul>
                </div>
                <div className="mb-4">
                  <div className="font-medium text-gray-700 mb-1">Subject</div>
                  <p className="text-gray-900">{result.draft.subject}</p>
                </div>
                <div className="mb-4">
                  <div className="font-medium text-gray-700 mb-1">Body</div>
                  <p className="text-gray-800 whitespace-pre-wrap text-sm">{result.draft.body}</p>
                </div>
                {result.contentLibraryMatches.length > 0 && (
                  <div className="mb-4">
                    <div className="font-medium text-gray-700 mb-1">Content Library matches</div>
                    <ul className="text-sm text-gray-600 space-y-0.5">
                      {result.contentLibraryMatches.map((c) => (
                        <li key={c.id}>☑️ {c.title} ({c.type})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap gap-2">
            <a
              href={editHref}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Edit in chat
            </a>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result?.draft}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
