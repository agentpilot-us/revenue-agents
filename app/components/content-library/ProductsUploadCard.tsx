'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CSV_TEMPLATE = `name,description,priceMin,priceMax,pricingModel,category
"Enterprise Plan","Full platform access",50000,200000,annual,"Enterprise"
"Professional Plan","Team collaboration",10000,50000,annual,"SMB"`;

type Props = {
  onSuccess?: () => void;
};

export function ProductsUploadCard({ onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [details, setDetails] = useState<{ created: number; createdNames: string[]; errors?: string[] } | null>(null);

  const refresh = () => {
    router.refresh();
    onSuccess?.();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setDetails(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/content-library/products/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.details || 'Upload failed';
        throw new Error(msg);
      }
      setSuccess(
        data.created > 0
          ? `Added ${data.created} product${data.created === 1 ? '' : 's'}.`
          : 'Upload complete (no new products added).'
      );
      setDetails({
        created: data.created ?? 0,
        createdNames: data.createdNames ?? [],
        errors: data.errors,
      });
      e.target.value = '';
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Products & services</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Upload a CSV to add products that appear in the Product Penetration Matrix and account research on company
        pages.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-sm font-medium">
          {loading ? 'Uploading…' : 'Upload CSV'}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUpload}
            disabled={loading}
          />
        </label>
        <button
          type="button"
          onClick={downloadTemplate}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-sm text-gray-700 dark:text-gray-300"
        >
          Download template
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        CSV columns: <code className="bg-slate-100 dark:bg-zinc-700 px-1 rounded">name</code> (required),{' '}
        <code className="bg-slate-100 dark:bg-zinc-700 px-1 rounded">description</code>,{' '}
        <code className="bg-slate-100 dark:bg-zinc-700 px-1 rounded">priceMin</code>,{' '}
        <code className="bg-slate-100 dark:bg-zinc-700 px-1 rounded">priceMax</code>,{' '}
        <code className="bg-slate-100 dark:bg-zinc-700 px-1 rounded">pricingModel</code>,{' '}
        <code className="bg-slate-100 dark:bg-zinc-700 px-1 rounded">category</code>
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400 mb-2">{success}</p>}
      {details && details.createdNames.length > 0 && (
        <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside mb-2">
          {details.createdNames.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {details?.errors && details.errors.length > 0 && (
        <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
          {details.errors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
