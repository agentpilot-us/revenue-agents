'use client';

import { useState } from 'react';
import { updateAlertSettings } from './actions';

type Settings = {
  enabled?: boolean;
  email?: boolean;
  emailDigest?: 'instant' | 'daily';
  slack?: boolean;
  inApp?: boolean;
  slackWebhookUrl?: string;
  webhookUrl?: string;
  highValueVisitor?: boolean;
  executiveVisit?: boolean;
  multipleChatMessages?: boolean;
  formSubmission?: boolean;
  ctaClicked?: boolean;
  returningVisitor?: boolean;
};

export function AlertSettingsForm({
  userEmail,
  initialSettings,
}: {
  userEmail: string | null;
  initialSettings: Settings | null;
}) {
  const s = initialSettings || {};
  const [formData, setFormData] = useState({
    enabled: s.enabled !== false,
    email: s.email !== false,
    emailDigest: (s.emailDigest as 'instant' | 'daily') || 'instant',
    slack: s.slack !== false,
    inApp: s.inApp !== false,
    slackWebhookUrl: s.slackWebhookUrl || '',
    webhookUrl: s.webhookUrl || '',
    highValueVisitor: s.highValueVisitor !== false,
    executiveVisit: s.executiveVisit !== false,
    multipleChatMessages: s.multipleChatMessages !== false,
    formSubmission: s.formSubmission !== false,
    ctaClicked: s.ctaClicked !== false,
    returningVisitor: s.returningVisitor !== false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateAlertSettings({
        ...formData,
        slackWebhookUrl: formData.slackWebhookUrl || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
        <label className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Enable Alerts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Get notified when high-value visitors engage with your landing pages
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="rounded border-gray-300 dark:border-zinc-600"
          />
        </label>
      </div>

      {formData.enabled && (
        <>
          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Notification Channels</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Email</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Send to {userEmail || 'your account email'}</p>
                </div>
              </label>
              {formData.email && (
                <div className="ml-7 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery</p>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="emailDigest"
                      checked={formData.emailDigest === 'instant'}
                      onChange={() => setFormData({ ...formData, emailDigest: 'instant' })}
                      className="rounded"
                    />
                    <span className="text-gray-900 dark:text-gray-100">Instant (one email per alert)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="emailDigest"
                      checked={formData.emailDigest === 'daily'}
                      onChange={() => setFormData({ ...formData, emailDigest: 'daily' })}
                      className="rounded"
                    />
                    <span className="text-gray-900 dark:text-gray-100">Daily digest (one email per day)</span>
                  </label>
                </div>
              )}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.slack}
                  onChange={(e) => setFormData({ ...formData, slack: e.target.checked })}
                  className="rounded"
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">Slack</span>
              </label>
              {formData.slack && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.slackWebhookUrl}
                    onChange={(e) => setFormData({ ...formData, slackWebhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Get your Slack webhook URL →
                    </a>
                  </p>
                </div>
              )}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.inApp}
                  onChange={(e) => setFormData({ ...formData, inApp: e.target.checked })}
                  className="rounded"
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">In-App Notifications</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Alert Types</h3>
            <div className="space-y-3">
              {[
                { key: 'highValueVisitor', label: 'High-value visitor from target account', icon: '🎯' },
                { key: 'executiveVisit', label: 'Executive (C-level, VP, Director) visit', icon: '👔' },
                { key: 'multipleChatMessages', label: 'Visitor sends 5+ chat messages', icon: '💬' },
                { key: 'formSubmission', label: 'Form submission', icon: '📝' },
                { key: 'ctaClicked', label: 'CTA clicked', icon: '🎯' },
                { key: 'returningVisitor', label: 'High-engagement visitor returns', icon: '🔄' },
              ].map(({ key, label, icon }) => (
                <label key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData[key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-gray-900 dark:text-gray-100">{icon} {label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Advanced</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Webhook URL (optional)
              </label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://your-service.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Integrate with Zapier, Make, or your own service</p>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3">
        {saved && <span className="text-green-600 dark:text-green-400 py-2">✓ Settings saved</span>}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
