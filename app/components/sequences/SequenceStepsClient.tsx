'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type StepRow = {
  id: string;
  order: number;
  dayOffset: number;
  channel: string;
  role: string;
  promptTemplate: string | null;
  ctaType: string | null;
};

type Props = {
  sequenceId: string;
  sequenceName: string;
  initialSteps: StepRow[];
};

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'call_task', label: 'Call task' },
];

export function SequenceStepsClient({ sequenceId, sequenceName, initialSteps }: Props) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [adding, setAdding] = useState(false);
  const [order, setOrder] = useState(initialSteps.length);
  const [dayOffset, setDayOffset] = useState(0);
  const [channel, setChannel] = useState<'email' | 'linkedin' | 'call_task'>('email');
  const [role, setRole] = useState('');
  const [ctaType, setCtaType] = useState('');

  const handleAddStep = useCallback(async () => {
    setAdding(true);
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order,
          dayOffset,
          channel,
          role: role.trim() || 'step',
          ctaType: ctaType.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSteps((prev) => [
          ...prev,
          {
            id: data.id,
            order: data.order,
            dayOffset: data.dayOffset,
            channel: data.channel,
            role: data.role,
            promptTemplate: data.promptTemplate ?? null,
            ctaType: data.ctaType ?? null,
          },
        ]);
        setOrder((o) => o + 1);
        setRole('');
        setCtaType('');
        router.refresh();
      }
    } finally {
      setAdding(false);
    }
  }, [sequenceId, order, dayOffset, channel, role, ctaType, router]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Steps</h2>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            No steps yet. Add steps with day offset (days until this step is due after the previous one), channel (Email, LinkedIn, Call task), and optional role/CTA. Example: Day 0 email with link → Day 2 LinkedIn → Day 5 follow-up email.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-600">
                <th className="pb-2 pr-4">Order</th>
                <th className="pb-2 pr-4">Day</th>
                <th className="pb-2 pr-4">Channel</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">CTA</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-zinc-700">
                  <td className="py-2 pr-4">{s.order}</td>
                  <td className="py-2 pr-4">{s.dayOffset}</td>
                  <td className="py-2 pr-4 capitalize">{s.channel.replace('_', ' ')}</td>
                  <td className="py-2 pr-4">{s.role}</td>
                  <td className="py-2">{s.ctaType ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-600 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order</label>
            <input
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Day offset</label>
            <input
              type="number"
              min={0}
              value={dayOffset}
              onChange={(e) => setDayOffset(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'email' | 'linkedin' | 'call_task')}
              className="w-full rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
            <input
              type="text"
              placeholder="e.g. opener, value_add"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CTA type</label>
            <input
              type="text"
              placeholder="e.g. single_question"
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-zinc-500 px-2 py-1.5 text-sm bg-white dark:bg-zinc-800"
            />
          </div>
        </div>
        <Button className="mt-3" size="sm" onClick={handleAddStep} disabled={adding}>
          {adding ? 'Adding…' : 'Add step'}
        </Button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Day offset = days until this step is due (from enrollment for step 1, from previous touch for later steps). Enroll contacts from a company&apos;s contact list; in chat say &quot;Draft the next sequence email for [Contact]&quot; to get the next step and send.
      </p>
    </div>
  );
}
