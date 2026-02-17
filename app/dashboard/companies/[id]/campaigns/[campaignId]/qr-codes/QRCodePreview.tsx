'use client';

import { useEffect, useState } from 'react';

export function QRCodePreview({
  qrCodeId,
  size = 256,
}: {
  qrCodeId: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/qr-codes/${qrCodeId}/preview?size=${size}`);
        const data = await res.json();
        if (res.ok && data.dataUrl && !cancelled) setDataUrl(data.dataUrl);
      } catch {
        if (!cancelled) setDataUrl('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [qrCodeId, size]);

  if (loading) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center"
      >
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }
  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center"
      >
        <span className="text-gray-400 text-sm">Failed to load</span>
      </div>
    );
  }
  return (
    <img
      src={dataUrl}
      alt="QR Code"
      style={{ width: size, height: size }}
      className="rounded-lg"
    />
  );
}
