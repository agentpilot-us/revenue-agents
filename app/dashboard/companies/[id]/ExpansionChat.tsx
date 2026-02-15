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

type ExpansionChatProps = {
  companyId: string;
  companyName: string;
  contactId?: string;
};

const EXAMPLE_PROMPTS = [
  'Find contacts at this company',
  'Research this account',
  'Send a test email to [address]',
];

export function ExpansionChat({
  companyId,
  companyName,
  contactId,
}: ExpansionChatProps) {
  const body = useMemo(
    () => ({
      playId: 'expansion',
      accountId: companyId,
      ...(contactId ? { contactId } : {}),
    }),
    [companyId, contactId]
  );
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body }),
    [body]
  );
  const { messages, sendMessage, status, stop, addToolApprovalResponse } = useChat({
    id: `expansion-${companyId}-${contactId ?? 'none'}`,
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
    <div className="flex flex-col h-[420px]">
      <div className="text-sm text-gray-600 mb-2">
        Chat with the agent for {companyName}: discover buying groups, research
        the account, run outreach.
      </div>
      <Conversation className="flex-1 min-h-0 rounded-lg border border-gray-200 bg-gray-50">
        <ConversationContent className="p-4">
          {displayMessages.length === 0 && !isLoading && (
            <ConversationEmptyState
              title="Ask the expansion agent"
              description="Research the account, list buying group templates, or create a new buying group."
            >
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 w-full max-w-sm">
                <p className="text-xs font-medium text-blue-900 mb-1">Try:</p>
                <ul className="text-xs text-blue-700 space-y-0.5 text-left">
                  {EXAMPLE_PROMPTS.map((p, i) => (
                    <li key={i}>• &quot;{p}&quot;</li>
                  ))}
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
                  Agent is working…
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>
      <div className="mt-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message the expansion agent…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
