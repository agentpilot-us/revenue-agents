'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { QRCodePreview } from './QRCodePreview';
import { CreateQRCodeModal } from './CreateQRCodeModal';
import { EditQRCodeModal } from './EditQRCodeModal';
import { DownloadQRCodeModal } from './DownloadQRCodeModal';

type QRCode = {
  id: string;
  name: string;
  shortCode: string;
  scanCount: number;
  lastScannedAt: string | null;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  errorCorrection: string;
};

type Dept = { id: string; customName: string | null; type: string };

type Props = {
  companyId: string;
  campaign: { id: string; title: string; companyId: string };
  qrCodes: QRCode[];
  departments: Dept[];
};

export function QRCodeManager({ companyId, campaign, qrCodes, departments }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<QRCode | null>(null);
  const [downloading, setDownloading] = useState<QRCode | null>(null);

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link
            href={`/dashboard/companies/${companyId}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
          >
            ← Back to Company
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            QR Codes: {campaign.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Generate QR codes for events, print materials, and email signatures
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create QR Code
        </button>
      </div>

      {qrCodes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-12 text-center">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No QR codes yet
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Create QR codes to share your landing page at events, on business cards, or in print materials
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your First QR Code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qr) => (
            <div
              key={qr.id}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6"
            >
              <div className="flex justify-center mb-4">
                <QRCodePreview qrCodeId={qr.id} size={200} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{qr.name}</h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <div className="flex items-center gap-2">
                  <span>🔗</span>
                  <code className="text-xs bg-gray-100 dark:bg-zinc-900 px-2 py-1 rounded">
                    /q/{qr.shortCode}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>{qr.scanCount} scans</span>
                </div>
                {qr.lastScannedAt && (
                  <div className="flex items-center gap-2">
                    <span>⏱️</span>
                    <span>
                      Last scan {formatDistanceToNow(new Date(qr.lastScannedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDownloading(qr)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(qr)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateQRCodeModal
          campaignId={campaign.id}
          departments={departments}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <EditQRCodeModal qrCode={editing} onClose={() => setEditing(null)} />
      )}
      {downloading && (
        <DownloadQRCodeModal qrCode={downloading} onClose={() => setDownloading(null)} />
      )}
    </div>
  );
}
