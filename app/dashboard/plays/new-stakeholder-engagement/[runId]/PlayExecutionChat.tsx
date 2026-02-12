'use client';

import { useMemo, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Conversation,
  ConversationContent,
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

type StoredMessage = { role: string; content: string; createdAt?: string };

type Props = {
  playId: string;
  initialMessages: StoredMessage[];
  contactName: string;
  step1Done: boolean;
  draftReady: boolean;
  step2Done: boolean;
  onApplyDraft?: (subject: string, body: string) => void;
};

function getMessageText(m: { parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  if (typeof m.content === 'string') return m.content;
  const parts = m.parts ?? [];
  return parts.map((p) => (p.type === 'text' && p.text ? p.text : '')).join('');
}

export function PlayExecutionChat({
  playId,
  initialMessages,
  contactName,
  step1Done,
  draftReady,
  step2Done,
  onApplyDraft,
}: Props) {
  const uiMessages = useMemo(() => {
    return initialMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m, i) => ({
        id: `play-msg-${i}-${m.createdAt ?? ''}`,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }));
  }, [initialMessages]);

  const body = useMemo(() => ({}), []);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/plays/stakeholder/${playId}/chat`,
        body,
      }),
    [playId, body]
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    id: `play-stakeholder-${playId}`,
    transport,
    experimental_throttle: 80,
    messages: uiMessages.length > 0 ? uiMessages : undefined,
    onFinish: ({ messages: finishedMessages }) => {
      const toStore = finishedMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: getMessageText(m),
          createdAt: new Date().toISOString(),
        }));
      if (toStore.length > 0) {
        fetch(`/api/plays/stakeholder/${playId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: toStore }),
        }).catch(() => {});
      }
    },
  });

  useEffect(() => {
    if (uiMessages.length > 0 && messages.length === 0) {
      setMessages(uiMessages);
    }
  }, [uiMessages.length, messages.length, setMessages, uiMessages]);

  const displayMessages = useMemo(
    () => messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [messages]
  );
  const isLoading = status === 'submitted' || status === 'streaming';

  const placeholder =
    !step1Done && !isLoading
      ? 'Researching… Anything specific you want me to look for?'
      : step1Done && !draftReady
        ? 'Research complete! Ready to draft the intro email?'
        : draftReady && !step2Done
          ? 'Want me to adjust tone, length, or approach?'
          : step2Done
            ? 'Email approved! Next: Send LinkedIn connection request.'
            : 'Type a message...';

  function handleSubmit(payload: { text: string }, _e: React.FormEvent<HTMLFormElement>) {
    const text = payload.text?.trim();
    if (!text) return;
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col min-h-[280px] rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">💬 Agent Pilot</p>
      </div>
      <Conversation className="min-h-0 flex-1 overflow-y-auto max-h-[320px]">
        <ConversationContent>
          {displayMessages.length === 0 && !isLoading && (
            <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-100">
              {placeholder}
            </div>
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
                <span className="text-muted-foreground text-sm">Thinking…</span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Type a message..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
