# Using Vercel AI SDK UI (AI Elements) in This Project

## Current Setup

- **Core:** `ai` (Vercel AI SDK) + `streamText`, tools, `convertToModelMessages`, `stepCountIs`
- **UI:** `@ai-sdk/react` with `useChat` and `DefaultChatTransport` pointing at `/api/chat`
- **Chat UIs:** Custom components in `app/chat/ChatUI.tsx` and `app/dashboard/companies/[id]/ExpansionChat.tsx` — simple message list + input, no markdown, no tool/reasoning display

So we already use the **AI SDK Core** and **React hooks**; we do **not** yet use the **AI Elements** component library.

## Can We Use AI Elements?

Yes. AI Elements is built for the same stack we use:

- Works with **`useChat`** from `@ai-sdk/react` and your existing `/api/chat` streaming.
- Built on **shadcn/ui** (you own the component code and styling).
- Handles **streaming**, **tool calls**, **reasoning**, **markdown**, and **generative UI** patterns.

## Prerequisites

1. **shadcn/ui**  
   AI Elements installs into a shadcn-based UI. This project currently has no shadcn/ui (no `components/ui/`). You need to init shadcn first:

   ```bash
   npx shadcn@latest init
   ```

   Follow the prompts (style, base color, CSS variables recommended). That will add `components.json` and the first primitives (e.g. `components/ui/button.tsx` if you add the button component).

2. **Tailwind**  
   You already use Tailwind 4. shadcn typically expects Tailwind with CSS variables for theming; the init step can set that up.

## Installation (AI Elements)

After shadcn is initialized:

```bash
# Install core chat pieces (conversation, message, prompt input)
npx ai-elements@latest add conversation
npx ai-elements@latest add message
npx ai-elements@latest add prompt-input

# Optional: reasoning, tool display, suggestions
npx ai-elements@latest add reasoning
npx ai-elements@latest add tool
npx ai-elements@latest add suggestion
```

Components are added under `components/ai-elements/` (and may add/use `components/ui/*`). You can customize them in your repo.

## What You Gain

| Feature | Current | With AI Elements |
|--------|---------|-------------------|
| Message thread | Custom list | `Conversation` + `Message` (scroll, layout) |
| Input | Plain `<input>` | `PromptInput` (textarea, submit, attachments) |
| Tool calls | Not shown | `Tool` component (name, params, result, status) |
| Reasoning / CoT | Not shown | `Reasoning` + `ReasoningContent` (streaming) |
| Markdown | Plain text | `MessageResponse` (markdown/syntax) |
| Suggestions | None | `Suggestion` / `Suggestions` |

So you get a richer chat UI (message threads, input, reasoning, tools, markdown) without reimplementing streaming or state — same `useChat` and `/api/chat` backend.

## Integration Approach

1. **Keep** `useChat` and `DefaultChatTransport` with `/api/chat` and your existing `body` (e.g. `playId`, `accountId`, `contactId`).
2. **Replace** the custom message list and input in `ChatUI.tsx` and `ExpansionChat.tsx` with:
   - `Conversation` + `ConversationContent` (and optionally `ConversationScrollButton`)
   - `Message` + `MessageContent` + `MessageResponse` (and, if you use tool parts, map tool parts to `Tool` or your own tool UI)
   - `PromptInput` + `PromptInputTextarea` + submit
3. **Map** `messages` from `useChat` to the shape expected by the AI Elements `Message`/conversation components (the SDK’s stream format and UIMessage types usually align; check each component’s props).
4. **Optional:** If your backend sends reasoning or tool-call parts, wire them to `Reasoning` and `Tool` so users see “thinking” and tool use.

No change to the **API route** is required for basic adoption; only the client components that consume `messages` and `sendMessage` change.

## Resources

- **AI Elements overview:** https://sdk.vercel.ai/elements  
- **Components list:** https://sdk.vercel.ai/docs (Chatbot: Conversation, Message, Prompt Input, Reasoning, Tool, etc.)  
- **Setup / usage:** https://sdk.vercel.ai/docs/setup and https://sdk.vercel.ai/docs/usage  
- **Chatbot example:** https://sdk.vercel.ai/examples/chatbot (shows `useChat` + Conversation + Message + PromptInput + Reasoning)  
- **Install CLI:** `npx ai-elements@latest` (adds components into your app; can install per-component)

## Summary

- **Yes, we can use AI SDK UI (AI Elements)** with the current AI SDK setup.
- **Prerequisite:** Initialize shadcn/ui in this repo.
- **Steps:** Run `npx ai-elements@latest add <component>` for the pieces you want, then refactor `ChatUI` and `ExpansionChat` to use those components while keeping `useChat` and `/api/chat` as-is.
