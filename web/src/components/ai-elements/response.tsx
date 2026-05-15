import type { ReactNode } from "react";

export function Response({ children }: { children: ReactNode }) {
  return <div className="ai-response">{children}</div>;
}
