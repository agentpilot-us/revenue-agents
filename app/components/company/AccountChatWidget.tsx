'use client';

import { useState, useEffect } from 'react';
import { ChatUI } from '@/app/chat/ChatUI';
import { MessageSquare, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${
        isExpanded ? 'right-0 top-0 h-screen w-full md:w-96' : 'bottom-4 right-4 h-[500px] w-[380px]'
      } z-50 flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-2xl transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Chat Agent
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
              {companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatUI playId="expansion" accountId={accountId} />
      </div>
    </div>
  );
}
