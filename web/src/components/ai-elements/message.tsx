import type { ComponentProps, ReactNode } from "react";

export function Message({
  from,
  ...props
}: ComponentProps<"article"> & { from: "user" | "assistant" | "system"; children: ReactNode }) {
  return (
    <article
      {...props}
      className={["ai-message", `from-${from}`, props.className].filter(Boolean).join(" ")}
    />
  );
}

export function MessageContent(props: ComponentProps<"div">) {
  return <div {...props} className={["ai-message-content", props.className].filter(Boolean).join(" ")} />;
}
