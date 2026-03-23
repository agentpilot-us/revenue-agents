'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatUI } from '@/app/chat/ChatUI';
import { MessageSquare, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DEMO_CHAT_THEME } from '@/lib/demo-chat-theme';

const T = DEMO_CHAT_THEME;

interface AccountChatWidgetProps {
  accountId: string;
  companyName: string;
}

export function AccountChatWidget({ accountId, companyName }: AccountChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // On mobile, start minimized; on desktop, can start expanded
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsMinimized(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          style={{
            width: 56,
            height: 56,
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
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${
        isExpanded ? 'right-0 top-0 h-screen w-full md:w-[400px]' : 'bottom-4 right-4 h-[560px] w-[400px]'
      } z-50 flex flex-col transition-all duration-300 ease-in-out`}
      style={{
        background: T.BG,
        border: `1px solid ${T.BORDER}`,
        borderRadius: isExpanded ? 0 : 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header – match Autonomous Play demo */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link
            href={`/chat?play=expansion&accountId=${accountId}`}
            title="Open chat in full page"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              color: T.TEXT2,
              background: 'none',
            }}
            className="hover:opacity-80"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            style={{
              background: 'none',
              border: `1px solid ${T.BORDER}`,
              color: T.TEXT2,
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
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
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.TEXT2, padding: '4px 16px', borderBottom: `1px solid ${T.BORDER}` }}>
        {companyName}
      </div>

      {/* Chat Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ChatUI playId="expansion" accountId={accountId} compact embedInDemo />
      </div>
    </div>
  );
}
