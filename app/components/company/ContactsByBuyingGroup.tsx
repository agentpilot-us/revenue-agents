'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WarmIndicator } from './WarmIndicator';
import { FileText, Trash2, Upload, Users, ArrowRight } from 'lucide-react';
import { FindContactsModal } from './FindContactsModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type EventAttendanceInfo = {
  eventName: string;
  rsvpStatus: string | null;
};

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
  eventAttendances?: EventAttendanceInfo[];
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
  /** URL context: pre-select division (Spec 1) */
  initialDepartmentId?: string;
  /** Auto-open Find Contacts modal for this division */
  autoFind?: boolean;
  /** Auto-open Add Contact modal with name pre-filled */
  autoAdd?: boolean;
  contactName?: string;
  /** Open Prep Me panel with params (talking points for contact) */
  onPrepMeOpen?: (params: {
    companyId: string;
    companyName: string;
    divisionName?: string;
    contactId?: string;
    contactName?: string;
    contactTitle?: string;
    signalTitle?: string;
    signalSummary?: string;
  }) => void;
};

type Suggestion = {
  contactId: string;
  contactName: string;
  title: string | null;
  suggestedDepartmentId: string;
  suggestedDepartmentName: string;
};
type DeptOption = { id: string; name: string };

export function ContactsByBuyingGroup({
  companyId,
  companyName,
  initialDepartmentId,
  autoFind,
  autoAdd,
  contactName,
  onPrepMeOpen,
}: Props) {
  const [groups, setGroups] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFindContacts, setShowFindContacts] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const autoFindFired = useRef(false);
  const autoAddFired = useRef(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DeptOption[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedDeptByContact, setSelectedDeptByContact] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!autoFind || !initialDepartmentId || loading || autoFindFired.current) return;
    const hasDept = groups.some((g) => g.department?.id === initialDepartmentId);
    if (hasDept) {
      autoFindFired.current = true;
      setShowFindContacts(initialDepartmentId);
    }
  }, [autoFind, initialDepartmentId, loading, groups]);

  useEffect(() => {
    if (autoAdd && !autoAddFired.current) {
      autoAddFired.current = true;
      setShowAddContact(true);
    }
  }, [autoAdd]);

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

  async function deleteContact(contactId: string) {
    if (!confirm('Remove this contact? This cannot be undone.')) return;
    setDeletingId(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchGroups();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading contacts...</div>;
  }

  const totalContacts = groups.reduce((sum, g) => sum + g.contacts.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-card-foreground">
            Contacts by Buying Group
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalContacts} total contact{totalContacts !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/companies/${companyId}/contacts`}
        className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-card-foreground">Manage & Import Contacts</p>
            <p className="text-sm text-muted-foreground">
              Import from LinkedIn, CSV, or CRM. Bulk enrich and assign contacts.
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-card-foreground transition-colors shrink-0" />
      </Link>

      {groups.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg border-border">
          <p className="text-muted-foreground mb-4">No contacts yet</p>
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
            className="bg-card rounded-lg shadow p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  {group.department.name}
                </h3>
                {group.department.targetRoles && (
                  <div className="text-xs text-muted-foreground mt-1">
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
              <div className="mb-4 p-4 rounded-lg border border-border bg-accent/50 space-y-3">
                <p className="text-sm font-medium text-card-foreground">Suggested assignments</p>
                {suggestions.map((s) => (
                  <div
                    key={s.contactId}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span className="font-medium text-card-foreground">{s.contactName}</span>
                    {s.title && <span className="text-muted-foreground">({s.title})</span>}
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
              <div className="text-sm text-muted-foreground py-4">
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
                    <ContactRow
                      contact={contact}
                      onPrepMe={
                        onPrepMeOpen && group.department.name
                          ? () => {
                              const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
                              onPrepMeOpen({
                                companyId,
                                companyName,
                                divisionName: group.department.name,
                                contactId: contact.id,
                                contactName: name,
                                contactTitle: contact.title ?? undefined,
                              });
                            }
                          : undefined
                      }
                      onDelete={deletingId ? undefined : deleteContact}
                    />
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

      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {contactName ? `Add "${contactName}" to a buying group.` : 'Add a new contact to a buying group.'}
          </p>
          <Link
            href={
              initialDepartmentId
                ? `/dashboard/companies/${companyId}/add-contacts?departmentId=${initialDepartmentId}${contactName ? `&name=${encodeURIComponent(contactName)}` : ''}`
                : `/dashboard/companies/${companyId}/add-contacts`
            }
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 px-4 py-2"
          >
            Open Add Contact
          </Link>
        </DialogContent>
      </Dialog>
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

function ContactRow({ contact, onPrepMe, onDelete }: { contact: Contact; onPrepMe?: () => void; onDelete?: (contactId: string) => void }) {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || 'Unknown';

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted gap-2">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <WarmIndicator isWarm={contact.isWarm} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-card-foreground">{fullName}</span>
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
                      status === 'Enriched' && 'bg-muted-foreground',
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
          <TouchpointPills eventAttendances={contact.eventAttendances} isWarm={contact.isWarm} />
          {contact.whyRelevant && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {contact.whyRelevant}
            </p>
          )}
          <div className="text-sm text-muted-foreground space-x-3 mt-1">
            {contact.title && <span>{contact.title}</span>}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-primary hover:underline"
              >
                {contact.email}
              </a>
            )}
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onPrepMe && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={onPrepMe}
            title="Prep Me — talking points for this contact"
          >
            <FileText className="h-4 w-4" />
            <span className="sr-only">Prep</span>
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-muted-foreground hover:text-red-500"
            onClick={() => onDelete(contact.id)}
            title="Delete contact"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}

const RSVP_STYLES: Record<string, { bg: string; text: string }> = {
  attended: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  registered: { bg: 'bg-green-500/10', text: 'text-green-400' },
  invited: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

function shortenEventName(name: string): string {
  if (name.includes('GTC')) return 'GTC';
  if (name.includes('CES')) return 'CES';
  if (name.includes('Digital Twin')) return 'DT Summit';
  const words = name.split(/\s+/);
  return words.length > 3 ? words.slice(0, 3).join(' ') : name;
}

function TouchpointPills({
  eventAttendances,
  isWarm,
}: {
  eventAttendances?: EventAttendanceInfo[];
  isWarm: boolean;
}) {
  const hasEvents = eventAttendances && eventAttendances.length > 0;
  if (!hasEvents && !isWarm) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {eventAttendances?.map((ea) => {
        const status = (ea.rsvpStatus ?? 'invited').toLowerCase();
        const style = RSVP_STYLES[status] ?? RSVP_STYLES.invited;
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return (
          <span
            key={ea.eventName}
            className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', style.bg, style.text)}
          >
            {shortenEventName(ea.eventName)}: {label}
          </span>
        );
      })}
      {isWarm && (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400">
          Visited Page
        </span>
      )}
    </div>
  );
}
