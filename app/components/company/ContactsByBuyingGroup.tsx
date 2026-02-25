'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WarmIndicator } from './WarmIndicator';
import { FindContactsModal } from './FindContactsModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  personaName: string | null;
  enrichmentStatus: string | null;
  isWarm: boolean;
  buyingRole: string | null;
  whyRelevant: string | null;
  engagementStatus?: 'Not enriched' | 'Enriched' | 'Contacted' | 'Engaged';
};

type DepartmentGroup = {
  department: {
    id: string | null;
    name: string;
    type: string | null;
    targetRoles: {
      economicBuyer?: string[];
      technicalEvaluator?: string[];
      champion?: string[];
      influencer?: string[];
    } | null;
  };
  contacts: Contact[];
};

type Props = {
  companyId: string;
  companyName: string;
};

type Suggestion = {
  contactId: string;
  contactName: string;
  title: string | null;
  suggestedDepartmentId: string;
  suggestedDepartmentName: string;
};
type DeptOption = { id: string; name: string };

export function ContactsByBuyingGroup({ companyId, companyName }: Props) {
  const [groups, setGroups] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFindContacts, setShowFindContacts] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DeptOption[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedDeptByContact, setSelectedDeptByContact] = useState<Record<string, string>>({});

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/by-department`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  async function handleSuggestGroups() {
    setSuggestLoading(true);
    setSuggestions([]);
    setDepartmentOptions([]);
    setSelectedDeptByContact({});
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/suggest-assignments`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to load suggestions');
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setDepartmentOptions(data.departmentOptions || []);
      if ((data.suggestions || []).length > 0) {
        const initial: Record<string, string> = {};
        for (const s of data.suggestions) {
          initial[s.contactId] = s.suggestedDepartmentId;
        }
        setSelectedDeptByContact(initial);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function assignContact(contactId: string, departmentId: string) {
    setAssigningId(contactId);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyDepartmentId: departmentId }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      setSuggestions((prev) => prev.filter((s) => s.contactId !== contactId));
      await fetchGroups();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigningId(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading contacts...</div>;
  }

  const totalContacts = groups.reduce((sum, g) => sum + g.contacts.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Contacts by Buying Group
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {totalContacts} total contact{totalContacts !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/companies/${companyId}/contacts`}>
              Manage Contacts
            </Link>
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg border-gray-200">
          <p className="text-gray-500 mb-4">No contacts yet</p>
          <Button asChild>
            <Link href={`/dashboard/companies/${companyId}/contacts`}>
              Add Contacts
            </Link>
          </Button>
        </div>
      ) : (
        groups.map((group) => (
          <div
            key={group.department.id || 'unassigned'}
            className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-200 dark:border-zinc-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {group.department.name}
                </h3>
                {group.department.targetRoles && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(() => {
                      const roles = group.department.targetRoles;
                      const roleTypes: string[] = [];
                      if (roles?.economicBuyer?.length) roleTypes.push('Economic Buyers');
                      if (roles?.technicalEvaluator?.length) roleTypes.push('Technical Evaluators');
                      if (roles?.champion?.length) roleTypes.push('Champions');
                      if (roles?.influencer?.length) roleTypes.push('Influencers');
                      return roleTypes.join(', ') || 'No roles defined';
                    })()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!group.department.id && group.contacts.length > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSuggestGroups}
                    disabled={suggestLoading}
                  >
                    {suggestLoading ? 'Loading…' : 'Suggest groups'}
                  </Button>
                )}
                {group.department.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFindContacts(group.department.id!)}
                  >
                    Find Contacts
                  </Button>
                )}
              </div>
            </div>

            {!group.department.id && suggestions.length > 0 && (
              <div className="mb-4 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-zinc-800/50 space-y-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Suggested assignments</p>
                {suggestions.map((s) => (
                  <div
                    key={s.contactId}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">{s.contactName}</span>
                    {s.title && <span className="text-gray-500 dark:text-gray-400">({s.title})</span>}
                    <Select
                      value={selectedDeptByContact[s.contactId] ?? s.suggestedDepartmentId}
                      onValueChange={(val) =>
                        setSelectedDeptByContact((prev) => ({ ...prev, [s.contactId]: val }))
                      }
                    >
                      <SelectTrigger className="w-[200px] h-8">
                        <SelectValue placeholder="Buying group" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() =>
                        assignContact(
                          s.contactId,
                          selectedDeptByContact[s.contactId] ?? s.suggestedDepartmentId
                        )
                      }
                      disabled={assigningId === s.contactId}
                    >
                      {assigningId === s.contactId ? 'Assigning…' : 'Confirm'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {group.contacts.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No contacts in this buying group yet.
                {group.department.id && (
                  <Button
                    size="sm"
                    variant="link"
                    className="ml-2"
                    onClick={() => setShowFindContacts(group.department.id!)}
                  >
                    Find contacts
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {group.contacts.map((contact) => (
                  <div key={contact.id} className="flex flex-col gap-2">
                    <ContactRow contact={contact} />
                    {!group.department.id && (
                      <AssignToGroupRow
                        companyId={companyId}
                        contactId={contact.id}
                        departments={groups
                          .filter((g) => g.department.id != null)
                          .map((g) => ({ id: g.department.id!, name: g.department.name }))}
                        onAssigned={fetchGroups}
                        assigningId={assigningId}
                        setAssigningId={setAssigningId}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {showFindContacts === group.department.id && group.department.id && (
              <FindContactsModal
                open={true}
                onOpenChange={(open) => {
                  if (!open) setShowFindContacts(null);
                }}
                companyId={companyId}
                companyName={companyName}
                departmentId={group.department.id}
                departmentName={group.department.name}
                onAdded={() => {
                  // Refresh contacts
                  window.location.reload();
                }}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function AssignToGroupRow({
  companyId,
  contactId,
  departments,
  onAssigned,
  assigningId,
  setAssigningId,
}: {
  companyId: string;
  contactId: string;
  departments: { id: string; name: string }[];
  onAssigned: () => void;
  assigningId: string | null;
  setAssigningId: (id: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(departments[0]?.id ?? '');

  async function handleAssign() {
    if (!selectedId) return;
    setAssigningId(contactId);
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyDepartmentId: selectedId }),
      });
      if (res.ok) await onAssigned();
    } finally {
      setAssigningId(null);
    }
  }

  if (departments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pl-8 text-sm">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-[220px] h-8">
          <SelectValue placeholder="Assign to buying group" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={handleAssign} disabled={assigningId === contactId}>
        {assigningId === contactId ? 'Assigning…' : 'Assign'}
      </Button>
    </div>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || 'Unknown';

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <WarmIndicator isWarm={contact.isWarm} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">{fullName}</span>
            {contact.buyingRole && (
              <Badge variant="outline" className="text-xs">
                {contact.buyingRole}
              </Badge>
            )}
            {(() => {
              const status = contact.engagementStatus ?? (contact.enrichmentStatus === 'complete' ? 'Enriched' : 'Not enriched');
              return (
                <>
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      status === 'Engaged' && 'bg-green-500',
                      status === 'Contacted' && 'bg-blue-500',
                      status === 'Enriched' && 'bg-gray-400 dark:bg-gray-500',
                      status === 'Not enriched' && 'bg-amber-400'
                    )}
                    title={status}
                    aria-hidden
                  />
                  <Badge
                    variant={status === 'Engaged' ? 'default' : status === 'Contacted' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {status}
                  </Badge>
                </>
              );
            })()}
          </div>
          {contact.whyRelevant && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
              {contact.whyRelevant}
            </p>
          )}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-x-3 mt-1">
            {contact.title && <span>{contact.title}</span>}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {contact.email}
              </a>
            )}
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
