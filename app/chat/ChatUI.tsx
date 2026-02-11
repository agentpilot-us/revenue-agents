'use client';

import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
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

type ChatUIProps = {
  playId: string;
  accountId?: string;
  contactId?: string;
};

function getMessageText(m: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p): p is { type: string; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return typeof m.content === 'string' ? m.content : '';
}

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
  const { messages, sendMessage, status, stop } = useChat({
    id: `chat-${playId}-${accountId ?? 'none'}-${contactId ?? 'none'}`,
    transport,
    experimental_throttle: 80,
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
    <div className="flex flex-col min-h-[400px] rounded-xl border border-gray-200 bg-gray-50/50">
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
                <MessageResponse>{getMessageText(m)}</MessageResponse>
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
