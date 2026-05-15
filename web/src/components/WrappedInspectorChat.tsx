"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { detectLensRequest, type LensApplyResponse, type LensName } from "@/lib/lens";

const starterPrompts = [
  "Apply recruiter view",
  "Apply technical peer view",
  "Why did this profile get these components?",
  "What was skipped, and why?",
];

function textMessage(role: "user" | "assistant", text: string): UIMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    parts: [{ type: "text", text }],
  };
}

function lensReply(result: LensApplyResponse) {
  const added = result.changeLog.added.length > 0 ? result.changeLog.added.join(", ") : "none";
  const removed =
    result.changeLog.removed.length > 0 ? result.changeLog.removed.join(", ") : "none";
  return [
    result.reply,
    "",
    `Applied: ${result.lensLabel} lens.`,
    `Added: ${added}.`,
    `Removed: ${removed}.`,
  ].join("\n");
}

function messageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .trim();
}

export function WrappedInspectorChat({
  activeLens,
  activeLensLabel,
  handle,
  onApplyLens,
}: {
  activeLens?: LensName | null;
  activeLensLabel?: string | null;
  handle: string;
  onApplyLens?: (request: {
    instruction: string;
    lens: LensName;
    lensLabel: string;
  }) => Promise<LensApplyResponse>;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [lensBusy, setLensBusy] = useState(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/wrapped/chat",
        body: { handle },
      }),
    [handle],
  );
  const { messages, sendMessage, setMessages, status, error, stop } = useChat({ transport });
  const busy = lensBusy || status === "submitted" || status === "streaming";

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const lensRequest = detectLensRequest(trimmed);

    if (lensRequest && onApplyLens) {
      setInput("");
      setLensBusy(true);
      setMessages((current) => [...current, textMessage("user", trimmed)]);
      try {
        const recentContext = messages
          .slice(-4)
          .map((message) => `${message.role}: ${messageText(message)}`)
          .filter((line) => !line.endsWith(": "))
          .join("\n");
        const instruction =
          lensRequest.lens === "custom" && recentContext
            ? `User request: ${trimmed}\n\nRecent inspector context:\n${recentContext}`
            : trimmed;
        const result = await onApplyLens({
          instruction,
          lens: lensRequest.lens,
          lensLabel: lensRequest.label,
        });
        setMessages((current) => [...current, textMessage("assistant", lensReply(result))]);
        setOpen(false);
      } catch (error) {
        setMessages((current) => [
          ...current,
          textMessage(
            "assistant",
            `I could not apply that lens: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ]);
      } finally {
        setLensBusy(false);
      }
      return;
    }

    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className={["inspector-floating", activeLens ? "has-active-lens" : ""].join(" ")}>
      {open ? null : (
        <button
          type="button"
          className="inspector-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span>AI inspector</span>
          <strong>Ask how this Wrapped was made</strong>
        </button>
      )}

      {open ? (
        <>
          <button
            type="button"
            className="inspector-backdrop"
            aria-label="Close inspector"
            onClick={() => setOpen(false)}
          />
          <section
            className="inspector-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Wrapped inspector chat"
          >
            <header className="inspector-panel-header">
              <div>
                <p className="eyebrow">AI inspector</p>
                <h2>How this Wrapped was made</h2>
                {activeLens ? <span>{activeLensLabel ?? "Derived"} lens is active</span> : null}
              </div>
              <button type="button" className="inspector-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>

            <div className="inspector-chat">
              <div className="inspector-prompts">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submit(prompt)}
                    disabled={busy}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <Conversation>
                <ConversationContent>
                  {messages.length === 0 ? (
                    <p className="chat-empty">
                      Ask why components were selected, or ask for a recruiter, founder,
                      maintainer, technical peer, or custom view to re-compose this Wrapped.
                    </p>
                  ) : (
                    messages.map((message) => (
                      <Message from={message.role} key={message.id}>
                        <MessageContent>
                          {message.parts.map((part, index) =>
                            part.type === "text" ? <Response key={index}>{part.text}</Response> : null,
                          )}
                        </MessageContent>
                      </Message>
                    ))
                  )}
                  {busy ? (
                    <div className="ai-thinking" aria-live="polite">
                      <span />
                      {lensBusy ? "Re-composing the Wrapped" : "Inspecting the render plan"}
                    </div>
                  ) : null}
                </ConversationContent>
              </Conversation>

              {error ? <p className="chat-error">Inspector stream failed. Try again.</p> : null}

              <PromptInput
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(input);
                }}
              >
                <PromptInputTextarea
                  value={input}
                  onChange={(event) => setInput(event.currentTarget.value)}
                  placeholder="Ask how this Wrapped was made"
                  rows={2}
                  disabled={busy}
                />
                <PromptInputSubmit
                  type={busy ? "button" : "submit"}
                  onClick={busy ? () => stop() : undefined}
                >
                  {busy ? "Stop" : "Ask"}
                </PromptInputSubmit>
              </PromptInput>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
