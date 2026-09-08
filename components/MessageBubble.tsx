import { Info, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ChatMessage, Decision } from "@/lib/types";
import { AddressAvatar, AgentAvatar } from "./Avatar";

const decisionMeta: Record<Decision, { icon: typeof ShieldCheck; label: string; text: string; bg: string }> = {
  allow: { icon: ShieldCheck, label: "Allowed", text: "text-safe", bg: "bg-safe-soft" },
  deny: { icon: ShieldAlert, label: "Blocked by risk guard", text: "text-deny", bg: "bg-deny-soft" },
  info: { icon: Info, label: "Noted", text: "text-info", bg: "bg-info-soft" },
};

export function MessageBubble({ message, wallet }: { message: ChatMessage; wallet?: string }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="animate-fade-up flex items-end justify-end gap-2.5">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2.5 text-[14.5px] leading-relaxed text-white shadow-md shadow-accent/10">
          {message.content}
        </div>
        {wallet ? <AddressAvatar address={wallet} /> : <div className="h-7 w-7 shrink-0" />}
      </div>
    );
  }

  const meta = message.decision ? decisionMeta[message.decision] : null;
  const Icon = meta?.icon;

  return (
    <div className="animate-fade-up flex items-end gap-2.5">
      <AgentAvatar />
      <div className="max-w-[75%] space-y-1.5">
        {meta && Icon && (
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${meta.text} ${meta.bg}`}>
            <Icon size={12} />
            {meta.label}
          </div>
        )}
        <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-2.5 text-[14.5px] leading-relaxed text-text">
          {message.content}
        </div>
        {message.reasoning && (
          <p className="flex items-start gap-1.5 pl-1 text-[12.5px] leading-relaxed text-text-muted">
            <Info size={12} className="mt-0.5 shrink-0 text-text-subtle" />
            {message.reasoning}
          </p>
        )}
      </div>
    </div>
  );
}
