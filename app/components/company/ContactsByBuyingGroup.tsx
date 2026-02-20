'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WarmIndicator } from './WarmIndicator';
import { FindContactsModal } from './FindContactsModal';

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

export function ContactsByBuyingGroup({ companyId, companyName }: Props) {
  const [groups, setGroups] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFindContacts, setShowFindContacts] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContacts() {
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
    }
    fetchContacts();
  }, [companyId]);

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
                  <ContactRow key={contact.id} contact={contact} />
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
            {contact.enrichmentStatus && (
              <Badge
                variant={
                  contact.enrichmentStatus === 'complete'
                    ? 'default'
                    : contact.enrichmentStatus === 'pending'
                      ? 'secondary'
                      : 'outline'
                }
                className="text-xs"
              >
                {contact.enrichmentStatus === 'complete'
                  ? 'Enriched'
                  : contact.enrichmentStatus === 'pending'
                    ? 'Pending'
                    : 'Not Found'}
              </Badge>
            )}
          </div>
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
