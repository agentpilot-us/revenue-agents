'use client';

import { useState } from 'react';
import { ChatUI } from '@/app/chat/ChatUI';

const t = {
  surface: 'rgba(15,23,42,0.98)',
  border: 'rgba(255,255,255,0.08)',
  text1: '#e2e8f0',
  text2: '#94a3b8',
  text3: '#64748b',
  blue: '#3b82f6',
};

type Props = {
  accountId: string;
  companyName: string;
};

export default function ChatDrawer({ accountId, companyName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 900,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Chat about ${companyName}`}
        >
          💬
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            width: 400,
            height: 560,
            maxHeight: 'calc(100vh - 100px)',
            background: t.surface,
            borderRadius: 16,
            border: `1px solid ${t.border}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: `1px solid ${t.border}`,
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: t.text1,
                }}
              >
                Chat
              </div>
              <div style={{ fontSize: 11, color: t.text3 }}>
                {companyName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: t.text3,
                fontSize: 18,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatUI accountId={accountId} embedded />
          </div>
        </div>
      )}
    </>
  );
}
