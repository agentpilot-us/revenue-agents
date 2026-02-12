'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  findContactsForDepartment,
  addContactsToDepartment,
  type FoundContact,
  type ContactTypeOption,
  type SearchScopeOption,
} from '@/app/actions/find-contacts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CONTACT_TYPES: { id: ContactTypeOption; label: string; sub: string }[] = [
  { id: 'economic', label: 'Economic Buyers (VPs, C-suite)', sub: 'Budget owners, final decision makers' },
  { id: 'technical', label: 'Technical Buyers (Directors, Managers)', sub: 'Evaluate solutions, manage implementation' },
  { id: 'program', label: 'Program Managers (Quality, Ops)', sub: 'Run QC programs, deploy technology' },
  { id: 'influencer', label: 'Influencers (Engineers, Specialists)', sub: 'End users, provide input' },
];

const SCOPE_OPTIONS: { id: SearchScopeOption; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn (via PhantomBuster)' },
  { id: 'clay', label: 'Clay enrichment (emails, phones)' },
  { id: 'zoominfo', label: 'ZoomInfo (if available)' },
];

type Step = 'config' | 'searching' | 'results' | 'added';

type AddedContact = {
  name: string;
  title: string;
  isNew: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  existingContactNames?: string[];
  onAdded?: () => void;
};

export function FindContactsModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  departmentId,
  departmentName,
  existingContactNames = [],
  onAdded,
}: Props) {
  const [step, setStep] = useState<Step>('config');
  const [contactTypes, setContactTypes] = useState<ContactTypeOption[]>(['technical', 'program']);
  const [scope, setScope] = useState<SearchScopeOption[]>(['linkedin', 'clay']);
  const [steps, setSteps] = useState<Array<{ step: string; detail: string }>>([]);
  const [results, setResults] = useState<FoundContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addedSummary, setAddedSummary] = useState<{ added: number; contacts: AddedContact[]; byPersona: Array<{ role: string; names: string[] }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleContactType = (id: ContactTypeOption) => {
    setContactTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleScope = (id: SearchScopeOption) => {
    setScope((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    setError(null);
    setStep('searching');
    setSteps([]);
    const scopeObj = { linkedin: scope.includes('linkedin'), clay: scope.includes('clay'), zoominfo: scope.includes('zoominfo') };
    const res = await findContactsForDepartment(companyId, departmentId, contactTypes, scopeObj);
    if (!res.ok) {
      setError(res.error);
      setStep('config');
      return;
    }
    setSteps(res.steps);
    setResults(res.results);
    setSelectedIds(new Set(res.results.map((r) => r.id)));
    setStep('results');
  };

  const handleAddContacts = async () => {
    const toAdd = results.filter((r) => selectedIds.has(r.id));
    if (toAdd.length === 0) return;
    setError(null);
    const res = await addContactsToDepartment(
      companyId,
      departmentId,
      toAdd.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        title: r.title,
        email: r.email,
        phone: r.phone,
        linkedinUrl: r.linkedinUrl,
        personaId: r.personaId,
      }))
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const contactsAdded: AddedContact[] = toAdd.map((r) => ({
      name: [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || 'Unknown',
      title: r.title,
      isNew: true,
    }));
    const byPersona = new Map<string, string[]>();
    toAdd.forEach((r) => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
      const role = r.personaName ?? 'Contact';
      if (!byPersona.has(role)) byPersona.set(role, []);
      byPersona.get(role)!.push(name);
    });
    setAddedSummary({
      added: res.added,
      contacts: contactsAdded,
      byPersona: Array.from(byPersona.entries()).map(([role, names]) => ({ role, names })),
    });
    setStep('added');
    onAdded?.();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(results.map((r) => r.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('config');
      setError(null);
      setResults([]);
      setAddedSummary(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'config' && `Find Contacts: ${departmentName}`}
            {step === 'searching' && 'Searching...'}
            {step === 'results' && `Found ${results.length} Contacts`}
            {step === 'added' && 'Contacts Added!'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-800 text-sm p-3">
            {error}
          </div>
        )}

        {step === 'config' && (
          <>
            <p className="text-sm text-gray-600">
              I'll search for contacts in {companyName}'s {departmentName} department.
            </p>
            <p className="text-sm font-medium text-gray-700 mt-3">What type of contacts are you looking for?</p>
            <div className="space-y-2 mt-2 border rounded-lg p-4 bg-gray-50">
              {CONTACT_TYPES.map((t) => (
                <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactTypes.includes(t.id)}
                    onChange={() => toggleContactType(t.id)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium">{t.label}</span>
                    <p className="text-xs text-gray-500">{t.sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mt-3">Search scope:</p>
            <div className="flex flex-wrap gap-3 mt-2">
              {SCOPE_OPTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scope.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleSearch} disabled={contactTypes.length === 0 || !scope.includes('linkedin')}>
                Search
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'searching' && (
          <>
            <p className="text-sm text-gray-600">Searching LinkedIn for contacts...</p>
            <div className="mt-4 space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span> {s.detail}
                </div>
              ))}
              {steps.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">This may take ~1–2 minutes.</p>
              )}
            </div>
          </>
        )}

        {step === 'results' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Found {results.length} contacts in {departmentName}. Select contacts to add.
            </p>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleSelect(r.id)}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {[r.firstName, r.lastName].filter(Boolean).join(' ').trim() || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">{r.title}</div>
                      {r.linkedinUrl && (
                        <a
                          href={r.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          LinkedIn
                        </a>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {r.email ? (
                          <>Email: {r.email} {r.emailVerified ? ' (verified)' : ''}</>
                        ) : (
                          'Email: Not found'
                        )}
                      </div>
                      {r.phone && <div className="text-xs text-gray-500">Phone: {r.phone}</div>}
                      {r.personaName && (
                        <div className="mt-2 text-xs">
                          Matched Persona: {r.personaName}
                          {r.confidence != null && ` • Confidence: ${r.confidence}%`}
                        </div>
                      )}
                      {r.whyRelevant && (
                        <div className="mt-1 text-xs text-gray-600">Why relevant: {r.whyRelevant}</div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContacts} disabled={selectedIds.size === 0}>
                Add {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'added' && addedSummary && (
          <>
            <p className="text-sm text-gray-600">
              Added {addedSummary.added} contact{addedSummary.added !== 1 ? 's' : ''} to {departmentName}.
            </p>
            <p className="text-sm font-medium text-gray-700 mt-3">
              Your {departmentName} dept now has {existingContactNames.length + addedSummary.added} contacts:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
              {existingContactNames.slice(0, 3).map((n) => (
                <li key={n}>{n} – Existing</li>
              ))}
              {addedSummary.contacts.slice(0, 5).map((c) => (
                <li key={c.name}>{c.name} ({c.title}) – NEW</li>
              ))}
              {(existingContactNames.length + addedSummary.contacts.length) > 5 && (
                <li>... and more</li>
              )}
            </ul>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">Multi-Contact Strategy</h3>
              <p className="text-sm text-gray-600 mb-3">
                You now have coverage across the buying committee:
              </p>
              <ul className="text-sm space-y-1">
                {addedSummary.byPersona.map(({ role, names }) => (
                  <li key={role}>
                    <span className="font-medium">{role}:</span> {names.join(', ')}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                Suggested sequence: Reach out to Economic Buyer first, then Technical Buyer, then Program Managers.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Done
              </Button>
              <Button asChild>
                <Link href={`/chat?play=expansion&accountId=${companyId}`}>
                  Launch Multi-Contact Play
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/chat?play=expansion&accountId=${companyId}`}>
                  Draft Emails for All
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
