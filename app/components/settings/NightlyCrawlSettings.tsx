'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NightlyCrawlSettingsProps {
  initialPreferredHour: number | null;
  initialCrawlPaused: boolean;
}

export function NightlyCrawlSettings({
  initialPreferredHour,
  initialCrawlPaused,
}: NightlyCrawlSettingsProps) {
  const [preferredHour, setPreferredHour] = useState<number | null>(initialPreferredHour);
  const [crawlPaused, setCrawlPaused] = useState(initialCrawlPaused);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nightlyCrawlPreferredHour: preferredHour,
          crawlPaused,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Crawl settings saved successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i.toString().padStart(2, '0')}:00 UTC`,
  }));

  const hasChanges =
    preferredHour !== initialPreferredHour || crawlPaused !== initialCrawlPaused;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-800 dark:border-zinc-700">
      <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
        Nightly Crawl Schedule
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Configure when scheduled content crawls run and whether they are paused.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Time (UTC)
          </label>
          <Select
            value={preferredHour !== null ? preferredHour.toString() : ''}
            onValueChange={(value) => setPreferredHour(value === '' ? null : parseInt(value, 10))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select hour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not set (use default)</SelectItem>
              {hourOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Preferred hour for nightly crawls to run (0-23, UTC). Note: Crawls run based on cron
            schedule; this preference is for display and future scheduling.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={crawlPaused}
              onChange={(e) => setCrawlPaused(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pause all scheduled crawls
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
            When paused, no scheduled content crawls will run until you re-enable them.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {message && (
            <span
              className={`text-sm ${
                message.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
