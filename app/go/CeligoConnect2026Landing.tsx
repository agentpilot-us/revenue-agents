'use client';

import { useEffect, useState } from 'react';
import { CampaignTrack } from '@/app/go/CampaignTrack';

const REGISTER_URL = 'https://www.celigo.com/connect-2026/register';

type Props = {
  campaignId: string;
  title?: string;
};

export function CeligoConnect2026Landing({ campaignId, title }: Props) {
  const [visitId, setVisitId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sessionId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('campaign_session_id') ||
          (() => {
            const s = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            sessionStorage.setItem('campaign_session_id', s);
            return s;
          })()
        : undefined;
    fetch(`/api/go/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'visit', sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.visitId) setVisitId(data.visitId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const pageTitle = title ?? 'Join 500+ automation leaders at Celigo CONNECT 2026';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl">Celigo</span>
          </div>
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition font-semibold shadow-md"
          >
            Register for CONNECT 2026
          </a>
        </div>
      </header>

      <section className="bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">{pageTitle}</h1>
          <p className="text-2xl md:text-3xl mb-8 text-blue-100">
            The premier event for iPaaS innovation and automation excellence
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10 text-lg">
            <span>📅 April 15-17, 2026</span>
            <span>📍 San Francisco + Virtual</span>
          </div>
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xl font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-xl"
          >
            Register for CONNECT 2026 →
          </a>
        </div>
      </section>

      <section className="py-16 px-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Sessions That Matter for Lattice
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Quote-to-cash automation: Eliminate manual handoffs between sales and finance teams',
              'New hire provisioning: Automate onboarding workflows across HR systems, IT tools, and communication platforms',
              'Eliminating the integration backlog: How fast-growing companies manage 50+ integrations without hiring more engineers',
              'AI-powered integration design: Let AI map your data flows and generate integrations in minutes, not weeks',
            ].map((text, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-indigo-600"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-lg text-gray-900">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 p-10 rounded-2xl">
            <div className="text-sm font-semibold text-indigo-600 mb-3">CASE STUDY</div>
            <h3 className="text-3xl font-bold mb-4 text-gray-900">
              CDC Foundation — Automation-First
            </h3>
            <p className="text-xl text-gray-700">
              From manual processes to fully integrated cloud. Every department now runs
              automated workflows.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">See You in San Francisco?</h2>
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-12 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-2xl font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-2xl"
          >
            Register for CONNECT 2026 →
          </a>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center">
        <p className="text-sm">
          Powered by <span className="font-bold text-white">Celigo</span>
        </p>
        <p className="text-sm mt-2">Personalized invitation generated by AI</p>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
          <CampaignTrack campaignId={campaignId} />
        </div>
      </footer>
    </div>
  );
}
