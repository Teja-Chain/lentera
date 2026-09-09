"use client";

import { User, Sparkles, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { TransactionBadge } from "@/components/web3/TransactionBadge";

interface MessageItemProps {
  message: ChatMessage;
}

/**
 * Strip raw inspector event tokens and JSON payload artifacts from assistant
 * message content before rendering in the chat bubble.
 *
 * Handles all known leak patterns:
 *   1. [EVENT:TYPE] {"key":"value"}   — SSE inline event tags
 *   2. **** {"key":"value"}           — markdown-bold JSON artifacts (2–4 stars)
 *   3. Lines that are purely a JSON object / array with no human text
 *   4. Orphaned punctuation lines left after stripping (e.g. lone "**" or "***")
 */
function stripInspectorEvents(raw: string): string {
  // ── Pass 1: remove [EVENT:<TYPE>] tags + optional trailing JSON payload ──
  let text = raw.replace(
    /\[EVENT:[A-Z_]+\]\s*(\{[\s\S]*?\}|\[[\s\S]*?\])?/g,
    ""
  );

  // ── Pass 2: line-by-line filter ──────────────────────────────────────────
  const lines = text.split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Drop lines matching markdown-bold JSON artifacts: **{...} or ****{...}
    if (/^\*{2,4}\s*[\[{]/.test(trimmed)) continue;

    // Drop lines that are a raw standalone JSON object or array
    // (starts with { or [ and ends with } or ], optionally with trailing punctuation)
    if (/^[\[{][\s\S]*[\]}][,;]?\s*$/.test(trimmed)) continue;

    // Drop lines that became pure markdown punctuation after stripping
    // e.g. lone "**", "***", "---", or empty bold wrappers
    if (/^(\*{1,4}|-{2,}|_{2,})$/.test(trimmed)) continue;

    kept.push(line);
  }

  // ── Pass 3: collapse 3+ consecutive blank lines into one ────────────────
  const collapsed = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return collapsed;
}

const EVENT_ONLY_FALLBACK =
  "I have updated your risk profile according to your instructions.";

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  // For assistant messages, strip inspector event tokens before rendering
  const displayContent = isUser
    ? message.content
    : (() => {
        const cleaned = stripInspectorEvents(message.content);
        return cleaned.length > 0 ? cleaned : EVENT_ONLY_FALLBACK;
      })();

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
        <div className="whitespace-pre-wrap">{displayContent}</div>

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
