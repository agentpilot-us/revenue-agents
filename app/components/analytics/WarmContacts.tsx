'use client';

import Link from 'next/link';

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
    <Card className="p-6 bg-zinc-800/50 border-slate-700">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Warm Contacts</h2>
        <p className="text-sm text-slate-400">
          Contacts who have engaged with content (landing page visits, email opens/clicks)
        </p>
        <p className="text-sm text-amber-400 mt-1">
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
              className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-slate-700 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{contact.name}</div>
                <div className="text-xs text-slate-400 truncate mt-1">{contact.email}</div>
                <div className="text-xs text-slate-500 mt-1">{contact.accountName}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No warm contacts found</p>
      )}
    </div>
  );
}
