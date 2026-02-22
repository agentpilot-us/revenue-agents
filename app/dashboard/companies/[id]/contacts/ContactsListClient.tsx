'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CrmImportPushCard } from '@/app/components/company/CrmImportPushCard';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, CheckCircle2, Info, Columns2, Linkedin, Upload, UserPlus, Circle, X } from 'lucide-react';

type ContactRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  companyDepartmentId: string | null;
  departmentName: string | null;
  personaName: string | null;
  isResponsive: boolean;
  isDormant: boolean;
  enrichmentStatus: string | null;
  enrichedAt: string | null;
  crmSource: string | null;
  /** @deprecated Sequences removed; outbound handled by Salesforce/HubSpot. Kept for API compatibility. */
  activeEnrollments?: Array<{ id: string; sequenceId: string; sequenceName: string }>;
};

type DepartmentOption = { id: string; name: string; contactCount?: number };

type Props = {
  companyId: string;
  companyName: string;
  contacts: ContactRow[];
  departments: DepartmentOption[];
  companyCrm: { source: 'salesforce' | 'hubspot'; accountId: string } | null;
};

function CrmSourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-gray-400">—</span>;
  const label = source === 'salesforce' ? 'Salesforce' : source === 'hubspot' ? 'HubSpot' : source;
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-600 text-slate-700 dark:text-zinc-300">
      {label}
    </span>
  );
}

function EnrichmentCell({
  status,
  onEnrichNow,
  enriching,
}: {
  status: string | null;
  onEnrichNow?: () => void;
  enriching?: boolean;
}) {
  if (!status) {
    return onEnrichNow ? (
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEnrichNow} disabled={enriching}>
        Enrich now
      </Button>
    ) : (
      <span className="text-slate-500">—</span>
    );
  }
  if (status === 'pending' || status === 'enriching') {
    return (
      <div className="flex flex-col gap-1 min-w-[100px]">
        <div className="h-1 w-full rounded-full bg-slate-600 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 text-blue-400 text-xs">
          <span>Enriching…</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>Finding email, phone, LinkedIn profile</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }
  if (status === 'complete') {
    return (
      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="text-sm">Complete</span>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-sm">Failed</span>
        {onEnrichNow && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400" onClick={onEnrichNow} disabled={enriching}>
            Retry
          </Button>
        )}
      </div>
    );
  }
  return <span className="text-slate-500">{status}</span>;
}

