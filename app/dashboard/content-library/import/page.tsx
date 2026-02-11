'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ImportContentPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');

  const [editedTags, setEditedTags] = useState<any>(null);

  useEffect(() => {
    async function fetchProducts() {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products ?? []);
      if (data.products?.length > 0) {
        setSelectedProduct(data.products[0].id);
      }
    }
    fetchProducts();
  }, []);

  const handleScrape = async () => {
    if (!url || !selectedProduct) {
      setError('Please enter URL and select product');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);
    setEditedTags(null);

    try {
      const response = await fetch('/api/content-library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, productId: selectedProduct }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Import failed');
      }

      setPreview(data);
      setEditedTags(data.inference);
      setLoading(false);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message ?? 'Import failed');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !editedTags) return;
    try {
      const response = await fetch('/api/content-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          type: preview.extractedContent.type,
          title: preview.extractedContent.title,
          content: preview.extractedContent,
          persona: editedTags.persona,
          department: editedTags.department,
          industry: editedTags.industry,
          sourceUrl: url,
          inferredTags: preview.inference,
          confidenceScore: editedTags.confidence,
          userConfirmed: true,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/content-library');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/content-library"
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Content Library
        </Link>
        <h1 className="text-2xl font-bold">Import Content from URL</h1>
        <p className="text-gray-600">
          AI will scrape the page and infer organizational tags from context
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Product Page URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.nvidia.com/en-us/industries/automotive/"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select product</option>
              {products.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleScrape}
            disabled={!url || !selectedProduct || loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? '🔄 Analyzing page...' : '🌐 Scrape & Extract Content'}
          </button>
        </div>
      </div>

      {preview && editedTags && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold">Review Extracted Content</h2>
            <span
              className={`px-3 py-1 text-sm rounded ${
                preview.inference.confidence === 'high'
                  ? 'bg-green-100 text-green-700'
                  : preview.inference.confidence === 'medium'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {preview.inference.confidence === 'high' && '✓ High Confidence'}
              {preview.inference.confidence === 'medium' && '~ Medium Confidence'}
              {preview.inference.confidence === 'low' &&
                '⚠️ Low Confidence - Please Review'}
            </span>
          </div>

          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>🤖</span> AI Inferred Tags
              {preview.inference.confidence === 'low' && (
                <span className="text-sm font-normal text-amber-700">
                  (Please verify and edit)
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Industry</label>
                <select
                  value={editedTags.industry || ''}
                  onChange={(e) =>
                    setEditedTags({ ...editedTags, industry: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded bg-white"
                >
                  <option value="">Select industry</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Technology">Technology</option>
                  <option value="Retail">Retail</option>
                  <option value="Energy">Energy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={editedTags.department || ''}
                  onChange={(e) =>
                    setEditedTags({ ...editedTags, department: e.target.value })
                  }
                  placeholder="e.g., Autonomous Vehicles"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Persona</label>
                <input
                  type="text"
                  value={editedTags.persona || ''}
                  onChange={(e) =>
                    setEditedTags({ ...editedTags, persona: e.target.value })
                  }
                  placeholder="e.g., VP Autonomous Vehicles"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>AI Reasoning:</strong> {preview.inference.reasoning}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Title</p>
              <p className="font-semibold text-lg">
                {preview.extractedContent.title}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Type</p>
              <span className="px-3 py-1 bg-gray-100 rounded">
                {preview.extractedContent.type}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Value Proposition
              </p>
              <p className="text-gray-800">
                {preview.extractedContent.valueProp}
              </p>
            </div>

            {preview.extractedContent.useCases &&
              preview.extractedContent.useCases.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Use Cases ({preview.extractedContent.useCases.length})
                  </p>
                  <div className="space-y-3">
                    {preview.extractedContent.useCases.map((uc: any, i: number) => (
                      <div key={i} className="bg-gray-50 p-3 rounded">
                        <p className="font-medium">{uc.name}</p>
                        <p className="text-sm text-gray-600">{uc.description}</p>
                        {uc.targetDepartment && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            🏛️ {uc.targetDepartment}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {preview.extractedContent.benefits &&
              preview.extractedContent.benefits.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Key Benefits
                  </p>
                  <ul className="space-y-1">
                    {preview.extractedContent.benefits.map(
                      (b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{b}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {preview.extractedContent.successStories &&
              preview.extractedContent.successStories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Success Stories
                  </p>
                  <div className="space-y-3">
                    {preview.extractedContent.successStories.map(
                      (story: any, i: number) => (
                        <div
                          key={i}
                          className="border-l-4 border-purple-500 pl-4 py-2"
                        >
                          <p className="font-semibold">{story.company}</p>
                          {story.industry && (
                            <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {story.industry}
                            </span>
                          )}
                          {story.department && (
                            <span className="inline-block mt-1 ml-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {story.department}
                            </span>
                          )}
                          <p className="text-sm text-gray-600 mt-2">
                            {story.challenge}
                          </p>
                          {story.results && story.results.length > 0 && (
                            <ul className="mt-2 text-sm">
                              {story.results.map((r: string, j: number) => (
                                <li key={j} className="text-green-700">
                                  ✓ {r}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              ✓ Save to Content Library
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              ✗ Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

