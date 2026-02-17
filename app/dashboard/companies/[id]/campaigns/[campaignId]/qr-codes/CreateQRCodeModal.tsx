'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Dept = { id: string; customName: string | null; type: string };

export function CreateQRCodeModal({
  campaignId,
  departments,
  onClose,
}: {
  campaignId: string;
  departments: Dept[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    departmentId: '',
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    size: 512,
    errorCorrection: 'M',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/qr-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          shortCode: formData.shortCode.trim() || undefined,
          departmentId: formData.departmentId || undefined,
          foregroundColor: formData.foregroundColor,
          backgroundColor: formData.backgroundColor,
          size: formData.size,
          errorCorrection: formData.errorCorrection,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create QR code');
      }
      router.refresh();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!confirm('Create one QR code for each department?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/qr-codes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foregroundColor: formData.foregroundColor,
          backgroundColor: formData.backgroundColor,
          size: formData.size,
          errorCorrection: formData.errorCorrection,
        }),
      });
      if (!res.ok) throw new Error('Failed to create QR codes');
      router.refresh();
      onClose();
    } catch {
      alert('Failed to create QR codes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Create QR Code
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. GTC 2024 Booth, Email Signature"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Short Code (optional)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/q/</span>
                <input
                  type="text"
                  value={formData.shortCode}
                  onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                  placeholder="auto-generated"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank to auto-generate from campaign and name
              </p>
            </div>
            {departments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department (optional)
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
                >
                  <option value="">No specific department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.customName || dept.type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                <option value="L">Low (7%)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create QR Code'}
              </button>
              {departments.length > 1 && (
                <button
                  type="button"
                  onClick={handleBatchCreate}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  Create for All Departments
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
