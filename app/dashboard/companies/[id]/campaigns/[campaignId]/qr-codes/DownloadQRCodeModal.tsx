'use client';

import { useState } from 'react';
import { QRCodePreview } from './QRCodePreview';

type QRCode = {
  id: string;
  name: string;
  shortCode: string;
  scanCount: number;
  lastScannedAt: string | null;
};

export function DownloadQRCodeModal({
  qrCode,
  onClose,
}: {
  qrCode: QRCode;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [size, setSize] = useState(512);

  const handleDownload = () => {
    const url = `/api/qr-codes/${qrCode.id}/download?format=${format}${format === 'png' ? `&size=${size}` : ''}`;
    window.open(url, '_blank');
  };

  const copyUrl = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/q/${qrCode.shortCode}` : '';
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Download QR Code: {qrCode.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Preview</h3>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4 flex justify-center">
                <QRCodePreview qrCodeId={qrCode.id} size={256} />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Short URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/q/${qrCode.shortCode}` : ''}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-900 text-sm"
                  />
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total Scans:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{qrCode.scanCount}</span>
                </div>
                {qrCode.lastScannedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Last Scanned:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(qrCode.lastScannedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Download Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('png')}
                      className={`px-4 py-2 rounded-lg border ${
                        format === 'png'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
                      }`}
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('svg')}
                      className={`px-4 py-2 rounded-lg border ${
                        format === 'svg'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
                      }`}
                    >
                      SVG
                    </button>
                  </div>
                </div>
                {format === 'png' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Size: {size}px
                    </label>
                    <input
                      type="range"
                      min={256}
                      max={2048}
                      step={256}
                      value={size}
                      onChange={(e) => setSize(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Download {format.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
