import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StradexAI — AI-Powered Growth Agency for Enterprise Sales',
  description:
    'The AI-powered growth agency. Enterprise sales teams capture real AI value — briefings, plays, account-specific outreach — without the implementation tax of new platforms, rollouts, and retraining.',
  openGraph: {
    title: 'StradexAI — AI-Powered Growth Agency',
    description:
      'How enterprise sales actually captures AI value: managed intelligence and governed execution across named accounts — not another tool your RevOps has to implement.',
    type: 'website',
  },
};

export default function StradexAILayout({ children }: { children: React.ReactNode }) {
  return children;
}
