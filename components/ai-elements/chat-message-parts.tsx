'use client';

import { MessageResponse } from '@/components/ai-elements/message';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ToolPart = {
  type: string;
  state: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  approval?: { id: string; approved?: boolean; reason?: string };
};

type MessagePart = { type: string; text?: string } | ToolPart;

type ChatMessagePartsProps = {
  parts: MessagePart[] | undefined;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
  className?: string;
};

function isToolPart(p: MessagePart): p is ToolPart {
  return p.type.startsWith('tool-') && 'state' in p;
}

function getToolPartState(p: ToolPart): string {
  return (p as { state?: string }).state ?? '';
}

export function ChatMessageParts({
  parts,
  addToolApprovalResponse,
  className,
}: ChatMessagePartsProps) {
  const list = Array.isArray(parts) ? parts : [];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {list.map((part, index) => {
        if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
          return (
            <MessageResponse key={`text-${index}`}>
              {part.text}
            </MessageResponse>
          );
        }

        if (!isToolPart(part)) return null;

        const toolType = part.type;
        const state = getToolPartState(part);
        const isEmail = toolType === 'tool-send_email';
        const isCalendar = toolType === 'tool-create_calendar_event';

        if (state === 'output-error' && part.errorText) {
          return (
            <div
              key={`${part.toolCallId ?? index}-err`}
              className="rounded border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {isEmail || isCalendar ? 'Error: ' : `${toolType.replace('tool-', '')} failed: `}
              {part.errorText}
            </div>
          );
        }

        if (!isEmail && !isCalendar) {
          return (
            <div key={`${part.toolCallId ?? index}-${index}`} className="text-xs text-muted-foreground">
              Tool: {toolType.replace('tool-', '')}
            </div>
          );
        }

        if (state === 'approval-requested' && part.approval?.id && addToolApprovalResponse) {
          const input = (part.input ?? {}) as Record<string, unknown>;
          return (
            <div
              key={part.approval.id}
              className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-sm"
            >
              {isEmail && (
                <>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Email draft</p>
                  <p className="mt-1 text-amber-800 dark:text-amber-200">
                    <span className="font-medium">To:</span> {(input.to as string) ?? '—'}
                  </p>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-200">
                    <span className="font-medium">Subject:</span> {(input.subject as string) ?? '—'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-amber-700 dark:text-amber-300">
                    {(input.body as string)?.slice(0, 120)}
                    {((input.body as string)?.length ?? 0) > 120 ? '…' : ''}
                  </p>
                </>
              )}
              {isCalendar && (
                <>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Calendar invite</p>
                  <p className="mt-1 text-amber-800 dark:text-amber-200">
                    <span className="font-medium">Title:</span> {(input.title as string) ?? '—'}
                  </p>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-200">
                    <span className="font-medium">Attendee:</span> {(input.attendeeEmail as string) ?? '—'}
                  </p>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-200">
                    <span className="font-medium">Time:</span> {(input.start as string) ?? '—'} – {(input.end as string) ?? '—'}
                  </p>
                </>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => addToolApprovalResponse({ id: part.approval!.id, approved: true })}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToolApprovalResponse({ id: part.approval!.id, approved: false })}
                >
                  Deny
                </Button>
              </div>
            </div>
          );
        }

        if (state === 'input-streaming' || state === 'input-available') {
          return (
            <div key={`${part.toolCallId ?? index}-pending`} className="text-xs text-muted-foreground italic">
              {isEmail ? 'Preparing email…' : 'Preparing calendar invite…'}
            </div>
          );
        }

        if (state === 'output-available' && part.output) {
          const out = part.output as Record<string, unknown>;
          return (
            <div key={`${part.toolCallId ?? index}-done`} className="rounded border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 px-3 py-2 text-sm text-green-800 dark:text-green-200">
              {isEmail && '✓ Email sent.'}
              {isCalendar && (
                <>
                  ✓ Invite created.
                  {out.link && (
                    <a
                      href={String(out.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline"
                    >
                      View booking
                    </a>
                  )}
                </>
              )}
            </div>
          );
        }

        if (state === 'output-denied') {
          return (
            <div key={`${part.toolCallId ?? index}-denied`} className="text-xs text-muted-foreground italic">
              {isEmail ? 'Email not sent (denied).' : 'Calendar invite not created (denied).'}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
