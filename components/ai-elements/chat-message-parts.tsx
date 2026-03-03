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

        const isPlanExecution = toolType === 'tool-execute_expansion_plan';

        if (isPlanExecution) {
          return (
            <PlanExecutionCard
              key={`${part.toolCallId ?? index}-plan`}
              part={part}
              state={state}
            />
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

// -------------------------------------------------------------------
// Plan Execution Progress Card
// -------------------------------------------------------------------

type PlanStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  result?: string;
};

type PlanProgressOutput = {
  planType: string;
  steps: PlanStep[];
  currentStep: number;
  totalSteps: number;
  summary?: string;
};

type PlanResultOutput = {
  success: boolean;
  salesPageUrl: string | null;
  emailSent: boolean;
  briefingUrl: string | null;
  summary: string;
};

function isPlanProgress(obj: unknown): obj is PlanProgressOutput {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'steps' in obj &&
    Array.isArray((obj as PlanProgressOutput).steps)
  );
}

function isPlanResult(obj: unknown): obj is PlanResultOutput {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'summary' in obj &&
    !('steps' in obj)
  );
}

const stepStatusIcon: Record<string, string> = {
  pending: '○',
  running: '◉',
  completed: '✓',
  skipped: '–',
  failed: '✗',
};

const stepStatusColor: Record<string, string> = {
  pending: 'text-muted-foreground',
  running: 'text-blue-600 dark:text-blue-400',
  completed: 'text-green-600 dark:text-green-400',
  skipped: 'text-muted-foreground',
  failed: 'text-red-600 dark:text-red-400',
};

function PlanExecutionCard({
  part,
  state,
}: {
  part: ToolPart;
  state: string;
}) {
  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500" />
          <span className="font-medium text-blue-900 dark:text-blue-100">
            Preparing expansion plan…
          </span>
        </div>
      </div>
    );
  }

  const output = part.output;

  // Streaming progress (preliminary results)
  if (state === 'output-available' && output && isPlanProgress(output)) {
    const progress = output;
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-3 text-sm">
        <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Executing {progress.planType.replace(/_/g, ' ')} plan
        </p>
        <div className="space-y-1">
          {progress.steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2">
              <span className={cn('font-mono text-xs mt-0.5', stepStatusColor[step.status])}>
                {stepStatusIcon[step.status]}
              </span>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-xs',
                  step.status === 'running' && 'font-medium text-blue-800 dark:text-blue-200',
                  step.status === 'completed' && 'text-green-800 dark:text-green-200',
                  step.status === 'failed' && 'text-red-800 dark:text-red-200',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'skipped' && 'text-muted-foreground line-through',
                )}>
                  {step.label}
                </span>
                {step.result && step.status !== 'pending' && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {step.result}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Final result
  if (state === 'output-available' && output && isPlanResult(output)) {
    const result = output;
    return (
      <div className={cn(
        'rounded-lg border p-3 text-sm',
        result.success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
      )}>
        <p className={cn(
          'font-medium mb-1',
          result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
        )}>
          {result.success ? '✓ Plan executed successfully' : '✗ Plan execution failed'}
        </p>
        <div className="space-y-0.5 text-xs">
          {result.salesPageUrl && (
            <p>
              Sales page:{' '}
              <a
                href={result.salesPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {result.salesPageUrl}
              </a>
            </p>
          )}
          {result.emailSent && <p>✓ Email sent</p>}
          {result.briefingUrl && (
            <p>
              Briefing:{' '}
              <a
                href={result.briefingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {result.briefingUrl}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state === 'output-error' && part.errorText) {
    return (
      <div className="rounded border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        Plan execution failed: {part.errorText}
      </div>
    );
  }

  return null;
}