export function ContactsListClient({
  companyId,
  companyName,
  contacts: initialContacts,
  departments,
  companyCrm,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'responsive' | 'dormant'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [enrichmentBannerDismissed, setEnrichmentBannerDismissed] = useState(false);
  const [onboardingBannerDismissed, setOnboardingBannerDismissed] = useState(false);
  const [findAndEnrichRunning, setFindAndEnrichRunning] = useState(false);
  const [findAndEnrichStatus, setFindAndEnrichStatus] = useState<string | null>(null);
  const [findAndEnrichResult, setFindAndEnrichResult] = useState<{
    departmentsProcessed: number;
    contactsAdded: number;
    enriched: number;
    failed: number;
  } | null>(null);
  const pendingCount = initialContacts.filter((c) => c.enrichmentStatus === 'pending').length;
  const showEnrichmentBanner =
    (pendingCount > 0 || enriching) && !enrichmentBannerDismissed;

  const isOnboarding = searchParams.get('onboarding') === '1';
  const showOnboardingBanner =
    isOnboarding &&
    departments.length > 0 &&
    !onboardingBannerDismissed;

  const handleDismissOnboardingBanner = useCallback(() => {
    setOnboardingBannerDismissed(true);
    router.replace(`/dashboard/companies/${companyId}/contacts`);
  }, [companyId, router]);

  // Scroll to buying groups when landing from research with segments ready
  useEffect(() => {
    if (!showOnboardingBanner || departments.length === 0) return;
    const el = document.getElementById('buying-groups');
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      return () => clearTimeout(t);
    }
  }, [showOnboardingBanner, departments.length]);

  const columnsHasData = useMemo(
    () => ({
      role: initialContacts.some((c) => !!c.personaName),
      enrichment: initialContacts.some((c) => !!c.enrichmentStatus),
      status: initialContacts.some((c) => c.isResponsive || c.isDormant),
      crm: initialContacts.some((c) => !!c.crmSource),
    }),
    [initialContacts]
  );
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => ({
    role: true,
    enrichment: true,
    status: true,
    crm: true,
  }));
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const showColumn = (key: keyof typeof columnsHasData) => visibleColumns[key] !== false;

  const filtered = useMemo(() => {
    let list = initialContacts;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.firstName?.toLowerCase().includes(q) ||
            c.lastName?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.title?.toLowerCase().includes(q) ||
            c.personaName?.toLowerCase().includes(q))
      );
    }
    if (departmentFilter) {
      list = list.filter((c) => c.companyDepartmentId === departmentFilter);
    }
    if (statusFilter === 'responsive') {
      list = list.filter((c) => c.isResponsive);
    } else if (statusFilter === 'dormant') {
      list = list.filter((c) => c.isDormant);
    }
    return list;
  }, [initialContacts, search, departmentFilter, statusFilter, departments]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const launchOutreachUrl = selectedIds.size > 0
    ? `/dashboard/companies/${companyId}/launch-outreach?contacts=${Array.from(selectedIds).join(',')}`
    : `/dashboard/companies/${companyId}/launch-outreach`;

  const handleEnrichPending = async () => {
    setEnriching(true);
    setEnrichmentBannerDismissed(false);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/enrich-pending`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const processed = data?.processed ?? 0;
        const enriched = data?.enriched ?? 0;
        if (processed > 0) {
          toast.success(
            enriched > 0
              ? `Enrichment complete. ${enriched} contact${enriched !== 1 ? 's' : ''} enriched.`
              : `Enrichment started for ${processed} contact(s).`
          );
        }
        router.refresh();
      }
    } finally {
      setEnriching(false);
    }
  };

  const scrollToContactsTable = () => {
    setDepartmentFilter('');
    setTimeout(() => {
      document.getElementById('contacts-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFindAndEnrichAll = useCallback(async () => {
    setFindAndEnrichRunning(true);
    setFindAndEnrichStatus('Finding contacts for all segments…');
    setFindAndEnrichResult(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/find-and-enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Find and enrich failed');
      }
      if (!res.body) {
        throw new Error('No response stream');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              departmentCount?: number;
              departmentName?: string;
              contactsAdded?: number;
              departmentsProcessed?: number;
              enriched?: number;
              failed?: number;
              message?: string;
            };
            if (event.type === 'started') {
              setFindAndEnrichStatus(`Finding contacts for ${event.departmentCount ?? 0} departments…`);
            } else if (event.type === 'department') {
              setFindAndEnrichStatus(
                `Added ${event.contactsAdded ?? 0} to ${event.departmentName ?? 'segment'}. Finding more…`
              );
            } else if (event.type === 'enriching') {
              setFindAndEnrichStatus('Enriching contacts…');
            } else if (event.type === 'complete') {
              setFindAndEnrichResult({
                departmentsProcessed: event.departmentsProcessed ?? 0,
                contactsAdded: event.contactsAdded ?? 0,
                enriched: event.enriched ?? 0,
                failed: event.failed ?? 0,
              });
              setFindAndEnrichStatus(null);
              toast.success(
                `Added ${event.contactsAdded ?? 0} contacts, enriched ${event.enriched ?? 0}.`
              );
              router.refresh();
              scrollToContactsTable();
            } else if (event.type === 'error') {
              setFindAndEnrichStatus(null);
              toast.error(event.message ?? 'Find and enrich failed');
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (e) {
      setFindAndEnrichStatus(null);
      toast.error(e instanceof Error ? e.message : 'Find and enrich failed');
    } finally {
      setFindAndEnrichRunning(false);
    }
  }, [companyId, router]);

  const deptsWithContacts = departments.filter((d) => (d.contactCount ?? 0) > 0).length;
  const allEnriched = initialContacts.length > 0 && initialContacts.every((c) => c.enrichmentStatus === 'complete');
  const canProceedToOutreach = initialContacts.length > 0;

  return (
    <div className="space-y-4">
      {/* Just arrived from research: segments ready — find the people */}
      {showOnboardingBanner && (
        <div
          id="onboarding-banner"
          className="flex items-center justify-between gap-4 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-slate-200"
          role="status"
        >
          <span>
            Your {departments.length} buying segment{departments.length === 1 ? '' : 's'} are ready — find the people below.
          </span>
          <button
            type="button"
            onClick={handleDismissOnboardingBanner}
            className="shrink-0 p-1 rounded hover:bg-green-500/20 text-slate-400 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 3 sub-progress */}
      <div className="rounded-lg border border-zinc-600 bg-zinc-800/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="font-medium text-slate-100">Step 3: Find Contacts</h4>
          <span className="text-xs text-slate-400">
            {deptsWithContacts} of {departments.length || 1} departments with contacts
          </span>
        </div>
        <div className="space-y-2 mb-4">
          {departments.map((dept) => (
            <div key={dept.id} className="flex items-center gap-2 text-sm">
              {(dept.contactCount ?? 0) > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-500 shrink-0" />
              )}
              <span className={dept.contactCount ? 'text-slate-200' : 'text-slate-500'}>
                {dept.name} ({(dept.contactCount ?? 0)} contact{(dept.contactCount ?? 0) !== 1 ? 's' : ''})
              </span>
            </div>
          ))}
          {departments.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                {deptsWithContacts >= Math.min(3, departments.length) ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-500 shrink-0" />
                )}
                <span className="text-slate-400">Add 3+ contacts per department</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {allEnriched ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-500 shrink-0" />
                )}
                <span className="text-slate-400">Enrich all contacts</span>
              </div>
            </>
          )}
        </div>
        <Link href={`/dashboard/companies/${companyId}/launch-outreach`}>
          <Button size="sm" disabled={!canProceedToOutreach} className="w-full sm:w-auto">
            Continue to Launch Outreach →
          </Button>
        </Link>
      </div>

      {/* Buying groups from Account Intelligence — Find contacts per group */}
      <div id="buying-groups" className="rounded-lg border border-zinc-600 p-4 bg-zinc-800/80">
        <h3 className="font-medium text-slate-100 text-sm mb-1">Buying groups</h3>
        <p className="text-xs text-slate-400 mb-4">
          Departments from Account Intelligence. Find contacts for each group.
        </p>
        {departments.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button
                onClick={handleFindAndEnrichAll}
                disabled={findAndEnrichRunning}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {findAndEnrichRunning ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    {findAndEnrichStatus ?? 'Running…'}
                  </>
                ) : (
                  'Find & enrich all segments'
                )}
              </Button>
              {findAndEnrichResult && !findAndEnrichRunning && (
                <span className="text-sm text-slate-400">
                  {findAndEnrichResult.contactsAdded} added, {findAndEnrichResult.enriched} enriched
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => (
              <div
                key={dept.id}
                id={`dept-${dept.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-600 bg-zinc-800/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100 truncate">{dept.name}</div>
                  <div className="text-xs text-slate-400">
                    {(dept.contactCount ?? 0) > 0
                      ? `${dept.contactCount} contact${dept.contactCount === 1 ? '' : 's'}`
                      : 'No contacts yet'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/dashboard/companies/${companyId}/discover-contacts?department=${dept.id}`}>
                    <Button variant="outline" size="sm">Find contacts</Button>
                  </Link>
                  {(dept.contactCount ?? 0) > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:text-white"
                      onClick={() => {
                        setDepartmentFilter(dept.id);
                        setTimeout(() => {
                          document.getElementById('contacts-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                    >
                      View contacts
                    </Button>
                  )}
                </div>
              </div>
            ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-600 bg-zinc-800/50 px-4 py-3">
            <p className="text-sm text-slate-400">
              Complete Account Intelligence first to see buying groups (departments) here.
            </p>
            <Link href={`/dashboard/companies/${companyId}/intelligence`}>
              <Button variant="outline" size="sm">Set up Account Intelligence</Button>
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-600 p-4 bg-zinc-800/80">
        <h3 className="font-medium text-slate-100 text-sm mb-1">Add manually</h3>
        <p className="text-xs text-slate-400 mb-4">Paste from LinkedIn, import CSV, or add one at a time.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Link
            href={`/dashboard/companies/${companyId}/add-contacts#paste`}
            className="flex flex-col items-start gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 p-4 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <Linkedin className="h-6 w-6 text-slate-400" />
            <span className="font-medium text-slate-100">Paste from LinkedIn</span>
            <span className="text-xs text-slate-400">Copy profiles and paste here</span>
          </Link>
          <Link
            href={`/dashboard/companies/${companyId}/add-contacts#csv`}
            className="flex flex-col items-start gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 p-4 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="font-medium text-slate-100">Import CSV</span>
            <span className="text-xs text-slate-400">Bulk upload contact list</span>
          </Link>
          <Link
            href={`/dashboard/companies/${companyId}/add-contacts#manual`}
            className="flex flex-col items-start gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 p-4 hover:bg-zinc-700/50 transition-colors text-left"
          >
            <UserPlus className="h-6 w-6 text-slate-400" />
            <span className="font-medium text-slate-100">Add individual</span>
            <span className="text-xs text-slate-400">Enter contact details manually</span>
          </Link>
        </div>
        <CrmImportPushCard companyId={companyId} companyName={companyName} companyCrm={companyCrm} />
      </div>

      {initialContacts.length > 0 && (
        <>
      {showEnrichmentBanner && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {enriching && <Spinner className="h-5 w-5 text-amber-600 shrink-0" />}
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {enriching
                  ? `Enriching ${pendingCount} contact${pendingCount !== 1 ? 's' : ''}…`
                  : `${pendingCount} contact${pendingCount !== 1 ? 's' : ''} pending enrichment`}
              </p>
              <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                Finding email, phone, LinkedIn profile, and company details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-amber-800 dark:text-amber-200" onClick={scrollToContactsTable}>
              View pending
            </Button>
            <Button variant="ghost" size="sm" className="text-amber-800 dark:text-amber-200" onClick={() => setEnrichmentBannerDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {pendingCount > 0 && !showEnrichmentBanner && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEnrichPending} disabled={enriching}>
            {enriching ? 'Enriching…' : `Enrich pending (${pendingCount})`}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="search"
          placeholder="Search by name, email, title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-zinc-500 px-3 py-2 text-sm w-64 bg-zinc-800 text-slate-100 placeholder:text-slate-500"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded border border-zinc-500 px-3 py-2 text-sm bg-zinc-800 text-slate-100"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'responsive' | 'dormant')}
          className="rounded border border-zinc-500 px-3 py-2 text-sm bg-zinc-800 text-slate-100"
        >
          <option value="all">All statuses</option>
          <option value="responsive">Responsive</option>
          <option value="dormant">Dormant</option>
        </select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns2 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            {(['role', 'enrichment', 'status', 'crm'] as const).map((key) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={showColumn(key)}
                onCheckedChange={() => toggleColumn(key)}
              >
                {key === 'role' && 'Role'}
                {key === 'enrichment' && 'Enrichment'}
                {key === 'status' && 'Status'}
                {key === 'crm' && 'CRM'}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-sm:static max-sm:translate-x-0 max-sm:mt-4 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-zinc-600 bg-zinc-800 shadow-lg min-w-0 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleAll}
              className="rounded border-zinc-500 bg-zinc-700"
            />
            <span className="text-sm font-medium text-slate-100">
              {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={enriching} onClick={handleEnrichPending}>
              {enriching ? 'Enriching…' : 'Enrich all'}
            </Button>
            <Link href={launchOutreachUrl}>
              <Button size="sm">Draft Emails</Button>
            </Link>
            <Link href={launchOutreachUrl}>
              <Button size="sm" variant="outline">Invite to Event</Button>
            </Link>
          </div>
          <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div id="contacts-table" className="contacts-table-wrapper border border-zinc-600 rounded-lg overflow-x-auto overflow-y-hidden bg-zinc-800/50 scroll-mt-4">
        <table className="min-w-full divide-y divide-zinc-600 md:table w-full">
          <thead className="bg-zinc-800 hidden md:table-header-group">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleAll}
                  className="rounded border-zinc-500 bg-zinc-700"
                />
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Department
              </th>
              {showColumn('role') && (
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Role
                </th>
              )}
              {showColumn('enrichment') && (
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Enrichment
                </th>
              )}
              {showColumn('status') && (
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Status
                </th>
              )}
              {showColumn('crm') && (
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  CRM
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-zinc-800/30 divide-y divide-zinc-600 md:table-row-group">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-700/50 block md:table-row border-b border-zinc-600 md:border-b-0 last:border-b-0 md:last:border-b md:rounded-lg md:rounded-none mb-3 md:mb-0 p-4 md:p-0 md:py-0">
                <td className="px-4 py-2 block md:table-cell md:py-2 md:align-middle" data-label="">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="rounded border-zinc-500 bg-zinc-700"
                  />
                </td>
                <td className="px-4 py-2 block md:table-cell md:py-2 md:align-middle before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none md:before:mb-0 md:before:font-normal" data-label="Name">
                  <span className="font-medium text-slate-100">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '—'}
                  </span>
                  {c.email && (
                    <div className="text-xs text-slate-400">{c.email}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-slate-300 block md:table-cell md:py-2 md:align-middle before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none" data-label="Title">{c.title ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-slate-400 block md:table-cell md:py-2 before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none" data-label="Department">{c.departmentName ?? '—'}</td>
                {showColumn('role') && (
                  <td className="px-4 py-2 text-sm text-slate-400 block md:table-cell md:py-2 before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none" data-label="Role">{c.personaName ?? '—'}</td>
                )}
                {showColumn('enrichment') && (
                  <td className="px-4 py-2 text-sm block md:table-cell md:py-2 before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none" data-label="Enrichment">
                    <EnrichmentCell
                      status={c.enrichmentStatus}
                      onEnrichNow={handleEnrichPending}
                      enriching={enriching}
                    />
                  </td>
                )}
                {showColumn('status') && (
                  <td className="px-4 py-2 text-sm block md:table-cell md:py-2 before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none" data-label="Status">
                    {c.isResponsive && (
                      <span className="text-green-600 dark:text-green-400">Responsive</span>
                    )}
                    {c.isDormant && !c.isResponsive && (
                      <span className="text-amber-600 dark:text-amber-400">Dormant</span>
                    )}
                    {!c.isResponsive && !c.isDormant && (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                )}
                {showColumn('crm') && (
                  <td className="px-4 py-2 text-sm block md:table-cell md:py-2 before:content-[attr(data-label)] before:font-semibold before:text-slate-500 before:block before:mb-1 md:before:content-none" data-label="CRM">
                    <CrmSourceBadge source={c.crmSource} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}

      {initialContacts.length === 0 ? (
        <div className="rounded-lg border border-zinc-600 bg-zinc-800/50 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Time to assemble your crew</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
            Let the agent discover stakeholders in this account.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {departments.length > 0 ? (
              <Link href={`/dashboard/companies/${companyId}/discover-contacts?department=${departments[0].id}`}>
                <Button>Discover contacts by department</Button>
              </Link>
            ) : (
              <Link href={`/dashboard/companies/${companyId}/intelligence`}>
                <Button variant="outline">Set up Account Intelligence first</Button>
              </Link>
            )}
            <Link href={`/dashboard/companies/${companyId}/add-contacts`}>
              <Button variant="outline">Add manually</Button>
            </Link>
            <Link href={`/dashboard/companies/${companyId}/add-contacts#csv`}>
              <Button variant="outline">Import from CSV</Button>
            </Link>
          </div>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">?</span>
            Tip: Contacts are automatically enriched with email, phone, and LinkedIn when possible.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No contacts match your filters.
        </div>
      ) : null}
    </div>
  );
}
