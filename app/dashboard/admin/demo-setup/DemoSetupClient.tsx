'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Circle, Loader2, Lock } from 'lucide-react';
import {
  lockAsDemo,
  createDemoCampaign,
  seedDemoActivities,
  seedDemoCampaignVisits,
  seedDemoData,
  seedDemoRoadmapForCompany,
} from '@/app/dashboard/admin/demo-setup/actions';

type CompanyForDemo = {
  id: string;
  name: string;
  domain: string | null;
  isDemoAccount: boolean;
  demoLockedAt: Date | null;
  demoVertical: string | null;
  researchData: unknown;
  _count: { contacts: number; departments: number };
  accountMessaging: { id: string } | null;
  segmentCampaigns: { id: string }[];
};

type Props = {
  companies: CompanyForDemo[];
  verticals: readonly string[];
  userId: string;
};

export function DemoSetupClient({ companies, verticals, userId }: Props) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id ?? '');
  const [vertical, setVertical] = useState<string>(verticals[0] ?? 'saas');
  const [demoNote, setDemoNote] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  const company = companies.find((c) => c.id === companyId);
  const step1Done = !!company?.researchData && (company?._count.departments ?? 0) > 0;
  const step2Done = (company?._count.contacts ?? 0) > 0;
  const step3Done = !!company?.accountMessaging;
  const step4Done = (company?.segmentCampaigns?.length ?? 0) > 0;
  const allStepsDone = step1Done && step2Done && step3Done && step4Done;
  const isLocked = !!company?.isDemoAccount;

  async function handleBuildDemo() {
    if (!companyId) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const base = window.location.origin;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };

      const researchRes = await fetch(`${base}/api/companies/${companyId}/research`, { method: 'POST', headers, credentials: 'include' });
      if (!researchRes.ok) {
        const j = await researchRes.json().catch(() => ({}));
        throw new Error(j.error || researchRes.statusText || 'Research failed');
      }
      const { data: researchData } = await researchRes.json();

      const applyRes = await fetch(`${base}/api/companies/${companyId}/apply-research`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(researchData),
      });
      if (!applyRes.ok) {
        const j = await applyRes.json().catch(() => ({}));
        throw new Error(j.error || applyRes.statusText || 'Apply research failed');
      }

      const findRes = await fetch(`${base}/api/companies/${companyId}/contacts/find-and-enrich`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!findRes.ok) throw new Error('Find & enrich failed');
      const reader = findRes.body?.getReader();
      if (reader) {
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
        }
      }

      const msgRes = await fetch(`${base}/api/companies/${companyId}/account-messaging/generate`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (!msgRes.ok) {
        const j = await msgRes.json().catch(() => ({}));
        throw new Error(j.error || msgRes.statusText || 'Generate messaging failed');
      }

      const campRes = await createDemoCampaign(companyId);
      if (!campRes.ok) throw new Error(campRes.error);

      await seedDemoActivities(companyId);
      await seedDemoCampaignVisits(companyId);

      router.refresh();
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : 'Build failed');
    } finally {
      setBuilding(false);
    }
  }

  async function handleSeedDemoData() {
    if (!companyId) return;
    setSeedLoading(true);
    setSeedError(null);
    try {
      const res = await seedDemoData(companyId);
      if (!res.ok) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'Seed failed');
    } finally {
      setSeedLoading(false);
    }
  }

  async function handleSeedDemoRoadmap() {
    if (!companyId) return;
    setRoadmapLoading(true);
    setRoadmapError(null);
    try {
      const res = await seedDemoRoadmapForCompany(companyId);
      if (!res.ok) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setRoadmapError(e instanceof Error ? e.message : 'Roadmap seed failed');
    } finally {
      setRoadmapLoading(false);
    }
  }

  async function handleLock() {
    if (!companyId || !allStepsDone) return;
    setLockLoading(true);
    setLockError(null);
    try {
      const res = await lockAsDemo(companyId, vertical, demoNote.trim() || null);
      if (!res.ok) throw new Error(res.error);
      router.push(`/dashboard/companies/${companyId}`);
      router.refresh();
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Lock failed');
    } finally {
      setLockLoading(false);
    }
  }

  return (
    <div className="space-y-6 text-sm">
      <div>
        <label className="block text-slate-400 mb-1">Vertical</label>
        <select
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-zinc-800 text-white px-3 py-2"
        >
          {verticals.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-slate-400 mb-1">Company</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-zinc-800 text-white px-3 py-2"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.domain ? `(${c.domain})` : ''} {c.isDemoAccount ? '(locked)' : ''}
            </option>
          ))}
        </select>
      </div>

      {company && !isLocked && (
        <>
          <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-4 space-y-2">
            <p className="text-slate-300 font-medium">Build steps (run in order)</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                {step1Done ? <Check className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-500" />}
                <span className={step1Done ? 'text-green-400' : 'text-slate-400'}>Apply research (departments)</span>
              </li>
              <li className="flex items-center gap-2">
                {step2Done ? <Check className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-500" />}
                <span className={step2Done ? 'text-green-400' : 'text-slate-400'}>Find & enrich contacts</span>
              </li>
              <li className="flex items-center gap-2">
                {step3Done ? <Check className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-500" />}
                <span className={step3Done ? 'text-green-400' : 'text-slate-400'}>Generate messaging</span>
              </li>
              <li className="flex items-center gap-2">
                {step4Done ? <Check className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-500" />}
                <span className={step4Done ? 'text-green-400' : 'text-slate-400'}>Launch campaign</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBuildDemo}
              disabled={building}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Build demo
            </button>
            {step4Done && (
              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={seedLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Seed demo data
              </button>
            )}
            <button
              type="button"
              onClick={handleSeedDemoRoadmap}
              disabled={roadmapLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {roadmapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Seed Adaptive Roadmap
            </button>
          </div>
          {buildError && <p className="text-red-400">{buildError}</p>}
          {seedError && <p className="text-red-400">{seedError}</p>}
          {roadmapError && <p className="text-red-400">{roadmapError}</p>}

          {allStepsDone && (
            <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-4 space-y-3">
              <p className="text-slate-300 font-medium">Lock as demo</p>
              <textarea
                value={demoNote}
                onChange={(e) => setDemoNote(e.target.value)}
                placeholder="e.g. NVIDIA/GM semiconductor demo — built 2026-02-23 — contacts: 12, segments: 4"
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-zinc-800 text-white px-3 py-2 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={handleLock}
                disabled={lockLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800 disabled:opacity-50"
              >
                {lockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Lock as demo
              </button>
              {lockError && <p className="text-red-400">{lockError}</p>}
            </div>
          )}
        </>
      )}

      {company?.isDemoAccount && (
        <p className="text-slate-400">
          This account is locked as a demo. <Link href={`/dashboard/companies/${company.id}`} className="text-amber-400 hover:underline">Open company</Link>
        </p>
      )}
    </div>
  );
}
