'use client';

import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import { ChatMessageParts } from '@/components/ai-elements/chat-message-parts';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { CompanyResearchDisplay } from '@/app/components/company/CompanyResearchDisplay';
import { DEMO_CHAT_THEME } from '@/lib/demo-chat-theme';

type ChatUIProps = {
  playId: string;
  accountId?: string;
  contactId?: string;
  /** When true, use less space for research block so the message input stays visible (e.g. in widget). */
  compact?: boolean;
  /** When true, use demo (Autonomous Play) look: dark background, borders, and text for embedded chat. */
  embedInDemo?: boolean;
};

const T = DEMO_CHAT_THEME;

export function ChatUI({ playId, accountId, contactId, compact = false, embedInDemo = false }: ChatUIProps) {
  const body = useMemo(
    () => ({
      playId,
      ...(accountId ? { accountId } : {}),
      ...(contactId ? { contactId } : {}),
    }),
    [playId, accountId, contactId]
  );
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body }),
    [body]
  );
  const { messages, sendMessage, status, stop, addToolApprovalResponse } = useChat({
    id: `chat-${playId}-${accountId ?? 'none'}-${contactId ?? 'none'}`,
    transport,
    experimental_throttle: 80,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const displayMessages = useMemo(
    () => messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [messages]
  );
  const isLoading = status === 'submitted' || status === 'streaming';

  function handleSubmit(
    payload: { text: string },
    _e: React.FormEvent<HTMLFormElement>
  ) {
    const text = payload.text?.trim();
    if (!text) return;
    sendMessage({ text });
  }

  const wrapperClass = compact ? 'min-h-0 flex-1' : 'min-h-[400px]';
  const researchClass = compact ? 'max-h-[140px]' : 'max-h-[300px]';

  return (
    <div
      className={`flex flex-col overflow-hidden ${embedInDemo ? 'min-h-0 flex-1 border-0 rounded-none' : `rounded-xl border border-gray-200 bg-gray-50/50 dark:bg-zinc-900 ${wrapperClass}`}`}
      style={embedInDemo ? { background: 'transparent' } : undefined}
    >
      {accountId ? (
        <div
          className={`p-3 overflow-y-auto shrink-0 ${embedInDemo ? '' : 'border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-t-xl'} ${researchClass}`}
          style={embedInDemo ? { borderBottom: `1px solid ${T.BORDER}`, background: T.SURFACE } : undefined}
        >
          <CompanyResearchDisplay companyId={accountId} />
        </div>
      ) : (
        <div
          className={embedInDemo ? '' : 'p-3 border-b border-gray-200 dark:border-zinc-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-t-xl'}
          style={embedInDemo ? { padding: 12, borderBottom: `1px solid ${T.BORDER}`, background: T.SURFACE2 } : undefined}
        >
          <p className={embedInDemo ? 'text-xs' : 'text-xs text-yellow-800 dark:text-yellow-200'} style={embedInDemo ? { color: T.TEXT2 } : undefined}>
            💡 <strong>Tip:</strong> Access chat from a company page to see account research data. Go to a company and click &quot;Launch Chat&quot;.
          </p>
        </div>
      )}
      <Conversation className={`min-h-0 flex-1 ${embedInDemo ? 'bg-transparent' : ''}`} style={embedInDemo ? { background: 'transparent' } : undefined}>
        <ConversationContent style={embedInDemo ? { color: T.TEXT } : undefined}>
          {displayMessages.length === 0 && !isLoading && (
            <ConversationEmptyState
              title="Send a message to get started"
              description="The agent can research accounts, find contacts, send email, and more."
              style={embedInDemo ? { color: T.TEXT } : undefined}
            >
              <div
                className={embedInDemo ? 'p-3 rounded-lg mt-2 w-full max-w-sm' : 'p-3 bg-blue-50 rounded-lg border border-blue-100 mt-2 w-full max-w-sm'}
                style={embedInDemo ? { background: T.SURFACE2, border: `1px solid ${T.BORDER}` } : undefined}
              >
                <p className="text-xs font-medium mb-1" style={embedInDemo ? { color: T.TEXT } : undefined}>
                  Try asking:
                </p>
                <ul className="text-xs space-y-0.5 text-left" style={embedInDemo ? { color: T.TEXT2 } : undefined}>
                  <li>• &quot;Find contacts at [company]&quot;</li>
                  <li>• &quot;Research [company] recent news&quot;</li>
                  <li>• &quot;Send a test email to [address]&quot;</li>
                </ul>
              </div>
            </ConversationEmptyState>
          )}
          {displayMessages.map((m) => (
            <Message key={m.id} from={m.role as 'user' | 'assistant'}>
              <MessageContent>
                {m.role === 'user' ? (
                  <MessageResponse>
                    {typeof (m as { content?: string }).content === 'string'
                      ? (m as unknown as { content: string }).content
                      : (m as { parts?: Array<{ type: string; text?: string }> }).parts
                          ?.filter((p): p is { type: string; text: string } => p.type === 'text')
                          .map((p) => p.text)
                          .join('') ?? ''}
                  </MessageResponse>
                ) : (
                  <ChatMessageParts
                    parts={(m as { parts?: unknown[] }).parts as undefined | Array<{ type: string; text?: string } & Record<string, unknown>>}
                    addToolApprovalResponse={addToolApprovalResponse}
                  />
                )}
              </MessageContent>
            </Message>
          ))}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <span className="text-sm" style={embedInDemo ? { color: T.TEXT2 } : undefined}>
                  Thinking…
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>
      <div
        className={embedInDemo ? 'p-4 shrink-0' : 'p-4 border-t border-gray-200 bg-white dark:bg-zinc-800 rounded-b-xl shrink-0'}
        style={embedInDemo ? { borderTop: `1px solid ${T.BORDER}`, background: T.SURFACE } : undefined}
      >
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message the agent…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
