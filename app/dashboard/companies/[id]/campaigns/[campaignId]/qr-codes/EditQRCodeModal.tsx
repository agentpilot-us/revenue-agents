'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodePreview } from './QRCodePreview';

type QRCode = {
  id: string;
  name: string;
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  errorCorrection: string;
};

export function EditQRCodeModal({
  qrCode,
  onClose,
}: {
  qrCode: QRCode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: qrCode.name,
    foregroundColor: qrCode.foregroundColor,
    backgroundColor: qrCode.backgroundColor,
    size: qrCode.size,
    errorCorrection: qrCode.errorCorrection,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/qr-codes/${qrCode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update QR code');
      router.refresh();
      onClose();
    } catch {
      alert('Failed to update QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this QR code? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/qr-codes/${qrCode.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
      onClose();
    } catch {
      alert('Failed to delete QR code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Edit QR Code
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Preview</h3>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4 flex justify-center">
                <QRCodePreview qrCodeId={qrCode.id} size={256} />
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Foreground
                  </label>
                  <input
                    type="color"
                    value={formData.foregroundColor}
                    onChange={(e) => setFormData({ ...formData, foregroundColor: e.target.value })}
                    className="w-full h-10 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background
                  </label>
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    className="w-full h-10 rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size: {formData.size}px
                </label>
                <input
                  type="range"
                  min={256}
                  max={2048}
                  step={256}
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Correction
                </label>
                <select
                  value={formData.errorCorrection}
                  onChange={(e) => setFormData({ ...formData, errorCorrection: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
                >
                  <option value="L">Low</option>
                  <option value="M">Medium</option>
                  <option value="Q">Quartile</option>
                  <option value="H">High</option>
                </select>
              </div>
            </form>
          </div>
          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
            >
              Delete QR Code
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
