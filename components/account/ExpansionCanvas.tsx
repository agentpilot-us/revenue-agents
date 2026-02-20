// components/account/ExpansionCanvas.tsx
import React from "react";

type MicrosegmentType = "FUNCTIONAL" | "DIVISIONAL" | "USE_CASE";

export interface ExpansionMicrosegment {
  id: string;
  name: string;
  type: MicrosegmentType;
  hasPage: boolean;
  pageUrl?: string | null;
  contactsCount: number;
  pageViews: number;
  lastActivityAt: string | null; // ISO date
}

type ExpansionStatus = "ENGAGED" | "LIVE_LOW_ENGAGEMENT" | "NO_PAGE";

interface ExpansionCanvasProps {
  accountName: string;
  microsegments: ExpansionMicrosegment[];
  onCreateSegmentPage: (segmentId: string) => void;
  onOpenSegmentPage: (segmentId: string, pageUrl?: string | null) => void;
  onOpenEngagementPlay: (segmentId: string) => void;
  onOpenChampionExpansion: (segmentId: string) => void;
}

function deriveStatus(segment: ExpansionMicrosegment): ExpansionStatus {
  if (!segment.hasPage) return "NO_PAGE";
  if (segment.pageViews === 0) return "LIVE_LOW_ENGAGEMENT";
  return "ENGAGED";
}

function statusLabel(status: ExpansionStatus): string {
  if (status === "ENGAGED") return "Engaged";
  if (status === "LIVE_LOW_ENGAGEMENT") return "Live · low engagement";
  return "No page";
}

function statusClass(status: ExpansionStatus): string {
  if (status === "ENGAGED") return "bg-green-50 text-green-700";
  if (status === "LIVE_LOW_ENGAGEMENT") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-600";
}

function formatLastActivity(lastActivityAt: string | null): string {
  if (!lastActivityAt) return "No recent activity";
  const d = new Date(lastActivityAt);
  return `Last activity · ${d.toLocaleDateString()}`;
}

const MicrosegmentTile: React.FC<{
  segment: ExpansionMicrosegment;
  showChampionPlay?: boolean;
  onCreateSegmentPage: () => void;
  onOpenSegmentPage: () => void;
  onOpenEngagementPlay: () => void;
  onOpenChampionExpansion: () => void;
}> = ({
  segment,
  showChampionPlay,
  onCreateSegmentPage,
  onOpenSegmentPage,
  onOpenEngagementPlay,
  onOpenChampionExpansion,
}) => {
  const status = deriveStatus(segment);
  const primaryLabel =
    !segment.hasPage ? "Create segment page" : status === "ENGAGED" ? "View segment page" : "Drive engagement";

  const primaryAction = () => {
    if (!segment.hasPage) return onCreateSegmentPage();
    if (status === "ENGAGED") return onOpenSegmentPage();
    return onOpenEngagementPlay();
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{segment.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{segment.type}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(
            status
          )}`}
        >
          {statusLabel(status)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span>{segment.contactsCount} contacts</span>
        <span>{segment.pageViews} page views</span>
        <span>{formatLastActivity(segment.lastActivityAt)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={primaryAction}
          className="rounded-md border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
        >
          {primaryLabel}
        </button>
        {showChampionPlay && (
          <button
            type="button"
            onClick={onOpenChampionExpansion}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100"
          >
            Champion-led expansion
          </button>
        )}
      </div>
    </div>
  );
};

export const ExpansionCanvas: React.FC<ExpansionCanvasProps> = ({
  accountName,
  microsegments,
  onCreateSegmentPage,
  onOpenSegmentPage,
  onOpenEngagementPlay,
  onOpenChampionExpansion,
}) => {
  const totalSegments = microsegments.length;
  const liveSegments = microsegments.filter((m) => m.hasPage).length;
  const engagedSegments = microsegments.filter(
    (m) => deriveStatus(m) === "ENGAGED"
  ).length;

  const liveAndEngaged = microsegments.filter(
    (m) => m.hasPage && m.pageViews > 0
  );
  const highPotential = microsegments.filter(
    (m) => !m.hasPage || (m.hasPage && m.pageViews === 0)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Expansion Canvas</h1>
        <p className="mt-1 text-sm text-slate-600">
          See where you&apos;ve landed and where to go next in {accountName}.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm text-slate-700">
          <span className="font-medium">{totalSegments}</span> microsegments ·{" "}
          <span className="font-medium">{liveSegments}</span> with pages ·{" "}
          <span className="font-medium">{engagedSegments}</span> engaged
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Identified */}
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Identified microsegments
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              All potential buying groups at this account.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {microsegments.map((segment) => (
              <MicrosegmentTile
                key={segment.id}
                segment={segment}
                showChampionPlay={false}
                onCreateSegmentPage={() => onCreateSegmentPage(segment.id)}
                onOpenSegmentPage={() => onOpenSegmentPage(segment.id, segment.pageUrl)}
                onOpenEngagementPlay={() => onOpenEngagementPlay(segment.id)}
                onOpenChampionExpansion={() => onOpenChampionExpansion(segment.id)}
              />
            ))}
          </div>
        </div>

        {/* Live & engaged */}
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Live & engaged
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Segments with live pages and measurable engagement.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {liveAndEngaged.length === 0 && (
              <p className="text-xs text-slate-500">
                No segments are engaged yet. Launch pages and start driving traffic.
              </p>
            )}
            {liveAndEngaged.map((segment) => (
              <MicrosegmentTile
                key={segment.id}
                segment={segment}
                showChampionPlay
                onCreateSegmentPage={() => onCreateSegmentPage(segment.id)}
                onOpenSegmentPage={() => onOpenSegmentPage(segment.id, segment.pageUrl)}
                onOpenEngagementPlay={() => onOpenEngagementPlay(segment.id)}
                onOpenChampionExpansion={() => onOpenChampionExpansion(segment.id)}
              />
            ))}
          </div>
        </div>

        {/* High-potential next segments */}
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              High-potential next segments
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Good-fit segments with no page or low engagement.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {highPotential.length === 0 && (
              <p className="text-xs text-slate-500">
                You&apos;ve built and engaged all identified segments. Nice work.
              </p>
            )}
            {highPotential.map((segment) => (
              <MicrosegmentTile
                key={segment.id}
                segment={segment}
                showChampionPlay={false}
                onCreateSegmentPage={() => onCreateSegmentPage(segment.id)}
                onOpenSegmentPage={() => onOpenSegmentPage(segment.id, segment.pageUrl)}
                onOpenEngagementPlay={() => onOpenEngagementPlay(segment.id)}
                onOpenChampionExpansion={() => onOpenChampionExpansion(segment.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
