// components/account/AccountMap.tsx
import React from "react";

type MicrosegmentType = "FUNCTIONAL" | "DIVISIONAL" | "USE_CASE";

export interface Microsegment {
  id: string;
  name: string;
  type: MicrosegmentType;
  description?: string;
}

export type RoleTag = "DECISION_MAKER" | "CHAMPION" | "INFLUENCER" | "OTHER";

export type EngagementType = "PAGE_VIEW" | "REPLY" | "MEETING" | "NONE";

export interface LastEngagement {
  type: EngagementType;
  at: string | null; // ISO string
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email?: string | null;
  linkedinUrl?: string | null;
  microsegmentId?: string | null;
  lastEngagement: LastEngagement;
  engagementScore: number; // derived in data layer or here
  roleTag: RoleTag;        // derived in data layer or here
}

interface AccountMapProps {
  accountName: string;
  domain?: string;
  microsegments: Microsegment[];
  contacts: Contact[];
  onOpenContactActivity: (contactId: string) => void;
  onOpenSegmentPage: (microsegmentId: string) => void;
  onOpenContactDiscovery: (microsegmentId: string) => void;
}

const roleTagLabel: Record<RoleTag, string> = {
  DECISION_MAKER: "Decision maker",
  CHAMPION: "Champion",
  INFLUENCER: "Influencer",
  OTHER: "Contact",
};

const roleTagClass: Record<RoleTag, string> = {
  DECISION_MAKER: "bg-purple-50 text-purple-700",
  CHAMPION: "bg-emerald-50 text-emerald-700",
  INFLUENCER: "bg-sky-50 text-sky-700",
  OTHER: "bg-slate-50 text-slate-600",
};

function formatLastEngagement(last: LastEngagement): string {
  if (!last || last.type === "NONE" || !last.at) return "No recent activity";
  const date = new Date(last.at);
  const dateStr = date.toLocaleDateString();
  if (last.type === "PAGE_VIEW") return `Viewed page · ${dateStr}`;
  if (last.type === "REPLY") return `Replied · ${dateStr}`;
  if (last.type === "MEETING") return `Meeting · ${dateStr}`;
  return dateStr;
}

function engagementBadge(score: number): { label: string; className: string } {
  if (score >= 7) return { label: "High engagement", className: "bg-green-50 text-green-700" };
  if (score >= 3) return { label: "Medium engagement", className: "bg-amber-50 text-amber-700" };
  if (score > 0) return { label: "Low engagement", className: "bg-slate-50 text-slate-600" };
  return { label: "No engagement yet", className: "bg-slate-50 text-slate-500" };
}

export const AccountMap: React.FC<AccountMapProps> = ({
  accountName,
  domain,
  microsegments,
  contacts,
  onOpenContactActivity,
  onOpenSegmentPage,
  onOpenContactDiscovery,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Account Map</h1>
        <p className="mt-1 text-sm text-slate-600">
          Buying groups, key people, and engagement for {accountName}
          {domain ? ` (${domain})` : ""}.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm text-slate-700">
          <span className="font-medium">{microsegments.length}</span> buying groups ·{" "}
          <span className="font-medium">{contacts.length}</span> contacts
        </div>
      </div>

      {/* Columns by microsegment */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {microsegments.map((segment) => {
          const segmentContacts = contacts.filter(
            (c) => c.microsegmentId === segment.id
          );

          return (
            <div
              key={segment.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              {/* Column header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {segment.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {segment.type}
                    {segment.description ? ` · ${segment.description}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSegmentPage(segment.id)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open page
                </button>
              </div>

              {/* Contacts list */}
              {segmentContacts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {segmentContacts.map((contact) => {
                    const engagement = engagementBadge(contact.engagementScore);
                    return (
                      <div
                        key={contact.id}
                        className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 hover:bg-slate-100"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">
                                {contact.name}
                              </p>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${roleTagClass[contact.roleTag]}`}
                              >
                                {roleTagLabel[contact.roleTag]}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-600">
                              {contact.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${engagement.className}`}
                          >
                            {engagement.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatLastEngagement(contact.lastEngagement)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Open LinkedIn
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenContactActivity(contact.id)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            View activity
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">No contacts in this buying group yet.</p>
                  <button
                    type="button"
                    onClick={() => onOpenContactDiscovery(segment.id)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Find contacts
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
