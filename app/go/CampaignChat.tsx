'use client';

import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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

type CampaignChatProps = {
  campaignId: string;
};

export function CampaignChat({ campaignId }: CampaignChatProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/go/${campaignId}/chat`,
        body: {},
      }),
    [campaignId]
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: `campaign-chat-${campaignId}`,
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
    <div className="flex flex-col min-h-[320px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Questions? Chat with us
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Ask about pricing, events, or request a demo or meeting link by email.
        </p>
      </div>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {displayMessages.length === 0 && !isLoading && (
            <ConversationEmptyState
              title="Send a message to get started"
              description="Ask about pricing, event recommendations, or request a calendar or demo link by email."
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mt-2 w-full max-w-sm">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">
                  Try asking:
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5 text-left">
                  <li>• &quot;What sessions do you recommend for automotive?&quot;</li>
                  <li>• &quot;Email me the calendar link&quot;</li>
                  <li>• &quot;Send me a link to the demo&quot;</li>
                  <li>• &quot;What&apos;s your pricing?&quot;</li>
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
                  />
                )}
              </MessageContent>
            </Message>
          ))}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Thinking…
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-b-xl">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask about pricing, events, or request a link by email…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
