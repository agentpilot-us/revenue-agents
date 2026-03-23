'use client';

import { useState } from 'react';
import { ChatUI } from '@/app/chat/ChatUI';
import { MessageSquare, X } from 'lucide-react';
import { DEMO_CHAT_THEME } from '@/lib/demo-chat-theme';

const T = DEMO_CHAT_THEME;

type Props = {
  accountId: string;
  companyName: string;
};

export default function ChatDrawer({ accountId, companyName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger – match demo gradient */}
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
            background: `linear-gradient(135deg, ${T.ACCENT}, ${T.PURPLE})`,
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Chat about ${companyName}`}
          aria-label="Open chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Drawer – same layout as demo / AccountChatWidget */}
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
            background: T.BG,
            borderRadius: 16,
            border: `1px solid ${T.BORDER}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header – AgentPilot branding to match demo */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${T.BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: T.SURFACE,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${T.ACCENT}, ${T.PURPLE})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                A
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, color: T.TEXT }}>AgentPilot</span>
              <span
                style={{
                  fontSize: 12,
                  color: T.TEXT2,
                  background: T.SURFACE2,
                  padding: '2px 8px',
                  borderRadius: 4,
                  marginLeft: 4,
                }}
              >
                Chat
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: T.TEXT2,
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div style={{ fontSize: 11, color: T.TEXT2, padding: '4px 16px', borderBottom: `1px solid ${T.BORDER}` }}>
            {companyName}
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatUI playId="chat" accountId={accountId} compact embedInDemo />
          </div>
        </div>
      )}
    </>
  );
}
