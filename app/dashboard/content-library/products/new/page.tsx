'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      router.push('/dashboard/content-library');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/dashboard/content-library"
        className="text-blue-600 hover:underline mb-2 inline-block"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Product Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="NVIDIA DRIVE Platform"
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="End-to-end AI platform for autonomous vehicles"
            rows={3}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="Autonomous Platforms">Autonomous Platforms</option>
            <option value="AI Software">AI Software</option>
            <option value="Hardware">Hardware (GPUs, DGX)</option>
            <option value="Data Center">Data Center Solutions</option>
            <option value="Design Tools">Design & Simulation Tools</option>
            <option value="Edge AI">Edge AI & IoT</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Product
          </button>
          <Link href="/dashboard/content-library" className="flex-1">
            <button
              type="button"
              className="w-full px-6 py-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}
