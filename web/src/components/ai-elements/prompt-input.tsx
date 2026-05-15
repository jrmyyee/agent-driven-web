import type { ComponentProps } from "react";

export function PromptInput(props: ComponentProps<"form">) {
  return <form {...props} className={["ai-prompt", props.className].filter(Boolean).join(" ")} />;
}

export function PromptInputTextarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={["ai-prompt-textarea", props.className].filter(Boolean).join(" ")} />;
}

export function PromptInputSubmit(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={["ai-prompt-submit", props.className].filter(Boolean).join(" ")}
    />
  );
}
