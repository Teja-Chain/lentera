"use client";

import { useRef, useEffect } from "react";
import { Activity, ShieldCheck, Database, Trash2 } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import { LogCard } from "./LogCard";

export function InspectorPanel() {
  const inspectorEvents = useAgentStore((s) => s.inspectorEvents);
  const clearInspectorEvents = useAgentStore((s) => s.clearInspectorEvents);
  const riskProfile = useAgentStore((s) => s.riskProfile);
  const memorySource = useAgentStore((s) => s.memorySource);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inspectorEvents]);

  return (
    <aside className="flex h-full w-full flex-col border-t border-white/10 bg-[#0e101a]/70 backdrop-blur-sm lg:w-[420px] lg:border-t-0 lg:border-l">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <Activity size={15} />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
              <span>Thought & Memory Inspector</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] text-zinc-400">Live SSE Verification Stream</div>
          </div>
        </div>

        {inspectorEvents.length > 0 && (
          <button
            onClick={clearInspectorEvents}
            title="Clear inspector log"
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Persistent Sibyl Memory Status Bar */}
      <div className="border-b border-white/10 bg-[#141624]/60 px-4 py-2.5 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 font-medium text-purple-300">
            <Database size={13} />
            <span>Active Sibyl Memory Rules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300 font-mono">
              Load-Bearing
            </span>
            {memorySource && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono border ${
                  memorySource.toLowerCase().includes("cloud") || memorySource.toLowerCase().includes("live")
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {memorySource}
              </span>
            )}
          </div>
        </div>

        {riskProfile ? (
          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
            <div className="rounded-md bg-black/30 p-1.5">
              <span className="text-zinc-500">Tolerance:</span>{" "}
              <span className="font-semibold uppercase text-purple-300">
                {riskProfile.riskTolerance}
              </span>
            </div>
            <div className="rounded-md bg-black/30 p-1.5">
              <span className="text-zinc-500">Max Slippage:</span>{" "}
              <span className="font-semibold text-zinc-200">{riskProfile.maxSlippagePercent}%</span>
            </div>
            <div className="rounded-md bg-black/30 p-1.5">
              <span className="text-zinc-500">Max Budget:</span>{" "}
              <span className="font-semibold text-zinc-200">{riskProfile.maxBudgetPerTxUsdc} USDC</span>
            </div>
            <div className="rounded-md bg-black/30 p-1.5">
              <span className="text-zinc-500">Unverified:</span>{" "}
              <span
                className={`font-semibold ${
                  riskProfile.allowUnverifiedTokens ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {riskProfile.allowUnverifiedTokens ? "Allowed" : "Blocked"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500 italic">
            Connecting wallet to retrieve stored Sibyl Memory...
          </div>
        )}
      </div>

      {/* Log Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {inspectorEvents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500">
            <ShieldCheck size={36} className="mb-2 text-zinc-600" />
            <p className="text-xs font-medium text-zinc-400">Inspector Stream Idle</p>
            <p className="mt-1 text-[11px] leading-relaxed max-w-[240px]">
              Memory queries, risk evaluations, and execution guards will stream live here.
            </p>
          </div>
        ) : (
          inspectorEvents.map((ev) => <LogCard key={ev.id} event={ev} />)
        )}
        <div ref={scrollRef} />
      </div>
    </aside>
  );
}
