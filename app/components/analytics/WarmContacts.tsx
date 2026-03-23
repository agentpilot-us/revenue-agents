'use client';

import Link from 'next/link';
import { dash } from '@/app/dashboard/dashboard-classes';

interface WarmContact {
  id: string;
  name: string;
  email: string;
  accountId: string;
  accountName: string;
}

interface WarmContactsData {
  total: number;
  contacts: WarmContact[];
}

interface Props {
  data: WarmContactsData;
}

export function WarmContacts({ data }: Props) {
  return (
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Warm Contacts</h2>
        <p className="text-sm text-muted-foreground">
          Contacts who have engaged with content (landing page visits, email opens/clicks)
        </p>
        <p className="text-sm text-primary mt-1">
          Total: <span className="font-semibold">{data.total}</span> warm contact
          {data.total !== 1 ? 's' : ''}
        </p>
      </div>

      {data.contacts.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/dashboard/companies/${contact.accountId}`}
              className={`flex items-center justify-between p-3 ${dash.cardTight} hover:bg-muted/50 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{contact.name}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">{contact.email}</div>
                <div className="text-xs text-muted-foreground mt-1">{contact.accountName}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No warm contacts found</p>
      )}
    </div>
  );
}
