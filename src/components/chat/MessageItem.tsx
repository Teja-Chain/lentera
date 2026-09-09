"use client";

import { User, Sparkles, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { TransactionBadge } from "@/components/web3/TransactionBadge";

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-purple-500/20"
          style={{ background: "linear-gradient(135deg, #7c6ff7, #22d3ee)" }}
        >
          <Sparkles size={16} />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
            : "rounded-tl-sm border border-white/10 bg-[#141622]/90 text-zinc-200 backdrop-blur-sm"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Decision Badge if present */}
        {message.decision && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
            {message.decision === "approved" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 size={12} />
                <span>Risk Guard: Approved</span>
              </span>
            ) : message.decision === "blocked" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300">
                <ShieldAlert size={12} />
                <span>Risk Guard: Blocked</span>
              </span>
            ) : null}

            {message.reasoning && (
              <span className="text-xs text-zinc-400 italic">
                {message.reasoning}
              </span>
            )}
          </div>
        )}

        {/* Transaction Badge if present */}
        {message.txHash && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-zinc-400">On-Chain Tx:</span>
            <TransactionBadge txHash={message.txHash} />
          </div>
        )}

        <div className="mt-1 text-[10px] text-zinc-400/60 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600/30 border border-purple-500/30 text-purple-300">
          <User size={16} />
        </div>
      )}
    </div>
  );
}
