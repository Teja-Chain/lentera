"use client";

import { useState } from "react";
import {
  Database,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { InspectorEvent } from "@/types/inspector";
import { TransactionBadge } from "@/components/web3/TransactionBadge";

interface LogCardProps {
  event: InspectorEvent;
}

export function LogCard({ event }: LogCardProps) {
  const { type, timestamp, title, data, status, txHash } = event;
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  // Determine badge color scheme based on event type & status
  let badgeClasses = "border-zinc-800/80 bg-zinc-900/50 text-zinc-300 shadow-zinc-950/20";
  let icon = <Clock size={14} className="text-zinc-400" />;
  let typeLabel: string = type;

  if (type === "FETCH_MEMORY") {
    badgeClasses = "border-purple-500/30 bg-purple-950/20 text-purple-300 shadow-purple-950/20";
    icon = <Database size={14} className="text-purple-400" />;
    typeLabel = "SIBYL MEMORY";
  } else if (type === "EVALUATE_RISK") {
    badgeClasses = "border-amber-500/30 bg-amber-950/20 text-amber-300 shadow-amber-950/20";
    icon = <ShieldAlert size={14} className="text-amber-400" />;
    typeLabel = "RISK GUARD EVAL";
  } else if (type === "DECISION") {
    if (status === "approved") {
      badgeClasses = "border-emerald-500/35 bg-emerald-950/25 text-emerald-300 shadow-emerald-950/20";
      icon = <CheckCircle2 size={14} className="text-emerald-400" />;
      typeLabel = "GUARD: APPROVED";
    } else {
      badgeClasses = "border-rose-500/35 bg-rose-950/25 text-rose-300 shadow-rose-950/20";
      icon = <XCircle size={14} className="text-rose-400" />;
      typeLabel = "GUARD: BLOCKED";
    }
  } else if (type === "ONCHAIN_ACTION") {
    badgeClasses = "border-cyan-500/35 bg-cyan-950/25 text-cyan-300 shadow-cyan-950/20";
    icon = <ArrowRightLeft size={14} className="text-cyan-400" />;
    typeLabel = "BASE SEPOLIA ROUTER";
  } else if (type === "FALLBACK") {
    badgeClasses = "border-amber-600/35 bg-amber-950/30 text-amber-200 shadow-amber-950/20";
    icon = <AlertTriangle size={14} className="text-amber-400" />;
    typeLabel = "FALLBACK ADAPTER";
  }

  const handleCopy = () => {
    if (!data) return;
    const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasData = data !== null && data !== undefined && data !== "";

  return (
    <div
      className={`rounded-xl border p-3 sm:p-3.5 transition-all duration-200 shadow-md backdrop-blur-sm ${badgeClasses}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider font-mono">
            {typeLabel}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400/70 font-mono">{timestamp}</span>
      </div>

      <div className="text-xs font-medium text-zinc-100 mb-2 leading-relaxed">{title}</div>

      {hasData && (
        <div className="rounded-lg border border-white/5 bg-black/40 overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5 bg-white/[0.02]">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
              Payload Payload {typeof data === "object" ? "(JSON)" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy payload"
                className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="p-2.5 text-[11px] font-mono text-zinc-300 max-h-56 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
              {typeof data === "string" ? (
                <p className="whitespace-pre-wrap">{data}</p>
              ) : (
                <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      )}

      {txHash && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-zinc-400 font-medium">Verified On-Chain:</span>
          <TransactionBadge txHash={txHash} />
        </div>
      )}
    </div>
  );
}
