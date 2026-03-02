'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronUp, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPrepMePrompt, type PrepMePromptParams } from '@/lib/prompts/prep-me';

export type PrepMePanelParams = PrepMePromptParams & {
  companyId: string;
};

type PrepMePanelProps = PrepMePanelParams & {
  onClose: () => void;
};

type ParsedSection = { title: string; body: string };

const LOADING_STEPS = ['Analyzing account context…', 'Building talking points…'];

/** Parse talking_points raw text into sections by header lines (e.g. "OPENING (2-3 options):", "KEY PAIN TO PROBE:"). */
function parseTalkingPointsSections(raw: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = raw.split(/\r?\n/);
  const headerPattern = /^(OPENING|KEY PAIN TO PROBE|VALUE PROPS FOR THIS MEETING|LIKELY OBJECTIONS|PROOF POINT TO DROP|SUGGESTED NEXT STEP)(?:\s*\([^)]*\))?\s*:?\s*$/i;
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(headerPattern);
    if (match) {
      if (current) {
        sections.push({ title: current.title, body: current.body.join('\n').trim() });
      }
      current = { title: match[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) {
    sections.push({ title: current.title, body: current.body.join('\n').trim() });
  }

  if (sections.length === 0 && raw.trim()) {
    sections.push({ title: 'Talking Points', body: raw.trim() });
  }
  return sections;
}

export function PrepMePanel({
  companyId,
  companyName,
  divisionName,
  contactName,
  contactTitle,
  signalTitle,
  signalSummary,
  onClose,
}: PrepMePanelProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [content, setContent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const prompt = buildPrepMePrompt({
    companyName,
    divisionName,
    contactName,
    contactTitle,
    signalTitle,
    signalSummary,
  });

  const fetchTalkingPoints = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    setContent('');
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 1500);

    try {
      const res = await fetch(`/api/companies/${companyId}/create-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'talking_points', prompt }),
      });
      const data = await res.json();
      clearInterval(stepInterval);
      if (!res.ok) {
        setErrorMessage(data.details ?? data.error ?? 'Generation failed');
        setStatus('error');
        return;
      }
      setContent(data.content ?? '');
      setStatus('success');
    } catch (e) {
      clearInterval(stepInterval);
      setErrorMessage(e instanceof Error ? e.message : 'Request failed');
      setStatus('error');
    }
  }, [companyId, prompt]);

  useEffect(() => {
    fetchTalkingPoints();
  }, [fetchTalkingPoints]);

  const sections = content ? parseTalkingPointsSections(content) : [];
  const createContentUrl = `/dashboard/companies/${companyId}/create-content?contentType=talking_points&prompt=${encodeURIComponent(prompt)}`;

  const handleCopyAll = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-xl z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-labelledby="prep-me-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 id="prep-me-title" className="text-lg font-semibold text-card-foreground">
            Prep Me — Talking Points
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-border" />
                <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {LOADING_STEPS[loadingStep]}
              </p>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= loadingStep ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 text-center">
              <p className="text-destructive text-sm mb-4">{errorMessage}</p>
              <Button onClick={fetchTalkingPoints} variant="outline" size="sm">
                Try again
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              {sections.map((section, i) => (
                <TalkingPointsSection key={i} title={section.title} body={section.body} />
              ))}
            </div>
          )}
        </div>

        {status === 'success' && (
          <div className="p-4 border-t border-border flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy All'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchTalkingPoints} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button size="sm" asChild className="gap-1.5">
              <Link href={createContentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open in Create Content
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function TalkingPointsSection({ title, body }: { title: string; body: string }) {
  const [expanded, setExpanded] = useState(true);
  if (!body.trim()) return null;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors text-card-foreground"
      >
        <span className="font-medium text-sm">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="p-3 pt-0 border-t border-border">
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
            {body}
          </pre>
        </div>
      )}
    </div>
  );
}
