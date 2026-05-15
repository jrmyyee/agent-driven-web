import type { ComponentProps } from "react";

export function Conversation(props: ComponentProps<"div">) {
  return <div {...props} className={["ai-conversation", props.className].filter(Boolean).join(" ")} />;
}

export function ConversationContent(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={["ai-conversation-content", props.className].filter(Boolean).join(" ")}
    />
  );
}
