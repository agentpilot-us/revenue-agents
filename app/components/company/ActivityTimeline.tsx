'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogActivityModal } from './LogActivityModal';

type ActivityItem = {
  id: string;
  type: string;
  summary: string;
  createdAt: Date;
  contactId?: string | null;
  contactName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  channel: 'email' | 'landing_page' | 'chat' | 'salesforce' | 'manual';
  metadata?: {
    ctaClicked?: boolean;
    chatMessages?: number;
    visitorEmail?: string;
  };
};

type Props = {
  companyId: string;
  initialActivities: Array<{
    id: string;
    type: string;
    summary: string;
    createdAt: Date;
  }>;
  departments?: Array<{ id: string; customName: string | null; type: string }>;
  contacts?: Array<{ id: string; firstName: string | null; lastName: string | null }>;
};

export function ActivityTimeline({ companyId, initialActivities, departments = [], contacts = [] }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [filters, setFilters] = useState<{
    contactId?: string;
    departmentId?: string;
    channel?: string;
  }>({});

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.contactId) params.append('contactId', filters.contactId);
        if (filters.departmentId) params.append('departmentId', filters.departmentId);
        if (filters.channel) params.append('channel', filters.channel);

        const res = await fetch(`/api/companies/${companyId}/activities?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        // Fallback to initial activities
        setActivities(
          initialActivities.map((a) => ({
            ...a,
            channel: 'email' as const,
          }))
        );
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [companyId, filters, initialActivities]);

  const getActivityIcon = (type: string, channel: string) => {
    if (channel === 'salesforce') {
      if (type.includes('Meeting') || type.includes('Call')) return '📞';
      if (type.includes('Email')) return '📧';
      return '📋';
    }
    if (channel === 'landing_page') return '🌐';
    if (channel === 'chat') return '💬';
    if (type === 'EMAIL_SENT' || type === 'Email') return '📧';
    if (type === 'Research') return '🔍';
    if (type === 'ContactDiscovered') return '👥';
    return '📝';
  };

  const getActivityLabel = (item: ActivityItem) => {
    if (item.channel === 'landing_page') {
      return item.metadata?.ctaClicked ? 'CTA Clicked' : 'Landing Page Visit';
    }
    if (item.channel === 'chat') {
      return `Chat Interaction (${item.metadata?.chatMessages || 0} messages)`;
    }
    if (item.channel === 'salesforce') {
      return item.type;
    }
    return item.summary;
  };

  const filteredActivities = activities.filter((a) => {
    if (filters.contactId && a.contactId !== filters.contactId) return false;
    if (filters.departmentId && a.departmentId !== filters.departmentId) return false;
    if (filters.channel && a.channel !== filters.channel) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Activity Timeline
        </h2>
        <Button size="sm" onClick={() => setShowLogModal(true)}>
          Log Activity
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 border border-gray-200 dark:border-zinc-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Channel
            </label>
            <select
              value={filters.channel || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  channel: e.target.value || undefined,
                }))
              }
              className="w-full p-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
            >
              <option value="">All Channels</option>
              <option value="email">Email</option>
              <option value="landing_page">Landing Page</option>
              <option value="chat">Chat</option>
              <option value="salesforce">Salesforce</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buying Group
            </label>
            <select
              value={filters.departmentId || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  departmentId: e.target.value || undefined,
                }))
              }
              className="w-full p-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
            >
              <option value="">All Buying Groups</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.customName || dept.type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact
            </label>
            <select
              value={filters.contactId || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  contactId: e.target.value || undefined,
                }))
              }
              className="w-full p-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
            >
              <option value="">All Contacts</option>
              {contacts.map((contact) => {
                const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
                return (
                  <option key={contact.id} value={contact.id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading activities...</div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No activities found. Log an activity to get started.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow divide-y dark:divide-zinc-700">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getActivityIcon(activity.type, activity.channel)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {getActivityLabel(activity)}
                    </p>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300">
                      {activity.channel.replace(/_/g, ' ')}
                    </span>
                    {activity.contactName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        · {activity.contactName}
                      </span>
                    )}
                    {activity.departmentName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        · {activity.departmentName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLogModal && (
        <LogActivityModal
          companyId={companyId}
          open={showLogModal}
          onOpenChange={setShowLogModal}
          onSuccess={() => {
            setShowLogModal(false);
            // Refresh activities
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
