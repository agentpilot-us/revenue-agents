'use client';

import { useEffect, useState } from 'react';

const t = {
  surface: 'rgba(15,23,42,0.6)',
  border: 'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  text4: '#475569',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.08)',
  blueBorder: 'rgba(59,130,246,0.25)',
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string | null;
  isBuiltIn: boolean;
  isDefault: boolean;
  _count?: { steps: number };
};

export default function PlayLibraryManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/playbooks/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ fontSize: 12, color: t.text3, padding: 12 }}>
        Loading play templates...
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: t.text3,
          }}
        >
          Play Library ({templates.length})
        </h3>
      </div>

      {templates.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            fontSize: 13,
            color: t.text3,
            background: t.surface,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
          }}
        >
          No play templates available. Seed templates or create custom ones.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>
                    {tmpl.name}
                  </div>
                  {tmpl.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: t.text2,
                        marginTop: 4,
                        lineHeight: 1.5,
                        maxWidth: 500,
                      }}
                    >
                      {tmpl.description}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  {tmpl.triggerType && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: t.blueBg,
                        color: t.blue,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {tmpl.triggerType.replace(/_/g, ' ')}
                    </span>
                  )}
                  {tmpl.isBuiltIn && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'rgba(100,116,139,0.08)',
                        color: t.text3,
                        letterSpacing: '0.04em',
                      }}
                    >
                      BUILT-IN
                    </span>
                  )}
                </div>
              </div>
              {tmpl._count?.steps != null && (
                <div style={{ fontSize: 10, color: t.text4, marginTop: 6 }}>
                  {tmpl._count.steps} steps
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
