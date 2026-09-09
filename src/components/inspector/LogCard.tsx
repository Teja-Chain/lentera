"use client";

import { Database, ShieldAlert, CheckCircle2, XCircle, ArrowRightLeft, Clock } from "lucide-react";
import type { InspectorEvent } from "@/types/inspector";
import { TransactionBadge } from "@/components/web3/TransactionBadge";

interface LogCardProps {
  event: InspectorEvent;
}

export function LogCard({ event }: LogCardProps) {
  const { type, timestamp, title, data, status, txHash } = event;

  // Determine badge color scheme based on event type & status
  let badgeClasses = "border-zinc-800 bg-zinc-900/60 text-zinc-300";
  let icon = <Clock size={14} className="text-zinc-400" />;
  let typeLabel: string = type;

  if (type === "FETCH_MEMORY") {
    badgeClasses = "border-purple-500/30 bg-purple-500/10 text-purple-300";
    icon = <Database size={14} className="text-purple-400" />;
    typeLabel = "SIBYL MEMORY";
  } else if (type === "EVALUATE_RISK") {
    badgeClasses = "border-amber-500/30 bg-amber-500/10 text-amber-300";
    icon = <ShieldAlert size={14} className="text-amber-400" />;
    typeLabel = "EVALUATE RISK";
  } else if (type === "DECISION") {
    if (status === "approved") {
      badgeClasses = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
      icon = <CheckCircle2 size={14} className="text-emerald-400" />;
      typeLabel = "DECISION: APPROVED";
    } else {
      badgeClasses = "border-rose-500/30 bg-rose-500/10 text-rose-300";
      icon = <XCircle size={14} className="text-rose-400" />;
      typeLabel = "DECISION: BLOCKED";
    }
  } else if (type === "ONCHAIN_ACTION") {
    badgeClasses = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    icon = <ArrowRightLeft size={14} className="text-emerald-400" />;
    typeLabel = "BASE SEPOLIA EXECUTION";
  }

  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${badgeClasses} shadow-sm`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {typeLabel}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">{timestamp}</span>
      </div>

      <div className="text-xs font-semibold text-zinc-100 mb-1.5">{title}</div>

      {data && (
        <div className="rounded-lg bg-black/40 p-2 text-[11px] font-mono text-zinc-300 overflow-x-auto">
          {typeof data === "string" ? (
            <p className="whitespace-pre-wrap">{data}</p>
          ) : (
            <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      )}

      {txHash && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-medium">Verified On-Chain:</span>
          <TransactionBadge txHash={txHash} />
        </div>
      )}
    </div>
  );
}
