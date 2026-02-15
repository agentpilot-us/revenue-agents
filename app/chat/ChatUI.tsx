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

type ChatUIProps = {
  playId: string;
  accountId?: string;
  contactId?: string;
};

export function ChatUI({ playId, accountId, contactId }: ChatUIProps) {
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

  return (
    <div className="flex flex-col min-h-[400px] rounded-xl border border-gray-200 bg-gray-50/50 dark:bg-zinc-900">
      {accountId ? (
        <div className="p-3 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-t-xl max-h-[300px] overflow-y-auto">
          <CompanyResearchDisplay companyId={accountId} />
        </div>
      ) : (
        <div className="p-3 border-b border-gray-200 dark:border-zinc-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-t-xl">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            💡 <strong>Tip:</strong> Access chat from a company page to see account research data. Go to a company and click &quot;Launch Chat&quot;.
          </p>
        </div>
      )}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {displayMessages.length === 0 && !isLoading && (
            <ConversationEmptyState
              title="Send a message to get started"
              description="The agent can research accounts, find contacts, send email, and more."
            >
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-2 w-full max-w-sm">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Try asking:
                </p>
                <ul className="text-xs text-blue-700 space-y-0.5 text-left">
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
                      ? (m as { content: string }).content
                      : (m as { parts?: Array<{ type: string; text?: string }> }).parts
                          ?.filter((p): p is { type: string; text: string } => p.type === 'text')
                          .map((p) => p.text)
                          .join('') ?? ''}
                  </MessageResponse>
                ) : (
                  <ChatMessageParts
                    parts={(m as { parts?: unknown[] }).parts}
                    addToolApprovalResponse={addToolApprovalResponse}
                  />
                )}
              </MessageContent>
            </Message>
          ))}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <span className="text-muted-foreground text-sm">
                  Thinking…
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
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
