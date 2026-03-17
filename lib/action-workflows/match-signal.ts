/**
 * Match new signals to plays via SignalPlayMapping (and optional AccountPlayActivation),
 * then create a PlayRun instead of an ActionWorkflow.
 */

import { matchSignalToPlayRun } from '@/lib/plays/match-signal-to-play';

type Signal = {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  summary: string;
  relevanceScore: number;
  suggestedPlay: string | null;
};

export async function matchSignalToRoadmapRules(signal: Signal): Promise<void> {
  try {
    await matchSignalToPlayRun({
      id: signal.id,
      companyId: signal.companyId,
      userId: signal.userId,
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      relevanceScore: signal.relevanceScore,
      suggestedPlay: signal.suggestedPlay,
    });
  } catch (err) {
    console.error(`Signal-to-play matching failed for ${signal.id}:`, err);
    throw err;
  }
}
