"use client";

import { Database, ScrollText, ShieldHalf } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import { EventLog, RiskProfileCard } from "./MemoryCard";

export function MemoryPanel() {
  const riskProfile = useAgentStore((s) => s.riskProfile);
  const recentEvents = useAgentStore((s) => s.recentEvents);

  return (
    <aside className="flex w-full flex-col gap-6 overflow-y-auto border-t border-border bg-surface/30 p-5 lg:w-[340px] lg:border-t-0 lg:border-l">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Database size={16} />
        </div>
        <div>
          <div className="text-[13.5px] font-semibold text-text">Sibyl Memory</div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-text-subtle">
            Persisted to disk — survives a brand-new session. This is what makes the risk guard load-bearing, not
            decorative.
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">
          <ShieldHalf size={13} />
          Risk profile
        </div>
        <RiskProfileCard profile={riskProfile} />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-text-muted uppercase">
          <ScrollText size={13} />
          Journal
        </div>
        <EventLog events={recentEvents} />
      </div>
    </aside>
  );
}
